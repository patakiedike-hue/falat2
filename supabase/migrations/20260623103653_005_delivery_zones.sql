-- Delivery zones per tenant
CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  -- Normalised searchable slug (lowercase, no diacritics handled in app)
  search_key VARCHAR(255) NOT NULL,
  zone_type VARCHAR(50) DEFAULT 'city',   -- 'city' | 'district' | 'postal_code'
  postal_code VARCHAR(20),
  extra_fee DECIMAL(10,2) DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, search_key)
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Public read (needed for discovery page – no auth)
CREATE POLICY "select_delivery_zones_public" ON delivery_zones FOR SELECT
  TO anon, authenticated USING (
    is_active = true
    AND tenant_id IN (SELECT id FROM tenants WHERE is_active = true)
  );

CREATE POLICY "insert_delivery_zones" ON delivery_zones FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

CREATE POLICY "update_delivery_zones" ON delivery_zones FOR UPDATE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  )) WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

CREATE POLICY "delete_delivery_zones" ON delivery_zones FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

-- Index for fast zone lookups
CREATE INDEX idx_delivery_zones_tenant   ON delivery_zones(tenant_id);
CREATE INDEX idx_delivery_zones_key      ON delivery_zones(search_key);
CREATE INDEX idx_delivery_zones_postal   ON delivery_zones(postal_code);

-- Make tenants publicly readable for the discovery page
-- (already has a policy but only for is_active=true & valid license)
-- No change needed there.

-- Seed test zones for our demo tenant
INSERT INTO delivery_zones (tenant_id, name, search_key, zone_type, postal_code, extra_fee, min_order_amount) VALUES
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest I. kerület',  'budapest 1. kerulet',  'district', '1011', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest II. kerület', 'budapest 2. kerulet',  'district', '1021', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest V. kerület',  'budapest 5. kerulet',  'district', '1051', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest VII. kerület','budapest 7. kerulet',  'district', '1071', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest VIII. kerület','budapest 8. kerulet', 'district', '1081', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Budapest XIII. kerület','budapest 13. kerulet','district', '1131', 0,   1500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Szendrő',              'szendro',              'city',     '3752', 200, 2000),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Kazincbarcika',        'kazincbarcika',        'city',     '3700', 300, 2500),
  ('d3b07384-113e-4d92-a123-4567890abcde', 'Miskolc',              'miskolc',              'city',     '3525', 500, 3000)
ON CONFLICT DO NOTHING;