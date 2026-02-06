-- Migration: Seed internal tools (orchestration and thinking tools)
-- Purpose: Add internal tool definitions to ucp_tools table
-- Author: System Migration
-- Date: 2026-02-02

-- Internal orchestration tools for system metadata and management
INSERT INTO ucp_tools (
  id,
  display_name,
  description,
  category,
  enabled,
  is_internal,
  tool_type,
  request_schema,
  response_schema
) VALUES
  (
    'orchestrator.getProviders',
    'Get Providers',
    'Get all active providers with their capabilities and configuration',
    'orchestration',
    true,
    true,
    'orchestration',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"enabled": {"type": "boolean", "description": "Filter by enabled status"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"providers": {"type": "array", "items": {"type": "object"}}, "total": {"type": "integer"}}}'
  ),
  (
    'orchestrator.getTools',
    'Get Tools',
    'Get all available UCP tools with metadata',
    'orchestration',
    true,
    true,
    'orchestration',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"filter": {"type": "string", "description": "Optional filter string"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"tools": {"type": "array", "items": {"type": "object"}}, "total": {"type": "integer"}}}'
  ),
  (
    'orchestrator.getMetadata',
    'Get Metadata',
    'Get system metadata (providers, tools, categories)',
    'orchestration',
    true,
    true,
    'orchestration',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["type"], "properties": {"type": {"type": "string", "enum": ["providers", "tools", "categories"], "description": "Type of metadata to retrieve"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"data": {"type": "object", "description": "Metadata content"}}}'
  ),
  (
    'orchestrator.detectIntent',
    'Detect Intent',
    'Analyze user query to detect intent and extract entities',
    'orchestration',
    true,
    true,
    'orchestration',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["query"], "properties": {"query": {"type": "string", "description": "User query to analyze"}, "context": {"type": "object", "description": "Optional conversation context"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"intent": {"type": "string"}, "confidence": {"type": "number"}, "entities": {"type": "object"}}}'
  ),
  (
    'orchestrator.handleError',
    'Handle Error',
    'Error handling with recovery suggestions',
    'orchestration',
    true,
    true,
    'orchestration',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["error"], "properties": {"error": {"type": "object", "description": "Error object"}, "context": {"type": "object", "description": "Optional error context"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"errorCode": {"type": "string"}, "message": {"type": "string"}, "suggestions": {"type": "array", "items": {"type": "string"}}}}'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_internal = EXCLUDED.is_internal,
  tool_type = EXCLUDED.tool_type;

-- Thinking tools for chain-of-thought reasoning
INSERT INTO ucp_tools (
  id,
  display_name,
  description,
  category,
  enabled,
  is_internal,
  tool_type,
  request_schema,
  response_schema
) VALUES
  (
    'thinking.createChainRun',
    'Create Chain Run',
    'Create a sequential thinking chain run for multi-step reasoning',
    'thinking',
    true,
    true,
    'thinking',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["sessionId", "userId"], "properties": {"sessionId": {"type": "string"}, "userId": {"type": "string"}, "metadata": {"type": "object", "description": "Optional metadata for the chain run"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"runId": {"type": "string"}, "traceId": {"type": "string"}, "status": {"type": "string", "enum": ["running", "completed", "failed"]}}}'
  ),
  (
    'thinking.addChainStep',
    'Add Chain Step',
    'Add a step to an active thinking chain run',
    'thinking',
    true,
    true,
    'thinking',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["runId", "stage", "content"], "properties": {"runId": {"type": "string"}, "stage": {"type": "string", "enum": ["analyze", "breakdown", "solve", "verify"]}, "content": {"type": "object"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"stepId": {"type": "string"}, "stepIndex": {"type": "integer"}, "stage": {"type": "string"}}}'
  ),
  (
    'thinking.completeChainRun',
    'Complete Chain Run',
    'Mark a thinking chain run as completed and retrieve all steps',
    'thinking',
    true,
    true,
    'thinking',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["runId"], "properties": {"runId": {"type": "string"}}}',
    '{"$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "properties": {"runId": {"type": "string"}, "status": {"type": "string"}, "steps": {"type": "array", "items": {"type": "object"}}}}'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_internal = EXCLUDED.is_internal,
  tool_type = EXCLUDED.tool_type;
