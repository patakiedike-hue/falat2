-- Multi-tenant SaaS Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (partners/restaurants)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  
  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#10B981',
  accent_color VARCHAR(7) DEFAULT '#F59E0B',
  
  -- Contact
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Business settings
  vat_number VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'HUF',
  language VARCHAR(5) DEFAULT 'hu',
  timezone VARCHAR(50) DEFAULT 'Europe/Budapest',
  
  -- Operating hours (JSON: {mon: {open: "08:00", close: "22:00"}, ...})
  operating_hours JSONB DEFAULT '{}',
  
  -- Delivery settings
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  delivery_radius_km DECIMAL(5,2) DEFAULT 10,
  
  -- License
  license_status VARCHAR(20) DEFAULT 'trial',
  license_expires_at TIMESTAMPTZ,
  plan VARCHAR(50) DEFAULT 'basic',
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Users table (extend Supabase auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff',
  name VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products/Menu items
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  preparation_time_minutes INT DEFAULT 15,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  
  -- Allergens and dietary info (JSON array)
  allergens JSONB DEFAULT '[]',
  dietary_info JSONB DEFAULT '[]',
  
  -- Nutritional info
  calories INT,
  protein DECIMAL(5,1),
  carbs DECIMAL(5,1),
  fat DECIMAL(5,1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product variants (sizes, add-ons)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables (for dine-in)
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  table_number VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  capacity INT DEFAULT 4,
  shape VARCHAR(20) DEFAULT 'square',
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  width INT DEFAULT 80,
  height INT DEFAULT 80,
  section VARCHAR(50),
  status VARCHAR(20) DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, table_number)
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  
  -- Customer info
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  
  -- Delivery info
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_postal_code VARCHAR(20),
  delivery_notes TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  
  -- Order type
  order_type VARCHAR(20) DEFAULT 'delivery',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Timing
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Courier
  courier_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  courier_status VARCHAR(50),
  
  -- Source
  source VARCHAR(50) DEFAULT 'web',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, order_number)
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  variant_name VARCHAR(255),
  variant_price_adjustment DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  subtotal DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Couriers (delivery drivers)
CREATE TABLE couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  vehicle_type VARCHAR(50) DEFAULT 'bicycle',
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  total_deliveries INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory: Raw ingredients/materials
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit VARCHAR(20) NOT NULL,
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 10,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  supplier VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

-- Recipe ingredients (parts for products)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory transactions
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  transaction_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2),
  new_stock DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reports
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  
  -- Sales data
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  cash_total DECIMAL(10,2) DEFAULT 0,
  card_total DECIMAL(10,2) DEFAULT 0,
  online_total DECIMAL(10,2) DEFAULT 0,
  
  -- Delivery data
  delivery_orders INT DEFAULT 0,
  pickup_orders INT DEFAULT 0,
  dine_in_orders INT DEFAULT 0,
  delivery_fees_collected DECIMAL(10,2) DEFAULT 0,
  
  -- Product data (JSON)
  top_products JSONB DEFAULT '[]',
  hourly_breakdown JSONB DEFAULT '{}',
  
  -- Courier data (JSON)
  courier_deliveries JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, report_date, report_type)
);

-- Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT,
  used_count INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Print queue
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL,
  printer_name VARCHAR(100),
  content TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_categories_tenant ON categories(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_restaurant_tables_tenant ON restaurant_tables(tenant_id);
CREATE INDEX idx_couriers_tenant ON couriers(tenant_id);
CREATE INDEX idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX idx_daily_reports_tenant_date ON daily_reports(tenant_id, report_date DESC);