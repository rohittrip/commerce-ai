-- Insert new Phase 2 tools into ucp_tools table for Admin UI

-- Checkout Tools
INSERT INTO ucp_tools (
  id, display_name, description, category, enabled,
  request_schema, response_schema,
  default_timeout_ms, default_retry_count, default_retry_backoff_ms,
  version
) VALUES
  -- commerce.checkout.create
  (
    'commerce.checkout.create',
    'Create Checkout Session',
    'Create a checkout session from cart with frozen prices',
    'checkout',
    true,
    '{"type":"object","properties":{"userId":{"type":"string"},"cartId":{"type":"string"},"provider":{"type":"string"}},"required":["userId","cartId"]}'::jsonb,
    '{"type":"object","properties":{"checkoutId":{"type":"string"},"status":{"type":"string"},"total":{"type":"object"},"expiresAt":{"type":"string"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.checkout.update
  (
    'commerce.checkout.update',
    'Update Checkout Session',
    'Update checkout session with shipping address, billing address, or payment method',
    'checkout',
    true,
    '{"type":"object","properties":{"userId":{"type":"string"},"checkoutId":{"type":"string"},"shippingAddress":{"type":"object"},"billingAddress":{"type":"object"},"paymentMethod":{"type":"string"}},"required":["userId","checkoutId"]}'::jsonb,
    '{"type":"object","properties":{"checkoutId":{"type":"string"},"status":{"type":"string"},"total":{"type":"object"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.checkout.get
  (
    'commerce.checkout.get',
    'Get Checkout Session',
    'Retrieve checkout session details including pricing and status',
    'checkout',
    true,
    '{"type":"object","properties":{"userId":{"type":"string"},"checkoutId":{"type":"string"}},"required":["userId","checkoutId"]}'::jsonb,
    '{"type":"object","properties":{"checkoutId":{"type":"string"},"status":{"type":"string"},"total":{"type":"object"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.checkout.complete
  (
    'commerce.checkout.complete',
    'Complete Checkout',
    'Complete checkout session and create order. High-value orders (>₹50k) require confirmation.',
    'checkout',
    true,
    '{"type":"object","properties":{"userId":{"type":"string"},"checkoutId":{"type":"string"},"confirmed":{"type":"boolean"}},"required":["userId","checkoutId"]}'::jsonb,
    '{"type":"object","properties":{"orderId":{"type":"string"},"checkoutId":{"type":"string"},"status":{"type":"string"},"requiresConfirmation":{"type":"boolean"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.checkout.cancel
  (
    'commerce.checkout.cancel',
    'Cancel Checkout Session',
    'Cancel an active checkout session',
    'checkout',
    true,
    '{"type":"object","properties":{"userId":{"type":"string"},"checkoutId":{"type":"string"}},"required":["userId","checkoutId"]}'::jsonb,
    '{"type":"object","properties":{"checkoutId":{"type":"string"},"status":{"type":"string"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.product.estimateShipping
  (
    'commerce.product.estimateShipping',
    'Estimate Shipping Cost',
    'Estimate shipping cost and delivery time based on pincode and quantity',
    'product',
    true,
    '{"type":"object","properties":{"productId":{"type":"string"},"quantity":{"type":"integer"},"address":{"type":"object","properties":{"pincode":{"type":"string"}}}},"required":["productId","address"]}'::jsonb,
    '{"type":"object","properties":{"productId":{"type":"string"},"shippingCost":{"type":"object"},"estimatedDeliveryDays":{"type":"integer"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.product.listVariants
  (
    'commerce.product.listVariants',
    'List Product Variants',
    'Get all available variants of a product with attributes and pricing',
    'product',
    true,
    '{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"]}'::jsonb,
    '{"type":"object","properties":{"productId":{"type":"string"},"variants":{"type":"array"},"totalVariants":{"type":"integer"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.promotions.get
  (
    'commerce.promotions.get',
    'Get Active Promotions',
    'Get all active promotions for a product',
    'promotions',
    true,
    '{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"]}'::jsonb,
    '{"type":"object","properties":{"productId":{"type":"string"},"promotions":{"type":"array"},"activePromotions":{"type":"integer"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  ),
  -- commerce.promotions.validateCoupon
  (
    'commerce.promotions.validateCoupon',
    'Validate Coupon Code',
    'Validate a coupon code and calculate discount amount',
    'promotions',
    true,
    '{"type":"object","properties":{"couponCode":{"type":"string"},"orderAmount":{"type":"number"}},"required":["couponCode","orderAmount"]}'::jsonb,
    '{"type":"object","properties":{"valid":{"type":"boolean"},"couponCode":{"type":"string"},"discount":{"type":"object"}}}'::jsonb,
    30000,
    3,
    1000,
    1
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  enabled = EXCLUDED.enabled,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = NOW();

-- Verify insertion
SELECT id, display_name, category, enabled
FROM ucp_tools
WHERE id LIKE 'commerce.checkout.%'
   OR id LIKE 'commerce.product.%'
   OR id LIKE 'commerce.promotions.%'
ORDER BY category, id;
