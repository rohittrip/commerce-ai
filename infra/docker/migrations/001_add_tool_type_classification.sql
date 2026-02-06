-- Migration: Add tool type classification to ucp_tools and tool_calls tables
-- Purpose: Enable separation of internal tools from provider UCP API tools
-- Author: System Migration
-- Date: 2026-02-02

-- Add is_internal flag and tool_type enum to ucp_tools table
ALTER TABLE ucp_tools
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tool_type VARCHAR(50) NOT NULL DEFAULT 'provider_api'
    CHECK (tool_type IN ('provider_api', 'internal', 'orchestration', 'thinking'));

-- Add indexes for efficient filtering by tool type
CREATE INDEX IF NOT EXISTS idx_ucp_tools_tool_type ON ucp_tools(tool_type);
CREATE INDEX IF NOT EXISTS idx_ucp_tools_is_internal ON ucp_tools(is_internal);

-- Classify existing commerce tools as provider_api type
UPDATE ucp_tools
SET is_internal = false, tool_type = 'provider_api'
WHERE id LIKE 'commerce.%';

-- Add is_internal column to tool_calls for analytics and filtering
ALTER TABLE tool_calls
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Add index for efficient filtering of internal vs provider tool calls
CREATE INDEX IF NOT EXISTS idx_tool_calls_is_internal ON tool_calls(is_internal);

-- Add comment to document the change
COMMENT ON COLUMN ucp_tools.is_internal IS 'Flag indicating if tool is internal (orchestration/system) vs provider (commerce API)';
COMMENT ON COLUMN ucp_tools.tool_type IS 'Tool type: provider_api, internal, orchestration, or thinking';
COMMENT ON COLUMN tool_calls.is_internal IS 'Flag indicating if this tool call was for an internal tool';
