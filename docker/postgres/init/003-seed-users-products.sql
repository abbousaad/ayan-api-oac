INSERT INTO users (id, username, password_hash, role, must_change_password)
VALUES
  ('u-1', 'demo', '$2a$10$z7gWmChDsDtQpxSwLuZfZOGatCsAruXiLOwlkM5CLx6g1MW9p4C1y', 'user', FALSE),
  ('u-2', 'superadmin', '$2a$10$vRJG0RKam.H7mbAx6UXdyuhiMBB46z4dcqGTtU9B.P40C/xD15DwO', 'superadmin', TRUE),
  ('u-3', 'livreur', '$2a$10$o8fu8cyrkrAz1qsasF3dguIvwhJ2Z/Z4lvCCaSDwrOVeX.bAlTyTW', 'livreur', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stores (id, name, category, slug)
VALUES
  ('s-fruits', 'Fresh Fruits Store', 'fruits', 'fruits-store'),
  ('s-vegets', 'Green Vegetables Store', 'vegets', 'vegets-store'),
  ('s-ham', 'Ham Store', 'ham', 'ham-store'),
  ('s-fish', 'Fish Store', 'fish', 'fish-store'),
  ('s-ingrediant', 'Ingredients Store', 'ingrediant', 'ingredients-store')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, store_id, name, description, price, stock, unit)
VALUES
  ('p-1', 's-fruits', 'Olive Oil', 'Cold pressed olive oil', 8.99, 120, 'l'),
  ('p-2', 's-vegets', 'Potato', 'Fresh local potatoes', 1.90, 500, 'kg'),
  ('p-3', 's-ingrediant', 'Black Pepper', 'Ground black pepper', 0.02, 1000, 'g')
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
