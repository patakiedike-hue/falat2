-- Platform admin table (for admin.falathaz.hu)
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Policy: only platform admins can manage platform admins
CREATE POLICY "select_platform_admins" ON platform_admins FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR id IN (
    SELECT id FROM platform_admins WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "insert_platform_admins" ON platform_admins FOR INSERT
  TO authenticated WITH CHECK (id IN (
    SELECT id FROM platform_admins WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "update_platform_admins" ON platform_admins FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR id IN (
    SELECT id FROM platform_admins WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Partner registration requests
CREATE TABLE partner_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  restaurant_name VARCHAR(255) NOT NULL,
  desired_slug VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_partner_requests" ON partner_requests FOR SELECT
  TO authenticated, anon USING (true);

CREATE POLICY "insert_partner_requests" ON partner_requests FOR INSERT
  TO authenticated, anon WITH CHECK (true);

CREATE POLICY "update_partner_requests" ON partner_requests FOR UPDATE
  TO authenticated USING (processed_by IN (
    SELECT id FROM platform_admins WHERE user_id = auth.uid()
  ));

-- Plans and pricing
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  max_orders_per_month INT,
  max_users INT,
  max_locations INT,
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- License transactions
CREATE TABLE license_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for plans (public read)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_plans" ON plans FOR SELECT TO anon, authenticated USING (is_active = true);

-- Enable RLS for license transactions
ALTER TABLE license_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_license_transactions" ON license_transactions FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ) OR tenant_id IN (
    SELECT tenant_id FROM tenants WHERE id IN (
      SELECT id FROM tenants -- platform admins see all
    )
  ));

-- Insert default plans
INSERT INTO plans (name, slug, description, monthly_price, max_orders_per_month, max_users, max_locations, features, is_popular, sort_order) VALUES
('Alap', 'basic', 'Tökéletes bevezetéshez', 9900.00, 500, 3, 1, '["Rendelés kezelés", "Menü karbantartás", "Alap riportok", "Email támogatás"]', false, 1),
('Professzionális', 'professional', 'Növekvő éttermeknek', 19900.00, 2000, 10, 3, '["Minden alap funkció", "Asztal foglalás", "Készletkezelés", "Több helyszín", "Futár modul", "Prioritásos támogatás"]', true, 2),
('Vállalati', 'enterprise', 'Láncok és franchise-ok', 39900.00, NULL, NULL, NULL, '["Minden professzionális funkció", "Egyedi fejlesztések", "API hozzáférés", "Dedikált menedzser", "SLA garancia", "White-label opció"]', false, 3);

-- Activity log for auditing
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_activity_logs" ON activity_logs FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "insert_activity_logs" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_notifications" ON notifications FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_partner_requests_status ON partner_requests(status);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);