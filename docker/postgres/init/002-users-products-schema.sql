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
  name_en TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  description_en TEXT NOT NULL DEFAULT '',
  description_fr TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- category is now free text (admin can enter any value), not a fixed enum.
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_category_check;

-- Backfill from the pre-i18n single name column (stores never had a description column), then drop it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'name') THEN
    UPDATE stores SET name_en = COALESCE(name_en, name);
    ALTER TABLE stores DROP COLUMN name;
  END IF;
END $$;

UPDATE stores SET name_en = 'Untitled store' WHERE name_en IS NULL;
UPDATE stores SET description_en = '' WHERE description_en IS NULL;

ALTER TABLE stores
  ALTER COLUMN name_en SET NOT NULL,
  ALTER COLUMN description_en SET NOT NULL,
  ALTER COLUMN description_en SET DEFAULT '';

CREATE TABLE IF NOT EXISTS store_images (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON store_images (store_id, sort_order);

-- Backfill from the pre-multi-image single image_url column, then drop it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'image_url') THEN
    INSERT INTO store_images (id, store_id, image_url, sort_order)
    SELECT 'si-' || stores.id, stores.id, stores.image_url, 0
    FROM stores
    WHERE stores.image_url IS NOT NULL
      AND stores.image_url <> '/files/defaults/store-default.svg'
      AND NOT EXISTS (SELECT 1 FROM store_images si WHERE si.store_id = stores.id);
    ALTER TABLE stores DROP COLUMN image_url;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  description_en TEXT NOT NULL DEFAULT '',
  description_fr TEXT,
  description_ar TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock NUMERIC(12, 3) NOT NULL CHECK (stock >= 0),
  unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'unit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Backfill from the pre-i18n single name/description columns, then drop them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name') THEN
    UPDATE products SET name_en = COALESCE(name_en, name);
    UPDATE products SET description_en = COALESCE(description_en, description, '');
    ALTER TABLE products DROP COLUMN name;
    ALTER TABLE products DROP COLUMN description;
  END IF;
END $$;

UPDATE products SET name_en = 'Untitled product' WHERE name_en IS NULL;
UPDATE products SET description_en = '' WHERE description_en IS NULL;

ALTER TABLE products
  ALTER COLUMN name_en SET NOT NULL,
  ALTER COLUMN description_en SET NOT NULL,
  ALTER COLUMN description_en SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id, sort_order);

-- Backfill from the pre-multi-image single image_url column, then drop it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
    INSERT INTO product_images (id, product_id, image_url, sort_order)
    SELECT 'pi-' || products.id, products.id, products.image_url, 0
    FROM products
    WHERE products.image_url IS NOT NULL
      AND products.image_url <> '/files/defaults/product-default.svg'
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = products.id);
    ALTER TABLE products DROP COLUMN image_url;
  END IF;
END $$;

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

CREATE TABLE IF NOT EXISTS public_orders (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  guest_address TEXT,
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
  coupon_id TEXT,
  coupon_code TEXT,
  coupon_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (coupon_discount_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_public_scheduled_delivery CHECK (
    (delivery_mode = 'instant' AND scheduled_at IS NULL)
    OR (delivery_mode = 'scheduled' AND scheduled_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public_order_items (
  id TEXT PRIMARY KEY,
  public_order_id TEXT NOT NULL REFERENCES public_orders(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_public_orders_status ON public_orders (status);
CREATE INDEX IF NOT EXISTS idx_public_order_items_order_id ON public_order_items (public_order_id);

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

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (coupon_discount_amount >= 0);

ALTER TABLE public_orders
  ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (coupon_discount_amount >= 0);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

CREATE TABLE IF NOT EXISTS translation_config (
  id TEXT PRIMARY KEY,
  default_locale TEXT NOT NULL DEFAULT 'en',
  active_locales TEXT[] NOT NULL DEFAULT ARRAY['en', 'fr', 'ar'],
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ui_theme_config (
  id TEXT PRIMARY KEY,
  primary_color TEXT NOT NULL DEFAULT '#1f2937',
  text_color TEXT NOT NULL DEFAULT '#000000',
  secondary_color TEXT NOT NULL DEFAULT '#3b82f6',
  subtitle_1_color TEXT NOT NULL DEFAULT '#4b5563',
  subtitle_2_color TEXT NOT NULL DEFAULT '#9ca3af',
  logo_title_color TEXT NOT NULL DEFAULT '#0c0a09',
  logo_subtitle_color TEXT NOT NULL DEFAULT '#1f6446',
  main_button_bg_color TEXT NOT NULL DEFAULT '#1f6446',
  sec_button_bg_color TEXT NOT NULL DEFAULT '#1f6446',
  home_subtitle_text_color TEXT NOT NULL DEFAULT '#b45309',
  home_title_color TEXT NOT NULL DEFAULT '#0c0a09',
  accent_color TEXT NOT NULL DEFAULT '#b45309',
  card_bg_color TEXT NOT NULL DEFAULT '#fbf7f1',
  checkout_button_bg_color TEXT NOT NULL DEFAULT '#1f6446',
  cart_title_color TEXT NOT NULL DEFAULT '#0c0a09',
  section_title_color TEXT NOT NULL DEFAULT '#0c0a09',
  body_text_color TEXT NOT NULL DEFAULT '#44403c',
  price_color TEXT NOT NULL DEFAULT '#0c0a09',
  page_bg_color TEXT NOT NULL DEFAULT '#ffffff',
  nav_bg_color TEXT NOT NULL DEFAULT '#ffffff',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branding_config (
  id TEXT PRIMARY KEY,
  logo_url TEXT,
  title TEXT NOT NULL DEFAULT 'Ayan Market',
  subtitle TEXT NOT NULL DEFAULT 'Fresh essentials',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('currency_code', 'USD')
ON CONFLICT (key) DO NOTHING;

INSERT INTO branding_config (id, logo_url, title, subtitle)
VALUES ('default', NULL, 'Ayan Market', 'Fresh essentials')
ON CONFLICT (id) DO NOTHING;
