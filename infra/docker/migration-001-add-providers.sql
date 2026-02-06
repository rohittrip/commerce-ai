-- Migration: Add providers table and related changes
-- Date: 2026-01-26
-- Description: Adds providers table for managing e-commerce backend integrations

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
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
  priority          INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);

-- Add provider_id column to tool_calls if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tool_calls' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE tool_calls ADD COLUMN provider_id TEXT;
    CREATE INDEX idx_tool_calls_provider_id ON tool_calls(provider_id);
  END IF;
END $$;

-- Add category_mappings column to providers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'category_mappings'
  ) THEN
    ALTER TABLE providers ADD COLUMN category_mappings JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Insert seed provider data (only if not exists)
INSERT INTO providers (id, name, type, base_url, enabled, config, field_mappings, capabilities, priority)
SELECT 'mock', 'Mock Provider', 'mock', 'http://localhost:8080', true, 
   '{"timeout": 5000, "retries": 3, "circuitBreaker": {"threshold": 5, "timeout": 30000}}'::jsonb,
   '{"product": {"id": "id", "name": "name", "price": "price"}, "order": {"id": "id", "status": "status"}}'::jsonb,
   ARRAY['search', 'details', 'cart', 'order'], 1
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE id = 'mock');

INSERT INTO providers (id, name, type, base_url, enabled, config, field_mappings, capabilities, priority)
SELECT 'providerA', 'Provider A', 'external', 'http://localhost:8081', false,
   '{"timeout": 10000, "retries": 2}'::jsonb,
   '{"product": {"id": "productId", "name": "title", "price": "amount"}}'::jsonb,
   ARRAY['search', 'details'], 2
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE id = 'providerA');

INSERT INTO providers (id, name, type, base_url, enabled, config, field_mappings, capabilities, priority)
SELECT 'providerB', 'Provider B', 'external', 'http://localhost:8082', false,
   '{"timeout": 10000, "retries": 2}'::jsonb,
   '{"product": {"id": "sku", "name": "productName", "price": "unitPrice"}}'::jsonb,
   ARRAY['search', 'details'], 3
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE id = 'providerB');

COMMIT;
