-- Migration: Fix Tool Categories and Provider Tool Configs
-- This migration:
-- 1. Updates all commerce-related tools to use 'commerce' category
-- 2. Removes old order tools from tool_configs in providers
-- 3. Updates provider capabilities from ORDER to CHECKOUT

BEGIN;

-- 1. Update all commerce tools to use 'commerce' category
UPDATE ucp_tools
SET category = 'commerce', updated_at = NOW()
WHERE category IN ('cart', 'checkout', 'product', 'promotions', 'order')
   OR id LIKE 'commerce.%';

-- 2. Delete old order tools that were removed
DELETE FROM ucp_tools
WHERE id IN ('commerce.order.createOrder', 'commerce.order.getOrderStatus');

-- 3. Remove old order tools from provider tool_configs
UPDATE providers
SET
  tool_configs = tool_configs - 'commerce.order.createOrder' - 'commerce.order.getOrderStatus',
  updated_at = NOW()
WHERE tool_configs ? 'commerce.order.createOrder'
   OR tool_configs ? 'commerce.order.getOrderStatus';

-- 4. Update provider capabilities: ORDER -> CHECKOUT
UPDATE providers
SET
  capabilities = array_replace(capabilities, 'ORDER', 'CHECKOUT'),
  updated_at = NOW()
WHERE 'ORDER' = ANY(capabilities);

-- 5. Add new checkout tools to providers that had old order tools
UPDATE providers
SET
  tool_configs = tool_configs ||
    '{"commerce.checkout.create": {"enabled": true},
      "commerce.checkout.update": {"enabled": true},
      "commerce.checkout.get": {"enabled": true},
      "commerce.checkout.complete": {"enabled": true},
      "commerce.checkout.cancel": {"enabled": true},
      "commerce.product.estimateShipping": {"enabled": true},
      "commerce.product.listVariants": {"enabled": true},
      "commerce.promotions.get": {"enabled": true},
      "commerce.promotions.validateCoupon": {"enabled": true}
    }'::jsonb,
  updated_at = NOW()
WHERE 'CHECKOUT' = ANY(capabilities);

-- 6. Fix provider names: reliance_digital -> rd_in
UPDATE providers
SET id = 'rd_in', name = 'RD.in', updated_at = NOW()
WHERE id = 'reliance_digital';

-- Verify the fix
SELECT 'Tool Categories:' as info;
SELECT
  category,
  COUNT(*) as tool_count,
  array_agg(display_name) as tools
FROM ucp_tools
GROUP BY category
ORDER BY category;

SELECT 'Provider Capabilities:' as info;
SELECT
  id,
  name,
  capabilities,
  jsonb_object_keys(tool_configs) as enabled_tools
FROM providers
WHERE enabled = true;

COMMIT;
