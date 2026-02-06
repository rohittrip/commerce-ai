-- Commerce AI Platform Database Schema
-- Drop existing tables if any
DROP TABLE IF EXISTS order_events CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS tool_calls CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS admin_configs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users (minimal; auth can be external later)
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE,
  password_hash   TEXT,
  phone_hash      TEXT,
  email_hash      TEXT,
  role            TEXT NOT NULL DEFAULT 'customer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_users_username ON users(username);

CREATE TABLE user_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id),
  preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  line1           TEXT NOT NULL,
  line2           TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  country         TEXT DEFAULT 'IN',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- Admin users (separate from customers)
CREATE TABLE admin_users (
  id              TEXT PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  email           TEXT,
  role            TEXT NOT NULL DEFAULT 'admin',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_admin_users_username ON admin_users(username);

-- Admin configurations (LLM, taxonomy, providers)
CREATE TABLE admin_configs (
  key             TEXT PRIMARY KEY,
  category        TEXT NOT NULL,
  value           JSONB NOT NULL,
  description     TEXT,
  updated_by      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_configs_category ON admin_configs(category);

-- Providers (e-commerce backend integrations)
CREATE TABLE providers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,
  base_url          TEXT,
  api_key           TEXT,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_mappings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  category_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities      TEXT[] DEFAULT ARRAY[]::TEXT[],
  tool_configs      JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority          INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_providers_enabled ON providers(enabled);
CREATE INDEX idx_providers_type ON providers(type);

-- Tool schemas for custom validation per provider+tool
CREATE TABLE tool_schemas (
  id              SERIAL PRIMARY KEY,
  provider_id     TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  tool_name       TEXT NOT NULL,
  schema_type     TEXT NOT NULL CHECK (schema_type IN ('request', 'response')),
  schema_content  JSONB NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  is_custom       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT,
  UNIQUE(provider_id, tool_name, schema_type)
);

CREATE INDEX idx_tool_schemas_provider_tool ON tool_schemas(provider_id, tool_name);

-- Chat sessions and messages
CREATE TABLE chat_sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),
  locale          TEXT,
  device_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content_text    TEXT,
  content_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  redacted_text   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id, created_at);

-- Tool calls (audit + debugging)
CREATE TABLE tool_calls (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  message_id      TEXT REFERENCES chat_messages(id),
  tool_name       TEXT NOT NULL,
  request_json    JSONB NOT NULL,
  response_json   JSONB NOT NULL,
  success         BOOLEAN NOT NULL,
  duration_ms     INTEGER,
  trace_id        TEXT,
  provider_id     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_calls_session_id ON tool_calls(session_id);
CREATE INDEX idx_tool_calls_tool_name ON tool_calls(tool_name);
CREATE INDEX idx_tool_calls_created_at ON tool_calls(created_at DESC);
CREATE INDEX idx_tool_calls_provider_id ON tool_calls(provider_id);

CREATE TABLE feedback (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  message_id      TEXT REFERENCES chat_messages(id),
  rating          INTEGER NOT NULL CHECK (rating IN (-1, 1)),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_session_id ON feedback(session_id);

-- Cart / Orders (canonical, even if provider has its own)
CREATE TABLE carts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  provider        TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  currency        TEXT NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_carts_user_id ON carts(user_id);

CREATE TABLE cart_items (
  cart_id         TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,
  provider        TEXT,
  qty             INTEGER NOT NULL CHECK (qty > 0),
  unit_price      NUMERIC(12,2),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  cart_id         TEXT REFERENCES carts(id),
  provider        TEXT NOT NULL,
  provider_order_id TEXT,
  address_id      TEXT REFERENCES addresses(id),
  status          TEXT NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT 'COD',
  currency        TEXT NOT NULL DEFAULT 'INR',
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE order_events (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  message         TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_id ON order_events(order_id, ts);

-- Idempotency (for cart/order mutations)
CREATE TABLE idempotency_keys (
  key             TEXT PRIMARY KEY,
  user_id         TEXT,
  scope           TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  response_json   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Chain runs and steps (for Sequential Thinking MCP tool)
CREATE TABLE chain_runs (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES chat_sessions(id),
  user_id         TEXT REFERENCES users(id),
  trace_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'running',
  meta_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chain_runs_session_id ON chain_runs(session_id);
CREATE INDEX idx_chain_runs_trace_id ON chain_runs(trace_id);
CREATE INDEX idx_chain_runs_created_at ON chain_runs(created_at DESC);

CREATE TABLE chain_steps (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES chain_runs(id) ON DELETE CASCADE,
  step_index      INTEGER NOT NULL,
  stage           TEXT NOT NULL,
  content_json    JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chain_steps_run_id ON chain_steps(run_id, step_index);

-- Categories table (predefined product categories)
CREATE TABLE categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_enabled ON categories(enabled);
CREATE INDEX idx_categories_order ON categories(display_order);

-- Provider-Category association (many-to-many)
CREATE TABLE provider_categories (
  provider_id     TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX idx_provider_categories_provider ON provider_categories(provider_id);
CREATE INDEX idx_provider_categories_category ON provider_categories(category_id);

-- UCP Tools (Unified Commerce Protocol tool definitions)
CREATE TABLE ucp_tools (
  id                      TEXT PRIMARY KEY,
  display_name            TEXT NOT NULL,
  description             TEXT,
  category                TEXT NOT NULL DEFAULT 'commerce',
  enabled                 BOOLEAN NOT NULL DEFAULT true,
  request_schema          JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_schema         JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_timeout_ms      INTEGER NOT NULL DEFAULT 30000,
  default_retry_count     INTEGER NOT NULL DEFAULT 3,
  default_retry_backoff_ms INTEGER NOT NULL DEFAULT 1000,
  auth_config             JSONB NOT NULL DEFAULT '{}'::jsonb,
  version                 INTEGER NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ucp_tools_category ON ucp_tools(category);
CREATE INDEX idx_ucp_tools_enabled ON ucp_tools(enabled);

-- Seed Data
-- Admin user: admin/admin (password is bcrypt hash of 'admin')
INSERT INTO admin_users (id, username, password_hash, email, role) VALUES
  ('admin-001', 'admin', '$2b$10$prs3Oj8YqSbErTEP2p9nqenujcauhvZSRfRe6/KSNmHfdQksMv/wC', 'admin@commerce-ai.com', 'admin');

-- Test customer user: testuser/test123 (password is bcrypt hash of 'test123')
INSERT INTO users (id, username, password_hash, role) VALUES
  ('user-001', 'testuser', '$2b$10$JZA4pwl1IdzjmbDrFmidAeUDpkTLKDvZUMpVxruLVh27UQN7wNh3W', 'customer');

-- Default address for test user
INSERT INTO addresses (id, user_id, line1, line2, city, state, pincode, country, is_default) VALUES
  ('addr-001', 'user-001', 'Test Address Line 1', 'Near Test Plaza', 'Mumbai', 'Maharashtra', '400001', 'IN', true);

-- Admin configs - LLM settings
INSERT INTO admin_configs (key, category, value, description) VALUES
  ('llm.provider.primary', 'llm', '{"provider": "openai", "model": "gpt-4", "temperature": 0.7, "maxTokens": 2000}', 'Primary LLM provider configuration'),
  ('llm.provider.fallback', 'llm', '{"provider": "claude", "model": "claude-3-sonnet-20240229", "temperature": 0.7}', 'Fallback LLM provider configuration'),
  ('llm.system_prompt', 'llm', '{"prompt": "You are a helpful shopping assistant. Help users find products, compare options, and make purchases. Always be concise and friendly."}', 'System prompt for LLM'),
  ('llm.cost_tracking', 'llm', '{"enabled": true, "providers": {"openai": {"inputCost": 0.003, "outputCost": 0.015}, "claude": {"inputCost": 0.003, "outputCost": 0.015}}}', 'Cost tracking per provider');

-- Admin configs - Taxonomy
INSERT INTO admin_configs (key, category, value, description) VALUES
  ('taxonomy.categories', 'taxonomy', '{
    "electronics.audio.headphones": {
      "name": "Headphones",
      "path": ["Electronics", "Audio", "Headphones"],
      "keywords": ["headphone", "headphones", "earphone", "earphones", "earbuds", "ear buds", "headset"]
    },
    "electronics.audio.speakers": {
      "name": "Speakers",
      "path": ["Electronics", "Audio", "Speakers"],
      "keywords": ["speaker", "speakers", "bluetooth speaker"]
    },
    "fashion.apparel.tops.tshirts": {
      "name": "T-Shirts",
      "path": ["Fashion", "Apparel", "Tops", "T-Shirts"],
      "keywords": ["tshirt", "t-shirt", "tee", "top"]
    },
    "fashion.apparel.tops.shirts": {
      "name": "Shirts",
      "path": ["Fashion", "Apparel", "Tops", "Shirts"],
      "keywords": ["shirt", "shirts", "formal shirt"]
    },
    "fashion.footwear.sneakers": {
      "name": "Sneakers",
      "path": ["Fashion", "Footwear", "Sneakers"],
      "keywords": ["sneaker", "sneakers", "shoes", "running shoes", "sports shoes"]
    },
    "fashion.footwear.casual": {
      "name": "Casual Shoes",
      "path": ["Fashion", "Footwear", "Casual"],
      "keywords": ["casual shoes", "loafers", "slip-on"]
    }
  }', 'Product category taxonomy with keyword mappings'),
  ('taxonomy.brands', 'taxonomy', '{
    "nike": {"name": "Nike", "categories": ["fashion.apparel", "fashion.footwear"]},
    "adidas": {"name": "Adidas", "categories": ["fashion.apparel", "fashion.footwear"]},
    "sony": {"name": "Sony", "categories": ["electronics.audio"]},
    "bose": {"name": "Bose", "categories": ["electronics.audio"]},
    "jbl": {"name": "JBL", "categories": ["electronics.audio"]},
    "boat": {"name": "boAt", "categories": ["electronics.audio"]}
  }', 'Brand dictionary with category associations');

-- Admin configs - Provider settings
INSERT INTO admin_configs (key, category, value, description) VALUES
  ('provider.mock.enabled', 'provider', '{"enabled": true, "priority": 1}', 'Mock provider enable/disable'),
  ('provider.mock.config', 'provider', '{
    "timeout": 5000,
    "retries": 3,
    "circuitBreaker": {"threshold": 5, "timeout": 30000}
  }', 'Mock provider configuration'),
  ('provider.capabilities', 'provider', '{
    "mock": ["search", "details", "cart", "order"]
  }', 'Provider capability flags');

-- Admin configs - Tool settings
INSERT INTO admin_configs (key, category, value, description) VALUES
  ('tools.allowlist', 'tools', '{
    "enabled": ["commerce.searchProducts", "commerce.compareProducts", "commerce.cart.addItem", "commerce.cart.updateItemQty", "commerce.cart.removeItem", "commerce.cart.getCart", "commerce.order.createOrder", "commerce.order.getOrderStatus"]
  }', 'Allowed MCP tools'),
  ('tools.rate_limits', 'tools', '{
    "commerce.searchProducts": {"perMinute": 60, "perHour": 1000},
    "commerce.cart.addItem": {"perMinute": 30, "perHour": 500},
    "commerce.order.createOrder": {"perMinute": 10, "perHour": 100}
  }', 'Rate limits per tool');

-- Seed provider data
INSERT INTO providers (id, name, type, base_url, enabled, config, field_mappings, capabilities, tool_configs, priority) VALUES
  ('mock', 'Mock Provider', 'mock', 'http://localhost:8080', true,
   '{"timeout": 5000, "retries": 3, "circuitBreaker": {"threshold": 5, "timeout": 30000}}',
   '{"product": {"id": "id", "name": "name", "price": "price"}, "order": {"id": "id", "status": "status"}}',
   ARRAY['search', 'details', 'cart', 'order'],
   '{"commerce.searchProducts": {"enabled": true, "path": "/api/products/search", "method": "POST", "description": "Search for products"}, "commerce.getProductDetails": {"enabled": true, "path": "/api/products/:id", "method": "GET", "description": "Get product details"}, "commerce.cart.addItem": {"enabled": true, "path": "/api/cart/items", "method": "POST", "description": "Add item to cart"}, "commerce.cart.getCart": {"enabled": true, "path": "/api/cart", "method": "GET", "description": "Get user cart"}, "commerce.order.createOrder": {"enabled": true, "path": "/api/orders", "method": "POST", "description": "Create new order"}}',
   1),
  ('providerA', 'Provider A', 'external', 'http://localhost:8081', false,
   '{"timeout": 10000, "retries": 2}',
   '{"product": {"id": "productId", "name": "title", "price": "amount"}}',
   ARRAY['search', 'details'],
   '{"commerce.searchProducts": {"enabled": true, "path": "/search", "method": "GET", "description": "Search products"}, "commerce.getProductDetails": {"enabled": true, "path": "/products/:id", "method": "GET", "description": "Get product details"}}',
   2),
  ('providerB', 'Provider B', 'external', 'http://localhost:8082', false,
   '{"timeout": 10000, "retries": 2}',
   '{"product": {"id": "sku", "name": "productName", "price": "unitPrice"}}',
   ARRAY['search', 'details'],
   '{"commerce.searchProducts": {"enabled": true, "path": "/api/search", "method": "POST", "description": "Search products"}, "commerce.getProductDetails": {"enabled": true, "path": "/api/product/:id", "method": "GET", "description": "Get product details"}}',
   3),
  ('reliancedigital', 'Reliance Digital', 'external', 'https://www.reliancedigital.in', true,
   '{"timeout": 10000, "retries": 3, "auth": {"type": "bearer", "token": "NjQ1YTA1Nzg3NWQ4YzQ4ODJiMDk2ZjdlOl9fLU80NC00aQ=="}, "apiPath": "/ext/raven-api/catalog/v1.0/collections"}',
   '{"product": {"id": "uid", "name": "name", "price": "price.effective.min", "brand": "brand.name", "image": "medias[0].url", "rating": "_custom_meta.averageRating", "reviewCount": "_custom_meta.reviewsCount"}}',
   ARRAY['search', 'details'],
   '{"commerce.searchProducts": {"enabled": true, "path": "/ext/raven-api/catalog/v1.0/collections/{collection}/items", "method": "GET", "description": "Search products on Reliance Digital", "params": {"f": "internal_source:navigation:::page_type:number:::q:{query}", "page_no": "{page}", "page_size": "{limit}"}}, "commerce.getProductDetails": {"enabled": true, "path": "/ext/raven-api/catalog/v1.0/collections/{collection}/items", "method": "GET", "description": "Get product details from Reliance Digital"}}',
   4);

-- Create active cart for test user
INSERT INTO carts (id, user_id, provider, status, currency) VALUES
  ('cart-001', 'user-001', 'mock', 'ACTIVE', 'INR');

-- Seed categories
INSERT INTO categories (id, name, description, icon, display_order, enabled) VALUES
  ('electronics', 'Electronics', 'Electronic devices and accessories', 'laptop', 1, true),
  ('fashion', 'Fashion', 'Clothing, footwear and accessories', 'shirt', 2, true),
  ('home', 'Home & Kitchen', 'Home appliances and kitchen items', 'home', 3, true),
  ('beauty', 'Beauty & Personal Care', 'Beauty and personal care products', 'sparkles', 4, true),
  ('sports', 'Sports & Outdoors', 'Sports equipment and outdoor gear', 'dumbbell', 5, true);

-- Link categories to providers
INSERT INTO provider_categories (provider_id, category_id) VALUES
  ('mock', 'electronics'),
  ('mock', 'fashion'),
  ('mock', 'home'),
  ('mock', 'beauty'),
  ('mock', 'sports'),
  ('reliancedigital', 'electronics'),
  ('reliancedigital', 'home');

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
   '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"orderId": {"type": "string"}, "status": {"type": "string"}, "items": {"type": "array"}}}');

COMMIT;
