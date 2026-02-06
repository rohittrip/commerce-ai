-- Migration: Add user_contexts table and tool_calls.cached column
-- Version: 002
-- Date: 2024-02-01

-- Add cached column to tool_calls if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_calls' AND column_name = 'cached'
  ) THEN
    ALTER TABLE tool_calls ADD COLUMN cached BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index on cached column for analytics
CREATE INDEX IF NOT EXISTS idx_tool_calls_cached ON tool_calls(cached);

-- User contexts table for session-based personalization
CREATE TABLE IF NOT EXISTS user_contexts (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  session_id          TEXT UNIQUE NOT NULL REFERENCES chat_sessions(id),
  preferences         JSONB NOT NULL DEFAULT '{}'::jsonb,
  recent_searches     JSONB NOT NULL DEFAULT '[]'::jsonb,
  recently_viewed     JSONB NOT NULL DEFAULT '[]'::jsonb,
  cart_summary        JSONB,
  last_intent         TEXT,
  conversation_state  TEXT NOT NULL DEFAULT 'IDLE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for user_contexts
CREATE INDEX IF NOT EXISTS idx_user_contexts_user_id ON user_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_session_id ON user_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_updated_at ON user_contexts(updated_at DESC);

-- Add default clarification prompts to admin_configs
INSERT INTO admin_configs (key, category, value, description, updated_at)
VALUES (
  'prompts.clarification',
  'prompts',
  '{
    "PRODUCT_SEARCH": [
      {
        "question": "What type of product are you looking for?",
        "options": ["Electronics", "Fashion", "Home & Kitchen", "Beauty", "Sports"],
        "context": "default"
      },
      {
        "question": "Could you tell me more about what you are looking for?",
        "options": ["Show popular items", "Browse categories", "Show deals"],
        "context": "vague"
      }
    ],
    "PRODUCT_COMPARE": [
      {
        "question": "Which products would you like to compare?",
        "options": [],
        "context": "default"
      }
    ],
    "ADD_TO_CART": [
      {
        "question": "Which product would you like to add to your cart?",
        "options": [],
        "context": "default"
      }
    ],
    "ORDER_STATUS": [
      {
        "question": "Which order would you like to track? Please provide your order ID.",
        "options": [],
        "context": "default"
      }
    ]
  }'::jsonb,
  'Clarification prompts for ambiguous user queries',
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Add default tool cache configuration
INSERT INTO admin_configs (key, category, value, description, updated_at)
VALUES (
  'tools.cache_config',
  'tools',
  '{
    "commerce.searchProducts": {"enabled": true, "ttlSeconds": 3600, "cacheKeyPrefix": "tool:search"},
    "commerce.getProductById": {"enabled": true, "ttlSeconds": 3600, "cacheKeyPrefix": "tool:product"},
    "commerce.compareProducts": {"enabled": true, "ttlSeconds": 1800, "cacheKeyPrefix": "tool:compare"},
    "commerce.findProvidersByCategory": {"enabled": true, "ttlSeconds": 86400, "cacheKeyPrefix": "tool:providers"},
    "commerce.getCatalogByCategory": {"enabled": true, "ttlSeconds": 86400, "cacheKeyPrefix": "tool:catalog"},
    "commerce.getRecommendations": {"enabled": true, "ttlSeconds": 1800, "cacheKeyPrefix": "tool:reco"},
    "commerce.getProductReviews": {"enabled": true, "ttlSeconds": 3600, "cacheKeyPrefix": "tool:reviews"},
    "commerce.checkAvailability": {"enabled": true, "ttlSeconds": 300, "cacheKeyPrefix": "tool:avail"},
    "commerce.cart.addItem": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""},
    "commerce.cart.updateItemQty": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""},
    "commerce.cart.removeItem": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""},
    "commerce.cart.getCart": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""},
    "commerce.order.createOrder": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""},
    "commerce.order.getOrderStatus": {"enabled": false, "ttlSeconds": 0, "cacheKeyPrefix": ""}
  }'::jsonb,
  'Tool caching configuration with TTL settings',
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Add default brands taxonomy
INSERT INTO admin_configs (key, category, value, description, updated_at)
VALUES (
  'taxonomy.brands',
  'taxonomy',
  '{
    "brands": [
      {"name": "Sony", "aliases": ["sony"], "categories": ["electronics", "audio"]},
      {"name": "Bose", "aliases": ["bose"], "categories": ["electronics", "audio"]},
      {"name": "Apple", "aliases": ["apple", "iphone", "macbook", "ipad"], "categories": ["electronics", "mobile"]},
      {"name": "Samsung", "aliases": ["samsung", "galaxy"], "categories": ["electronics", "mobile", "appliances"]},
      {"name": "Nike", "aliases": ["nike"], "categories": ["fashion", "sports"]},
      {"name": "Adidas", "aliases": ["adidas"], "categories": ["fashion", "sports"]},
      {"name": "Levi''s", "aliases": ["levis", "levi"], "categories": ["fashion"]},
      {"name": "Dell", "aliases": ["dell"], "categories": ["electronics", "computers"]},
      {"name": "HP", "aliases": ["hp", "hewlett packard"], "categories": ["electronics", "computers"]},
      {"name": "Lenovo", "aliases": ["lenovo", "thinkpad"], "categories": ["electronics", "computers"]},
      {"name": "OnePlus", "aliases": ["oneplus", "one plus"], "categories": ["electronics", "mobile"]},
      {"name": "Xiaomi", "aliases": ["xiaomi", "mi", "redmi"], "categories": ["electronics", "mobile"]},
      {"name": "JBL", "aliases": ["jbl"], "categories": ["electronics", "audio"]},
      {"name": "Boat", "aliases": ["boat", "boAt"], "categories": ["electronics", "audio"]},
      {"name": "LG", "aliases": ["lg"], "categories": ["electronics", "appliances"]},
      {"name": "Philips", "aliases": ["philips"], "categories": ["electronics", "appliances", "home"]}
    ]
  }'::jsonb,
  'Brand taxonomy with aliases for intent detection',
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Comment for documentation
COMMENT ON TABLE user_contexts IS 'Stores user session context for personalization and conversation state management';
COMMENT ON COLUMN user_contexts.preferences IS 'User preferences like preferred categories, brands, price range';
COMMENT ON COLUMN user_contexts.recent_searches IS 'Array of recent search queries with timestamps';
COMMENT ON COLUMN user_contexts.recently_viewed IS 'Array of recently viewed product IDs';
COMMENT ON COLUMN user_contexts.conversation_state IS 'Current conversation state: IDLE, SEARCHING, COMPARING, etc.';
