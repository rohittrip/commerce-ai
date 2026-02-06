-- Ensure mock provider is configured with correct capabilities
-- This migration updates the mock provider configuration

DELETE FROM providers WHERE id = 'mock';

INSERT INTO providers (
  id, name, type, base_url, enabled,
  config, field_mappings, category_mappings, capabilities, tool_configs, priority
) VALUES (
  'mock',
  'Mock Provider',
  'mock',
  'http://localhost:8081',
  true,
  '{"timeout": 5000, "retries": 3, "circuitBreaker": {"threshold": 5, "timeout": 30000}}'::jsonb,
  '{
    "product": {"id": "id", "name": "name", "price": "price", "brand": "brand", "category": "category"},
    "order": {"id": "id", "status": "status"}
  }'::jsonb,
  '{}'::jsonb,
  ARRAY['SEARCH', 'DETAILS', 'CART', 'CHECKOUT'],
  '{
    "commerce.searchProducts": {"enabled": true},
    "commerce.compareProducts": {"enabled": true},
    "commerce.cart.addItem": {"enabled": true},
    "commerce.cart.updateItemQty": {"enabled": true},
    "commerce.cart.removeItem": {"enabled": true},
    "commerce.cart.getCart": {"enabled": true},
    "commerce.checkout.create": {"enabled": true},
    "commerce.checkout.update": {"enabled": true},
    "commerce.checkout.get": {"enabled": true},
    "commerce.checkout.complete": {"enabled": true},
    "commerce.checkout.cancel": {"enabled": true},
    "commerce.product.estimateShipping": {"enabled": true},
    "commerce.product.listVariants": {"enabled": true},
    "commerce.promotions.get": {"enabled": true},
    "commerce.promotions.validateCoupon": {"enabled": true}
  }'::jsonb,
  1
);

-- Also update reliance_digital if it exists to use uppercase capabilities
UPDATE providers
SET capabilities = ARRAY['SEARCH', 'DETAILS', 'CART', 'CHECKOUT']
WHERE id = 'reliance_digital'
AND NOT (capabilities @> ARRAY['SEARCH']);
