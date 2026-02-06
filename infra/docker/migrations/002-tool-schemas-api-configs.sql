-- Migration: Add tool schemas and enhanced API configs
-- Version: 002
-- Date: 2026-02-01
-- Description: Adds support for custom tool schemas per provider and enhanced tool API configurations

-- Add tool_configs column to providers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'tool_configs'
  ) THEN
    ALTER TABLE providers ADD COLUMN tool_configs JSONB NOT NULL DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN providers.tool_configs IS 'Per-tool configuration including API settings, headers, auth, rate limits';
  END IF;
END $$;

-- Create tool_schemas table for custom schemas per provider+tool
CREATE TABLE IF NOT EXISTS tool_schemas (
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tool_schemas_provider_tool ON tool_schemas(provider_id, tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_schemas_updated_at ON tool_schemas(updated_at DESC);

-- Add comments for documentation
COMMENT ON TABLE tool_schemas IS 'Custom JSON schemas per provider+tool combination for request/response validation';
COMMENT ON COLUMN tool_schemas.schema_type IS 'Either request or response';
COMMENT ON COLUMN tool_schemas.is_custom IS 'False if using default schema, true if custom uploaded';
COMMENT ON COLUMN tool_schemas.version IS 'Incremented each time schema is updated';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tool_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trg_tool_schemas_updated_at ON tool_schemas;
CREATE TRIGGER trg_tool_schemas_updated_at
  BEFORE UPDATE ON tool_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_tool_schemas_updated_at();

-- Seed default tool configs for ALL providers that have empty tool_configs
UPDATE providers
SET tool_configs = '{
  "commerce.searchProducts": {
    "enabled": true,
    "path": "/api/products/search",
    "method": "POST",
    "description": "Search for products",
    "fieldMappings": {},
    "categoryMappings": {},
    "apiConfig": {
      "timeout": 10000,
      "retry": {
        "maxAttempts": 3,
        "backoffMs": 1000,
        "retryOn": [500, 502, 503, 504]
      }
    }
  },
  "commerce.getProductDetails": {
    "enabled": true,
    "path": "/api/products/:productId",
    "method": "GET",
    "description": "Get product details"
  },
  "commerce.cart.addItem": {
    "enabled": true,
    "path": "/api/cart/items",
    "method": "POST",
    "description": "Add item to cart"
  },
  "commerce.cart.getCart": {
    "enabled": true,
    "path": "/api/cart",
    "method": "GET",
    "description": "Get user cart"
  },
  "commerce.order.createOrder": {
    "enabled": true,
    "path": "/api/orders",
    "method": "POST",
    "description": "Create new order"
  }
}'::jsonb
WHERE tool_configs = '{}'::jsonb OR tool_configs IS NULL;

COMMIT;
