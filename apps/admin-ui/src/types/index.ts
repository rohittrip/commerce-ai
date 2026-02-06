export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface DashboardStats {
  activeSessions: number;
  totalMessages: number;
  totalOrders: number;
  totalRevenue: number;
  avgResponseTime: number;
  errorRate: number;
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{
    timestamp: string;
    type: string;
    message: string;
  }>;
}

export interface LLMProvider {
  provider: 'openai' | 'claude' | 'gemini';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LLMConfig {
  key: string;
  value: LLMProvider;
  description?: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  path: string[];
  keywords: string[];
  parentId?: string;
}

export interface TaxonomyConfig {
  categories: Record<string, Category>;
}

export interface ToolTestRequest {
  toolName: string;
  request: Record<string, any>;
}

export interface ToolTestResponse {
  success: boolean;
  response?: any;
  error?: string;
  executionTime?: number;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status: 'active' | 'archived';
}

export interface ToolCall {
  id: string;
  sessionId: string;
  toolName: string;
  request: Record<string, any>;
  response: Record<string, any>;
  executionTime: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface ErrorLog {
  id: string;
  sessionId?: string;
  errorType: string;
  message: string;
  stack?: string;
  timestamp: string;
  resolved: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'suspended';
}

export interface ProviderCapability {
  name: 'SEARCH' | 'DETAILS' | 'CART' | 'ORDER';
  enabled: boolean;
  description: string;
}

export interface ProviderConfig {
  providerId: string;
  providerName: string;
  displayName: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  config: Record<string, any>;
  toolConfigs?: ProviderToolConfigs;
  openapiSpec?: OpenAPISchema;
  mappings: {
    categoryMappings?: Record<string, string>;
    fieldMappings?: Record<string, string>;
  };
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    endpoint?: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastSync?: string;
  };
}

export interface ProviderMapping {
  providerId: string;
  categoryMappings: Record<string, string>;
  fieldMappings: Record<string, string>;
}

export interface ProviderStats {
  providerId: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  lastError?: string;
  lastErrorTime?: string;
}

export interface ToolConfig {
  enabled: boolean;
  path?: string;
  method?: string;
  description?: string;
  mappings?: {
    fieldMappings?: Record<string, string>;
    categoryMappings?: Record<string, string>;
    providerApiId?: string;
  };
}

export interface ProviderToolConfigs {
  [toolName: string]: ToolConfig;
}

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: Record<string, any>;
}

export interface OpenAPIOperation {
  name: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    schema: any;
  }>;
}

export interface ProviderOpenAPI {
  schema: OpenAPISchema | null;
  tools: OpenAPIOperation[];
}

// ============================================
// Enhanced Tool Configuration Types
// ============================================

export interface AuthConfig {
  type: 'none' | 'api_key' | 'bearer' | 'basic';
  headerName?: string;
  tokenPath?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  retryOn: number[];
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
}

export interface ApiConfig {
  headers?: Record<string, string>;
  auth?: AuthConfig;
  timeout?: number;
  retry?: RetryConfig;
  rateLimit?: RateLimitConfig;
}

export interface EnhancedToolConfig extends ToolConfig {
  apiConfig?: ApiConfig;
}

export interface EnhancedProviderToolConfigs {
  [toolName: string]: EnhancedToolConfig;
}

// ============================================
// Tool Schema Types
// ============================================

export interface ToolSchema {
  providerId: string;
  toolName: string;
  schemaType: 'request' | 'response';
  schemaContent: object;
  isCustom: boolean;
  version: number;
  updatedAt?: string;
}

export interface ToolTestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  response?: any;
  error?: string;
  validationResult?: {
    requestValid: boolean;
    responseValid: boolean;
    errors?: string[];
  };
}

// ============================================
// Provider API Types (from OpenAPI import)
// ============================================

export interface ProviderApiEndpoint {
  id: string;
  providerId: string;
  operationId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'body';
    required: boolean;
    type: string;
    description?: string;
  }>;
  requestSchema?: object;
  responseSchema?: object;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UCP Tool Types (Internal/Platform Schema)
// ============================================

export interface UCPFieldMapping {
  ucpField: string;
  providerField: string;
  transform?: 'none' | 'lowercase' | 'uppercase' | 'number' | 'boolean' | 'array' | 'custom';
  customTransform?: string; // For custom transformations
  required: boolean;
}

export interface UCPToolConfig {
  toolName: string;
  displayName: string;
  description: string;
  enabled: boolean;

  // UCP Internal Schema (standardized across all providers)
  ucpRequestSchema: object;
  ucpResponseSchema: object;

  // Provider API Mapping
  providerApiId?: string; // ID of the mapped ProviderApiEndpoint
  providerApiName?: string; // Display name for convenience

  // Field Mappings (UCP -> Provider)
  requestMappings: UCPFieldMapping[];
  responseMappings: UCPFieldMapping[];

  // API Configuration
  apiConfig?: ApiConfig;

  // Metadata
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface UCPProviderToolConfigs {
  [toolName: string]: UCPToolConfig;
}

// ============================================
// Enhanced Provider Config with dual schema
// ============================================

export interface EnhancedProviderConfig extends Omit<ProviderConfig, 'toolConfigs'> {
  // Provider's imported API endpoints (from OpenAPI)
  providerApis?: ProviderApiEndpoint[];

  // UCP Tool configurations with mappings
  ucpToolConfigs?: UCPProviderToolConfigs;

  // Legacy tool configs (for backward compatibility)
  toolConfigs?: EnhancedProviderToolConfigs;
}

// ============================================
// Global UCP Tool Types (Platform-wide)
// ============================================

export interface UcpTool {
  id: string;
  displayName: string;
  description: string;
  category: string;
  enabled: boolean;
  requestSchema: object;
  responseSchema: object;
  defaultTimeoutMs: number;
  defaultRetryCount: number;
  defaultRetryBackoffMs: number;
  authConfig: AuthConfig;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUcpToolDto {
  id: string;
  displayName: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  requestSchema: object;
  responseSchema: object;
  defaultTimeoutMs?: number;
  defaultRetryCount?: number;
  defaultRetryBackoffMs?: number;
  authConfig?: AuthConfig;
}

export interface UpdateUcpToolDto {
  displayName?: string;
  description?: string;
  category?: string;
  enabled?: boolean;
  requestSchema?: object;
  responseSchema?: object;
  defaultTimeoutMs?: number;
  defaultRetryCount?: number;
  defaultRetryBackoffMs?: number;
  authConfig?: AuthConfig;
}

// ============================================
// Predefined Categories (Provider Categories)
// ============================================

export interface ProviderCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  displayOrder: number;
  enabled: boolean;
  createdAt?: string;
}

export interface CreateCategoryDto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  enabled?: boolean;
}

// ============================================
// Human-Readable Schema Types
// ============================================

export interface ReadableSchemaProperty {
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  description: string;
  enumValues?: string[];
  defaultValue?: any;
  minimum?: number;
  maximum?: number;
  itemType?: string;
}

// ============================================
// Multi-Agent System Types
// ============================================

export interface AgentMetadata {
  name: string;
  capabilities: string[];
  priority: number;
  description: string;
  systemPrompt: string;
  allowedDelegations: string[];
  maxDelegations: number;
  maxTaskDepth: number;
}
