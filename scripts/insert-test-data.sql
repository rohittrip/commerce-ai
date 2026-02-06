-- Insert test coupons
INSERT INTO coupons (code, type, value, min_order, max_discount, expires_at, enabled, description)
VALUES
    ('WINTER2026', 'PERCENTAGE', 10, 1000, 500, NOW() + INTERVAL '30 days', true, 'Winter Sale - 10% off on orders above ₹1000'),
    ('FLAT100', 'FIXED_AMOUNT', 100, 500, NULL, NOW() + INTERVAL '15 days', true, 'Flat ₹100 off on orders above ₹500'),
    ('MEGA50', 'PERCENTAGE', 50, 5000, 2000, NOW() + INTERVAL '7 days', true, 'Mega Sale - 50% off on orders above ₹5000'),
    ('EXPIRED', 'PERCENTAGE', 20, 100, NULL, NOW() - INTERVAL '1 day', true, 'Expired coupon'),
    ('DISABLED', 'PERCENTAGE', 30, 100, NULL, NOW() + INTERVAL '30 days', false, 'Disabled coupon')
ON CONFLICT (code) DO NOTHING;

-- Insert test user if not exists
INSERT INTO users (id, username, password_hash, role, status)
VALUES ('test-user-001', 'testuser', '$2a$10$test', 'customer', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Create test cart for user
INSERT INTO carts (id, user_id, provider, status, currency)
VALUES ('test-cart-001', 'test-user-001', 'mock', 'ACTIVE', 'INR')
ON CONFLICT (id) DO NOTHING;

-- Add items to cart
INSERT INTO cart_items (cart_id, product_id, provider, qty, unit_price, metadata)
VALUES
    ('test-cart-001', 'PROD-001', 'mock', 2, 999.00, '{"name": "Test Product 1"}'),
    ('test-cart-001', 'PROD-002', 'mock', 1, 1499.00, '{"name": "Test Product 2"}')
ON CONFLICT (cart_id, product_id) DO UPDATE
SET qty = EXCLUDED.qty, unit_price = EXCLUDED.unit_price;

-- Create test address
INSERT INTO addresses (id, user_id, line1, city, state, pincode, country, is_default)
VALUES ('test-addr-001', 'test-user-001', '123 Test Street', 'Mumbai', 'Maharashtra', '400001', 'IN', true)
ON CONFLICT (id) DO NOTHING;
