-- Function to get tenant by domain or slug
CREATE OR REPLACE FUNCTION get_tenant_by_domain(p_domain VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  domain VARCHAR,
  logo_url TEXT,
  primary_color VARCHAR,
  secondary_color VARCHAR,
  accent_color VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  city VARCHAR,
  postal_code VARCHAR,
  currency VARCHAR,
  language VARCHAR,
  timezone VARCHAR,
  operating_hours JSONB,
  delivery_fee DECIMAL,
  min_order_amount DECIMAL,
  settings JSONB,
  license_status VARCHAR,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.name, t.slug, t.domain, t.logo_url, t.primary_color, t.secondary_color, t.accent_color,
    t.email, t.phone, t.address, t.city, t.postal_code, t.currency, t.language, t.timezone,
    t.operating_hours, t.delivery_fee, t.min_order_amount, t.settings, t.license_status, t.is_active
  FROM tenants t
  WHERE t.domain = p_domain OR t.slug = p_domain
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(4);
  v_count INT;
  v_order_number VARCHAR(50);
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO v_prefix FROM tenants WHERE id = p_tenant_id;
  
  SELECT COUNT(*) + 1 INTO v_count FROM orders WHERE tenant_id = p_tenant_id AND DATE(created_at) = CURRENT_DATE;
  
  v_order_number := v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check ingredient availability
CREATE OR REPLACE FUNCTION check_ingredient_availability(p_product_id UUID)
RETURNS TABLE (
  inventory_item_id UUID,
  name VARCHAR,
  current_stock DECIMAL,
  required_qty DECIMAL,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.name,
    ii.current_stock,
    ri.quantity,
    (ii.current_stock - ri.quantity) >= 0
  FROM recipe_ingredients ri
  JOIN inventory_items ii ON ri.inventory_item_id = ii.id
  WHERE ri.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to deduct inventory for an order
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order_rec RECORD;
  v_product_rec RECORD;
  v_ingredient_rec RECORD;
  v_tenant_id UUID;
BEGIN
  -- Get order tenant
  SELECT tenant_id INTO v_tenant_id FROM orders WHERE id = p_order_id;
  
  -- For each item in the order
  FOR v_product_rec IN 
    SELECT DISTINCT(product_id), quantity FROM order_items WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    -- For each ingredient in the product
    FOR v_ingredient_rec IN 
      SELECT inventory_item_id, quantity 
      FROM recipe_ingredients 
      WHERE product_id = v_product_rec.product_id
    LOOP
      -- Deduct inventory
      UPDATE inventory_items 
      SET 
        current_stock = current_stock - (v_ingredient_rec.quantity * v_product_rec.quantity),
        updated_at = NOW()
      WHERE id = v_ingredient_rec.inventory_item_id;
      
      -- Record transaction
      INSERT INTO inventory_transactions (
        tenant_id, inventory_item_id, order_id, transaction_type, quantity
      )
      SELECT 
        v_tenant_id,
        v_ingredient_rec.inventory_item_id,
        p_order_id,
        'deduction',
        -(v_ingredient_rec.quantity * v_product_rec.quantity)
      WHERE NOT id = '00000000-0000-0000-0000-000000000000';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  current_stock DECIMAL,
  min_stock DECIMAL,
  shortage_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ii.id,
    ii.name,
    ii.current_stock,
    ii.min_stock,
    ROUND((ii.current_stock / NULLIF(ii.min_stock, 0)) * 100, 2) as shortage_percent
  FROM inventory_items ii
  WHERE ii.tenant_id = p_tenant_id
    AND ii.is_active = true
    AND ii.current_stock <= ii.min_stock
  ORDER BY ii.current_stock ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get daily sales summary
CREATE OR REPLACE FUNCTION get_daily_sales_summary(p_tenant_id UUID, p_date DATE)
RETURNS TABLE (
  total_orders INT,
  total_revenue DECIMAL,
  by_payment_method JSONB,
  by_order_type JSONB,
  hourly_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_orders,
    SUM(total) as total_revenue,
    jsonb_object_agg(payment_method, payment_total) as by_payment_method,
    jsonb_object_agg(order_type, order_count) as by_order_type,
    jsonb_agg(jsonb_build_object('hour', hour_num, 'count', hourly_count, 'revenue', hourly_revenue)) as hourly_breakdown
  FROM (
    SELECT 
      COALESCE(payment_method, 'unknown') as payment_method,
      SUM(total) as payment_total,
      order_type,
      COUNT(*) as order_count,
      EXTRACT(HOUR FROM created_at)::INT as hour_num,
      COUNT(*) OVER (PARTITION BY EXTRACT(HOUR FROM created_at)) as hourly_count,
      SUM(total) OVER (PARTITION BY EXTRACT(HOUR FROM created_at)) as hourly_revenue
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND DATE(created_at) = p_date
      AND status NOT IN ('cancelled', 'refunded')
  ) subq;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION auto_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := generate_order_number(NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION auto_order_number();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_categories_updated
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tables_updated
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE couriers;