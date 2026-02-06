-- Add categories table
CREATE TABLE IF NOT EXISTS categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_enabled ON categories(enabled);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);

-- Add provider_categories join table
CREATE TABLE IF NOT EXISTS provider_categories (
  provider_id     TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_categories_provider ON provider_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_category ON provider_categories(category_id);

-- Add ucp_tools table
CREATE TABLE IF NOT EXISTS ucp_tools (
  id                       TEXT PRIMARY KEY,
  display_name             TEXT NOT NULL,
  description              TEXT,
  category                 TEXT NOT NULL DEFAULT 'commerce',
  enabled                  BOOLEAN NOT NULL DEFAULT true,
  request_schema           JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_schema          JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_timeout_ms       INTEGER NOT NULL DEFAULT 30000,
  default_retry_count      INTEGER NOT NULL DEFAULT 3,
  default_retry_backoff_ms INTEGER NOT NULL DEFAULT 1000,
  auth_config              JSONB NOT NULL DEFAULT '{}'::jsonb,
  version                  INTEGER NOT NULL DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucp_tools_category ON ucp_tools(category);
CREATE INDEX IF NOT EXISTS idx_ucp_tools_enabled ON ucp_tools(enabled);

-- Seed categories
INSERT INTO categories (id, name, description, icon, display_order, enabled) VALUES
  ('electronics', 'Electronics', 'Electronic devices and accessories', 'laptop', 1, true),
  ('fashion', 'Fashion', 'Clothing, footwear and accessories', 'shirt', 2, true),
  ('home', 'Home & Kitchen', 'Home appliances and kitchen items', 'home', 3, true),
  ('beauty', 'Beauty & Personal Care', 'Beauty and personal care products', 'sparkles', 4, true),
  ('sports', 'Sports & Outdoors', 'Sports equipment and outdoor gear', 'dumbbell', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Link categories to mock provider
INSERT INTO provider_categories (provider_id, category_id) VALUES
  ('mock', 'electronics'),
  ('mock', 'fashion'),
  ('mock', 'home'),
  ('mock', 'beauty'),
  ('mock', 'sports')
ON CONFLICT DO NOTHING;

-- Seed UCP tools
INSERT INTO ucp_tools (id, display_name, description, category, enabled, request_schema, response_schema) VALUES
  ('commerce.searchProducts', 'Search Products', 'Search for products across providers', 'commerce', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"query": {"type": "string", "description": "Search query"}, "category": {"type": "string", "description": "Category filter"}, "filters": {"type": "object"}, "pagination": {"type": "object", "properties": {"page": {"type": "integer"}, "pageSize": {"type": "integer"}}}}, "required": ["query"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"products": {"type": "array"}, "pagination": {"type": "object"}}}'),
  ('commerce.getProductDetails', 'Get Product Details', 'Get detailed information about a product', 'commerce', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"productId": {"type": "string", "description": "Product ID"}}, "required": ["productId"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"id": {"type": "string"}, "name": {"type": "string"}, "price": {"type": "number"}}}'),
  ('commerce.compareProducts', 'Compare Products', 'Compare multiple products side by side', 'commerce', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"productIds": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 5}}, "required": ["productIds"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"comparison": {"type": "object"}}}'),
  ('commerce.cart.addItem', 'Add to Cart', 'Add an item to the shopping cart', 'cart', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"userId": {"type": "string"}, "productId": {"type": "string"}, "quantity": {"type": "integer", "minimum": 1}}, "required": ["userId", "productId", "quantity"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"cart": {"type": "object"}, "success": {"type": "boolean"}}}'),
  ('commerce.cart.getCart', 'Get Cart', 'Retrieve the current shopping cart', 'cart', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"userId": {"type": "string"}}, "required": ["userId"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"items": {"type": "array"}, "total": {"type": "number"}}}'),
  ('commerce.order.createOrder', 'Create Order', 'Create a new order from cart', 'order', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"userId": {"type": "string"}, "cartId": {"type": "string"}, "paymentMethod": {"type": "string"}}, "required": ["userId", "cartId"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"orderId": {"type": "string"}, "status": {"type": "string"}}}'),
  ('commerce.order.getOrderStatus', 'Get Order Status', 'Check the status of an order', 'order', true,
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"orderId": {"type": "string"}}, "required": ["orderId"]}',
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"orderId": {"type": "string"}, "status": {"type": "string"}, "items": {"type": "array"}}}')
ON CONFLICT (id) DO NOTHING;
