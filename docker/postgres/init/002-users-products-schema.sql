CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'superadmin', 'livreur')),
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fruits', 'vegets', 'ham', 'fish', 'ingrediant')),
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock NUMERIC(12, 3) NOT NULL CHECK (stock >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);

CREATE TABLE IF NOT EXISTS user_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_location_payload CHECK (
    address IS NOT NULL OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES user_locations(id) ON DELETE RESTRICT,
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('instant', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'onpreparation', 'ondelivery', 'paid')),
  subtotal_amount NUMERIC(12, 2) NOT NULL CHECK (subtotal_amount >= 0),
  delivery_fee NUMERIC(12, 2) NOT NULL CHECK (delivery_fee >= 0),
  service_fee NUMERIC(12, 2) NOT NULL CHECK (service_fee >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL CHECK (tax_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL CHECK (discount_amount >= 0),
  grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_scheduled_delivery CHECK (
    (delivery_mode = 'instant' AND scheduled_at IS NULL)
    OR (delivery_mode = 'scheduled' AND scheduled_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS order_pricing_config (
  id TEXT PRIMARY KEY,
  delivery_fee NUMERIC(12, 2) NOT NULL CHECK (delivery_fee >= 0),
  service_fee_rate NUMERIC(6, 4) NOT NULL CHECK (service_fee_rate >= 0 AND service_fee_rate <= 1),
  tax_rate NUMERIC(6, 4) NOT NULL CHECK (tax_rate >= 0 AND tax_rate <= 1),
  discount_rate NUMERIC(6, 4) NOT NULL CHECK (discount_rate >= 0 AND discount_rate <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC(12, 4) NOT NULL CHECK (discount_value > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_coupon_period CHECK (ends_at > starts_at),
  CONSTRAINT chk_coupon_max_uses CHECK (max_uses IS NULL OR max_uses >= 1),
  CONSTRAINT chk_coupon_used_count CHECK (used_count >= 0)
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (coupon_discount_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
