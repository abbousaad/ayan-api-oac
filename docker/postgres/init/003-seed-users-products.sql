INSERT INTO users (id, username, password_hash, role, must_change_password)
VALUES
  ('u-1', 'demo', '$2a$10$z7gWmChDsDtQpxSwLuZfZOGatCsAruXiLOwlkM5CLx6g1MW9p4C1y', 'user', FALSE),
  ('u-2', 'superadmin', '$2a$10$vRJG0RKam.H7mbAx6UXdyuhiMBB46z4dcqGTtU9B.P40C/xD15DwO', 'superadmin', TRUE),
  ('u-3', 'livreur', '$2a$10$o8fu8cyrkrAz1qsasF3dguIvwhJ2Z/Z4lvCCaSDwrOVeX.bAlTyTW', 'livreur', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (
  id,
  name_en, name_fr, name_ar,
  description_en, description_fr, description_ar,
  category, slug
)
VALUES
  (
    's-fruits',
    'Fresh Fruits Store', 'Magasin de Fruits Frais', 'متجر الفواكه الطازجة',
    'Fresh seasonal fruits', 'Fruits frais de saison', 'فواكه طازجة موسمية',
    'fruits', 'fruits-store'
  ),
  (
    's-vegets',
    'Green Vegetables Store', 'Magasin de Légumes Verts', 'متجر الخضروات الخضراء',
    'Fresh green vegetables', 'Légumes verts frais', 'خضروات خضراء طازجة',
    'vegets', 'vegets-store'
  ),
  (
    's-ham',
    'Ham Store', 'Magasin de Jambon', 'متجر اللحوم المقددة',
    'Cured and sliced meats', 'Viandes séchées et tranchées', 'لحوم مقددة ومقطعة',
    'ham', 'ham-store'
  ),
  (
    's-fish',
    'Fish Store', 'Poissonnerie', 'متجر الأسماك',
    'Fresh catch of the day', 'Pêche fraîche du jour', 'صيد طازج يومي',
    'fish', 'fish-store'
  ),
  (
    's-ingrediant',
    'Ingredients Store', 'Magasin d''Ingrédients', 'متجر المكونات',
    'Pantry staples and spices', 'Produits de base et épices', 'مواد غذائية أساسية وتوابل',
    'ingrediant', 'ingredients-store'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO store_images (id, store_id, image_url, sort_order)
VALUES
  ('si-s-fruits', 's-fruits', '/files/defaults/store-default.svg', 0),
  ('si-s-vegets', 's-vegets', '/files/defaults/store-default.svg', 0),
  ('si-s-ham', 's-ham', '/files/defaults/store-default.svg', 0),
  ('si-s-fish', 's-fish', '/files/defaults/store-default.svg', 0),
  ('si-s-ingrediant', 's-ingrediant', '/files/defaults/store-default.svg', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (
  id, store_id,
  name_en, name_fr, name_ar,
  description_en, description_fr, description_ar,
  price, stock, unit
)
VALUES
  (
    'p-1', 's-fruits',
    'Olive Oil', 'Huile d''olive', 'زيت الزيتون',
    'Cold pressed olive oil', 'Huile d''olive pressée à froid', 'زيت زيتون معصور على البارد',
    8.99, 120, 'l'
  ),
  (
    'p-2', 's-vegets',
    'Potato', 'Pomme de terre', 'بطاطس',
    'Fresh local potatoes', 'Pommes de terre locales fraîches', 'بطاطس محلية طازجة',
    1.90, 500, 'kg'
  ),
  (
    'p-3', 's-ingrediant',
    'Black Pepper', 'Poivre noir', 'فلفل أسود',
    'Ground black pepper', 'Poivre noir moulu', 'فلفل أسود مطحون',
    0.02, 1000, 'g'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (id, product_id, image_url, sort_order)
VALUES
  ('pi-p-1', 'p-1', '/files/defaults/product-default.svg', 0),
  ('pi-p-2', 'p-2', '/files/defaults/product-default.svg', 0),
  ('pi-p-3', 'p-3', '/files/defaults/product-default.svg', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_locations (id, user_id, label, address, latitude, longitude)
VALUES
  ('loc-u1-home', 'u-1', 'Home', '15 Market Street', NULL, NULL),
  ('loc-u1-work', 'u-1', 'Work', '78 Business Avenue', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_pricing_config (id, delivery_fee, service_fee_rate, tax_rate, discount_rate)
VALUES ('default', 3.00, 0.05, 0.10, 0.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO coupons (id, code, discount_type, discount_value, starts_at, ends_at, is_active, max_uses, used_count)
VALUES
  ('cp-welcome10', 'WELCOME10', 'percentage', 0.10, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE, NULL, 0),
  ('cp-flat2', 'FLAT2', 'fixed', 2.00, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', TRUE, NULL, 0),
  ('cp-expired5', 'EXPIRED5', 'fixed', 5.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', TRUE, NULL, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO translation_config (id, default_locale, active_locales, translations)
VALUES (
  'default',
  'en',
  ARRAY['en', 'fr', 'ar'],
  '{
    "en": {
      "nav.about": "About",
      "nav.products": "Products",
      "nav.cart": "Cart",
      "cart.checkout": "Checkout",
      "cart.continue": "Continue Shopping",
      "cart.empty": "Your cart is empty",
      "product.addToCart": "Add to Cart",
      "product.price": "Price",
      "product.stock": "In Stock",
      "home.welcome": "Welcome",
      "home.featured": "Featured Products",
      "button.login": "Login",
      "button.logout": "Logout",
      "button.register": "Register"
    },
    "fr": {
      "nav.about": "À propos",
      "nav.products": "Produits",
      "nav.cart": "Panier",
      "cart.checkout": "Commander",
      "cart.continue": "Continuer vos achats",
      "cart.empty": "Votre panier est vide",
      "product.addToCart": "Ajouter au panier",
      "product.price": "Prix",
      "product.stock": "En stock",
      "home.welcome": "Bienvenue",
      "home.featured": "Produits en vedette",
      "button.login": "Connexion",
      "button.logout": "Déconnexion",
      "button.register": "S''inscrire"
    },
    "ar": {
      "nav.about": "لوح",
      "nav.products": "المنتجات",
      "nav.cart": "العربة",
      "cart.checkout": "عفدلا",
      "cart.continue": "متابعة التسوق",
      "cart.empty": "عربتك فارغة",
      "product.addToCart": "أضف إلى العربة",
      "product.price": "السعر",
      "product.stock": "في المخزن",
      "home.welcome": "أهلا وسهلا",
      "home.featured": "المنتجات المميزة",
      "button.login": "الدخول",
      "button.logout": "الخروج",
      "button.register": "يسجل"
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ui_theme_config (
  id, primary_color, text_color, secondary_color, subtitle_1_color, subtitle_2_color,
  logo_title_color, logo_subtitle_color, main_button_bg_color, sec_button_bg_color,
  home_subtitle_text_color, home_title_color, accent_color, card_bg_color,
  checkout_button_bg_color, cart_title_color, section_title_color, body_text_color,
  price_color, page_bg_color, nav_bg_color
)
VALUES (
  'default',
  '#1f2937', '#000000', '#3b82f6', '#4b5563', '#9ca3af',
  '#0c0a09', '#1f6446', '#1f6446', '#1f6446',
  '#b45309', '#0c0a09', '#b45309', '#fbf7f1',
  '#1f6446', '#0c0a09', '#0c0a09', '#44403c',
  '#0c0a09', '#ffffff', '#ffffff'
)
ON CONFLICT (id) DO NOTHING;
