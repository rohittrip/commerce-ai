-- Migration: Add Phase 2 UCP Tools (Checkout + Product Discovery)
-- Run this migration to add the new tools to the admin UI

INSERT INTO ucp_tools (id, display_name, description, category, enabled, request_schema, response_schema, version, created_at, updated_at)
VALUES
  -- Checkout Tools (Phase 2)
  ('commerce.checkout.create', 'Create Checkout Session', 'Create checkout session from cart with frozen prices', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.checkout.update', 'Update Checkout Session', 'Update checkout with shipping/payment info', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.checkout.get', 'Get Checkout Session', 'Retrieve checkout session details', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.checkout.complete', 'Complete Checkout', 'Complete checkout and create order (HITL for >₹50k)', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.checkout.cancel', 'Cancel Checkout', 'Cancel an active checkout session', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),

  -- Product Discovery Extensions (Phase 2.5)
  ('commerce.product.estimateShipping', 'Estimate Shipping', 'Estimate shipping cost and delivery time', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.product.listVariants', 'List Product Variants', 'Get all product variants with pricing', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.promotions.get', 'Get Promotions', 'Get active promotions for a product', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW()),
  ('commerce.promotions.validateCoupon', 'Validate Coupon', 'Validate coupon and calculate discount', 'commerce', true, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

-- Verify insertion
SELECT
  COUNT(*) as total_tools,
  COUNT(*) FILTER (WHERE category = 'commerce') as commerce_tools,
  COUNT(*) FILTER (WHERE category = 'thinking') as thinking_tools,
  COUNT(*) FILTER (WHERE category = 'utility') as utility_tools
FROM ucp_tools;
