-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Tenants: Users can only see their own tenant data
CREATE POLICY "select_own_tenant" ON tenants FOR SELECT
  TO authenticated USING (id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "update_own_tenant" ON tenants FOR UPDATE
  TO authenticated USING (id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )) WITH CHECK (id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Public tenant info for landing pages (by domain or slug)
CREATE POLICY "select_public_tenant" ON tenants FOR SELECT
  TO anon USING (is_active = true AND license_status IN ('active', 'trial'));

-- User profiles: Users can only access profiles in their tenant
CREATE POLICY "select_own_user_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_own_user_profiles" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "update_own_user_profiles" ON user_profiles FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "delete_own_user_profiles" ON user_profiles FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Categories: tenant-scoped
CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "select_public_categories" ON categories FOR SELECT
  TO anon USING (tenant_id IN (SELECT id FROM tenants WHERE is_active = true));

CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Products: tenant-scoped with public read
CREATE POLICY "select_products" ON products FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "select_public_products" ON products FOR SELECT
  TO anon USING (tenant_id IN (SELECT id FROM tenants WHERE is_active = true));

CREATE POLICY "insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_products" ON products FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "delete_products" ON products FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Product variants: tenant-scoped
CREATE POLICY "select_product_variants" ON product_variants FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "select_public_product_variants" ON product_variants FOR SELECT
  TO anon USING (tenant_id IN (SELECT id FROM tenants WHERE is_active = true));

CREATE POLICY "insert_product_variants" ON product_variants FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_product_variants" ON product_variants FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "delete_product_variants" ON product_variants FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Restaurant tables: tenant-scoped
CREATE POLICY "select_restaurant_tables" ON restaurant_tables FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_restaurant_tables" ON restaurant_tables FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_restaurant_tables" ON restaurant_tables FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "delete_restaurant_tables" ON restaurant_tables FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Orders: tenant-scoped
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Order items: tenant-scoped
CREATE POLICY "select_order_items" ON order_items FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_order_items" ON order_items FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "update_order_items" ON order_items FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Couriers: tenant-scoped
CREATE POLICY "select_couriers" ON couriers FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_couriers" ON couriers FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_couriers" ON couriers FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "delete_couriers" ON couriers FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Inventory: tenant-scoped (restrict to managers+)
CREATE POLICY "select_inventory_items" ON inventory_items FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_inventory_items" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_inventory_items" ON inventory_items FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "delete_inventory_items" ON inventory_items FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Recipe ingredients: tenant-scoped
CREATE POLICY "select_recipe_ingredients" ON recipe_ingredients FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_recipe_ingredients" ON recipe_ingredients FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_recipe_ingredients" ON recipe_ingredients FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "delete_recipe_ingredients" ON recipe_ingredients FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Inventory transactions: tenant-scoped
CREATE POLICY "select_inventory_transactions" ON inventory_transactions FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_inventory_transactions" ON inventory_transactions FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Daily reports: tenant-scoped
CREATE POLICY "select_daily_reports" ON daily_reports FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_daily_reports" ON daily_reports FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Promotions: tenant-scoped with public read for active
CREATE POLICY "select_promotions" ON promotions FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "select_public_promotions" ON promotions FOR SELECT
  TO anon USING (tenant_id IN (SELECT id FROM tenants WHERE is_active = true) AND is_active = true);

CREATE POLICY "insert_promotions" ON promotions FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

CREATE POLICY "update_promotions" ON promotions FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
  ));

-- Print jobs: tenant-scoped
CREATE POLICY "select_print_jobs" ON print_jobs FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_print_jobs" ON print_jobs FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "update_print_jobs" ON print_jobs FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));