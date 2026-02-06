-- Migration: UCP Tools and Categories Management
-- This migration creates tables for global UCP tool definitions and provider categories

-- =====================================================
-- 1. PREDEFINED CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  display_order   INTEGER DEFAULT 0,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_enabled ON categories(enabled);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- =====================================================
-- 2. PROVIDER-CATEGORY ASSOCIATIONS (JUNCTION TABLE)
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_categories (
  provider_id     TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_categories_provider ON provider_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_category ON provider_categories(category_id);

-- =====================================================
-- 3. GLOBAL UCP TOOLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ucp_tools (
  id                    TEXT PRIMARY KEY,
  display_name          TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL DEFAULT 'commerce',
  enabled               BOOLEAN NOT NULL DEFAULT true,
  request_schema        JSONB NOT NULL,
  response_schema       JSONB NOT NULL,
  default_timeout_ms    INTEGER DEFAULT 30000,
  default_retry_count   INTEGER DEFAULT 3,
  default_retry_backoff_ms INTEGER DEFAULT 1000,
  auth_config           JSONB NOT NULL DEFAULT '{}'::jsonb,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ucp_tools_category ON ucp_tools(category);
CREATE INDEX IF NOT EXISTS idx_ucp_tools_enabled ON ucp_tools(enabled);

-- =====================================================
-- 4. SEED PREDEFINED CATEGORIES
-- =====================================================
INSERT INTO categories (id, name, description, icon, display_order) VALUES
  ('food', 'Food & Grocery', 'Food delivery, groceries, restaurants', 'restaurant', 1),
  ('health', 'Health & Wellness', 'Pharmacy, healthcare, fitness', 'medical_services', 2),
  ('electronics', 'Electronics', 'Consumer electronics, gadgets, computers', 'devices', 3),
  ('fashion', 'Fashion & Apparel', 'Clothing, footwear, accessories', 'checkroom', 4),
  ('home', 'Home & Living', 'Furniture, home decor, appliances', 'home', 5),
  ('beauty', 'Beauty & Personal Care', 'Cosmetics, skincare, grooming', 'spa', 6),
  ('sports', 'Sports & Outdoors', 'Sports equipment, outdoor gear, fitness', 'sports_soccer', 7),
  ('books', 'Books & Media', 'Books, movies, music, games', 'menu_book', 8),
  ('toys', 'Toys & Games', 'Toys, games, hobbies, crafts', 'toys', 9),
  ('automotive', 'Automotive', 'Car parts, accessories, services', 'directions_car', 10)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- =====================================================
-- 5. SEED UCP TOOLS (FROM EXISTING JAVA SCHEMAS)
-- =====================================================

-- commerce.searchProducts
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.searchProducts', 'Search Products', 'Search for products across all connected providers', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query text"
    },
    "filters": {
      "type": "object",
      "properties": {
        "categories": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Canonical category IDs to filter by"
        },
        "priceMin": {"type": "number", "minimum": 0},
        "priceMax": {"type": "number", "minimum": 0},
        "brands": {
          "type": "array",
          "items": {"type": "string"}
        },
        "inStock": {"type": "boolean"},
        "rating": {"type": "number", "minimum": 0, "maximum": 5}
      }
    },
    "pagination": {
      "type": "object",
      "properties": {
        "page": {"type": "integer", "minimum": 1, "default": 1},
        "limit": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
      }
    },
    "sortBy": {
      "type": "string",
      "enum": ["relevance", "price_asc", "price_desc", "rating", "newest"],
      "default": "relevance"
    }
  },
  "required": ["query"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "products": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "provider": {"type": "string"},
              "name": {"type": "string"},
              "description": {"type": "string"},
              "brand": {"type": "string"},
              "category": {"type": "string"},
              "price": {
                "type": "object",
                "properties": {
                  "amount": {"type": "number"},
                  "currency": {"type": "string"}
                }
              },
              "imageUrl": {"type": "string"},
              "availability": {
                "type": "object",
                "properties": {
                  "inStock": {"type": "boolean"},
                  "status": {"type": "string"}
                }
              },
              "rating": {"type": "number"},
              "reviewCount": {"type": "integer"}
            },
            "required": ["id", "provider", "name", "price", "availability"]
          }
        },
        "total": {"type": "integer", "minimum": 0},
        "pagination": {
          "type": "object",
          "properties": {
            "page": {"type": "integer"},
            "limit": {"type": "integer"},
            "total": {"type": "integer"},
            "hasMore": {"type": "boolean"}
          }
        }
      },
      "required": ["products", "total"]
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {"type": "string"},
        "message": {"type": "string"}
      }
    }
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- commerce.compareProducts
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.compareProducts', 'Compare Products', 'Compare multiple products side by side', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "productIds": {
      "type": "array",
      "items": {"type": "string"},
      "minItems": 2,
      "maxItems": 5,
      "description": "Array of product IDs to compare (2-5 products)"
    }
  },
  "required": ["productIds"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "products": {"type": "array", "items": {"type": "object"}},
        "comparisonMatrix": {
          "type": "object",
          "description": "Key differences across products"
        },
        "recommendation": {
          "type": "string",
          "description": "AI recommendation based on comparison"
        }
      },
      "required": ["products"]
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- commerce.cart.addItem
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.cart.addItem', 'Add to Cart', 'Add an item to the shopping cart', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "userId": {"type": "string"},
    "productId": {"type": "string"},
    "provider": {"type": "string"},
    "quantity": {"type": "integer", "minimum": 1, "default": 1},
    "idempotencyKey": {"type": "string", "description": "Client-provided idempotency key"}
  },
  "required": ["userId", "productId", "provider", "quantity"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "userId": {"type": "string"},
        "items": {"type": "array"},
        "total": {"type": "object"},
        "itemCount": {"type": "integer"}
      }
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- commerce.cart.updateItemQty
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.cart.updateItemQty', 'Update Cart Quantity', 'Update the quantity of an item in the cart', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "userId": {"type": "string"},
    "productId": {"type": "string"},
    "quantity": {"type": "integer", "minimum": 1},
    "idempotencyKey": {"type": "string"}
  },
  "required": ["userId", "productId", "quantity"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {"type": "object"},
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- commerce.cart.removeItem
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.cart.removeItem', 'Remove from Cart', 'Remove an item from the shopping cart', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "userId": {"type": "string"},
    "productId": {"type": "string"},
    "idempotencyKey": {"type": "string"}
  },
  "required": ["userId", "productId"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {"type": "object"},
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- commerce.cart.getCart
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('commerce.cart.getCart', 'Get Cart', 'Retrieve the current shopping cart for a user', 'commerce',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "userId": {"type": "string"}
  },
  "required": ["userId"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "id": {"type": "string"},
        "userId": {"type": "string"},
        "items": {"type": "array"},
        "subtotal": {"type": "object"},
        "tax": {"type": "object"},
        "total": {"type": "object"},
        "currency": {"type": "string"},
        "itemCount": {"type": "integer"}
      }
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- thinking.createChainRun
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('thinking.createChainRun', 'Create Chain Run', 'Create a new sequential thinking chain run', 'thinking',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sessionId": {"type": "string", "description": "Chat session ID"},
    "userId": {"type": "string", "description": "User ID"},
    "traceId": {"type": "string", "description": "Trace ID for debugging"},
    "problem": {"type": "string", "description": "Problem description to think through"}
  },
  "required": ["sessionId", "userId", "problem"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "runId": {"type": "string"},
        "status": {"type": "string"}
      }
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- thinking.addChainStep
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('thinking.addChainStep', 'Add Chain Step', 'Add a step to an existing thinking chain', 'thinking',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "runId": {"type": "string", "description": "Chain run ID"},
    "stepIndex": {"type": "integer", "description": "Step index (0-based)"},
    "stage": {"type": "string", "description": "Thinking stage (analyze, breakdown, solve, verify)"},
    "content": {"type": "object", "description": "Step content"}
  },
  "required": ["runId", "stepIndex", "stage", "content"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "stepId": {"type": "string"},
        "runId": {"type": "string"}
      }
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- thinking.completeChainRun
INSERT INTO ucp_tools (id, display_name, description, category, request_schema, response_schema) VALUES
('thinking.completeChainRun', 'Complete Chain Run', 'Mark a thinking chain run as complete', 'thinking',
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "runId": {"type": "string", "description": "Chain run ID"},
    "status": {"type": "string", "description": "Final status (completed or failed)", "default": "completed"}
  },
  "required": ["runId"]
}'::jsonb,
'{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "ok": {"type": "boolean"},
    "traceId": {"type": "string"},
    "data": {
      "type": "object",
      "properties": {
        "runId": {"type": "string"},
        "status": {"type": "string"},
        "completedAt": {"type": "string"}
      }
    },
    "error": {"type": "object"}
  },
  "required": ["ok", "traceId"]
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  request_schema = EXCLUDED.request_schema,
  response_schema = EXCLUDED.response_schema,
  updated_at = now();

-- =====================================================
-- 6. SEED DEFAULT PROVIDER CATEGORIES
-- =====================================================
-- Associate mock provider with some default categories
INSERT INTO provider_categories (provider_id, category_id)
SELECT 'mock', id FROM categories WHERE id IN ('electronics', 'fashion')
ON CONFLICT DO NOTHING;

COMMIT;
