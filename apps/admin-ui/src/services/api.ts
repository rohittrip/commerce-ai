import axios from 'axios';
import type {
  AuthResponse,
  DashboardStats,
  LLMConfig,
  TaxonomyConfig,
  ToolTestRequest,
  ToolTestResponse,
  ChatSession,
  ToolCall,
  ErrorLog,
  AdminUser,
  ProviderConfig,
  ProviderMapping,
  ProviderStats,
  ToolConfig,
  ProviderOpenAPI,
  EnhancedToolConfig,
  ToolSchema,
  ToolTestResult,
  UcpTool,
  CreateUcpToolDto,
  UpdateUcpToolDto,
  ProviderCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  ReadableSchemaProperty,
  AgentMetadata,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:3001';

class ApiClient {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  private orchestratorClient = axios.create({
    baseURL: ORCHESTRATOR_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Setup interceptors for BFF client
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
        }
        throw error;
      }
    );

    // Setup interceptors for Orchestrator client
    this.orchestratorClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.orchestratorClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Orchestrator service methods (for admin APIs)
  async orchestratorGet<T>(url: string, config?: any): Promise<T> {
    const response = await this.orchestratorClient.get<T>(url, config);
    return response.data;
  }

  async orchestratorPost<T>(url: string, data?: any): Promise<T> {
    const response = await this.orchestratorClient.post<T>(url, data);
    return response.data;
  }

  async orchestratorPut<T>(url: string, data?: any): Promise<T> {
    const response = await this.orchestratorClient.put<T>(url, data);
    return response.data;
  }

  async orchestratorDelete<T>(url: string): Promise<T> {
    const response = await this.orchestratorClient.delete<T>(url);
    return response.data;
  }
}

const apiClient = new ApiClient();

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthResponse>('/v1/auth/login', { username, password }),
};

export const dashboardApi = {
  getStats: () => apiClient.orchestratorGet<DashboardStats>('/admin/dashboard/stats'),
};

export const llmConfigApi = {
  getAll: () => apiClient.orchestratorGet<LLMConfig[]>('/admin/config/llm'),
  get: (key: string) => apiClient.orchestratorGet<LLMConfig>(`/admin/config/llm/${key}`),
  update: (key: string, value: any) =>
    apiClient.orchestratorPut<LLMConfig>(`/admin/config/llm/${key}`, { value }),
};

export const taxonomyApi = {
  getCategories: () => apiClient.get<TaxonomyConfig>('/v1/admin/taxonomy/categories'),
  updateCategories: (categories: TaxonomyConfig) =>
    apiClient.put<TaxonomyConfig>('/v1/admin/taxonomy/categories', categories),
  getKeywords: (categoryId: string) =>
    apiClient.get<string[]>(`/v1/admin/taxonomy/keywords/${categoryId}`),
  updateKeywords: (categoryId: string, keywords: string[]) =>
    apiClient.put<string[]>(`/v1/admin/taxonomy/keywords/${categoryId}`, { keywords }),
};

export const toolsApi = {
  test: (request: ToolTestRequest) =>
    apiClient.post<ToolTestResponse>('/v1/admin/tools/test', request),
  list: () => apiClient.get<string[]>('/v1/admin/tools/list'),
};

export const monitoringApi = {
  getSessions: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<ChatSession[]>('/v1/admin/monitoring/sessions', { params }),
  getToolCalls: (params?: { sessionId?: string; limit?: number }) =>
    apiClient.get<ToolCall[]>('/v1/admin/monitoring/tool-calls', { params }),
  getErrors: (params?: { resolved?: boolean; limit?: number }) =>
    apiClient.get<ErrorLog[]>('/v1/admin/monitoring/errors', { params }),
};

export const usersApi = {
  getAll: () => apiClient.get<AdminUser[]>('/v1/admin/users'),
  getById: (userId: string) => apiClient.get<AdminUser>(`/v1/admin/users/${userId}`),
  getUserSessions: (userId: string) =>
    apiClient.get<ChatSession[]>(`/v1/admin/users/${userId}/sessions`),
};

export const providersApi = {
  getAll: () => apiClient.get<ProviderConfig[]>('/v1/admin/providers'),
  getById: (providerId: string) => apiClient.get<ProviderConfig>(`/v1/admin/providers/${providerId}`),
  update: (providerId: string, config: Partial<ProviderConfig>) =>
    apiClient.put<ProviderConfig>(`/v1/admin/providers/${providerId}`, config),
  updateMappings: (providerId: string, mappings: ProviderMapping) =>
    apiClient.put<ProviderMapping>(`/v1/admin/providers/${providerId}/mappings`, mappings),
  getStats: (providerId: string) =>
    apiClient.get<ProviderStats>(`/v1/admin/providers/${providerId}/stats`),
  testConnection: (providerId: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/v1/admin/providers/${providerId}/test`),
  
  // Tool-level configuration
  updateToolConfig: (providerId: string, toolName: string, config: ToolConfig) =>
    apiClient.put<ToolConfig>(`/v1/admin/providers/${providerId}/tools/${toolName}/config`, config),

  // Enhanced tool configuration with API settings
  updateEnhancedToolConfig: (providerId: string, toolName: string, config: EnhancedToolConfig) =>
    apiClient.put<EnhancedToolConfig>(`/v1/admin/providers/${providerId}/tools/${toolName}/config`, config),

  // OpenAPI operations
  uploadOpenAPI: (providerId: string, content: string) =>
    apiClient.post<ProviderOpenAPI>(`/v1/admin/providers/${providerId}/openapi/upload`, { content }),
  downloadOpenAPI: (providerId: string) =>
    apiClient.get<string>(`/v1/admin/providers/${providerId}/openapi/download`, {
      responseType: 'text' as any
    }),

  // Tool Schema Management
  getToolSchema: (providerId: string, toolName: string, schemaType: 'request' | 'response') =>
    apiClient.get<ToolSchema>(`/v1/admin/providers/${providerId}/tools/${encodeURIComponent(toolName)}/schema?type=${schemaType}`),

  uploadToolSchema: (providerId: string, toolName: string, schemaType: 'request' | 'response', schema: object) =>
    apiClient.put<ToolSchema>(`/v1/admin/providers/${providerId}/tools/${encodeURIComponent(toolName)}/schema?type=${schemaType}`, { schema }),

  resetToolSchema: (providerId: string, toolName: string, schemaType: 'request' | 'response') =>
    apiClient.delete<void>(`/v1/admin/providers/${providerId}/tools/${encodeURIComponent(toolName)}/schema?type=${schemaType}`),

  getDefaultToolSchema: (toolName: string, schemaType: 'request' | 'response') =>
    apiClient.get<object>(`/v1/admin/tools/${encodeURIComponent(toolName)}/schema/default?type=${schemaType}`),

  // Tool Testing
  testToolEndpoint: (providerId: string, toolName: string, payload: any) =>
    apiClient.post<ToolTestResult>(`/v1/admin/providers/${providerId}/tools/${encodeURIComponent(toolName)}/test`, { payload }),

  // Provider Categories
  getCategories: (providerId: string) =>
    apiClient.get<ProviderCategory[]>(`/v1/admin/providers/${providerId}/categories`),
  updateCategories: (providerId: string, categoryIds: string[]) =>
    apiClient.put<ProviderCategory[]>(`/v1/admin/providers/${providerId}/categories`, { categoryIds }),
};

// ============================================
// Categories API (Predefined Categories)
// ============================================

export const categoriesApi = {
  getAll: () => apiClient.get<ProviderCategory[]>('/v1/admin/categories'),
  getById: (categoryId: string) => apiClient.get<ProviderCategory>(`/v1/admin/categories/${categoryId}`),
  create: (data: CreateCategoryDto) => apiClient.post<ProviderCategory>('/v1/admin/categories', data),
  update: (categoryId: string, data: UpdateCategoryDto) =>
    apiClient.put<ProviderCategory>(`/v1/admin/categories/${categoryId}`, data),
  delete: (categoryId: string) => apiClient.delete<void>(`/v1/admin/categories/${categoryId}`),
};

// ============================================
// UCP Tools API (Global Tool Management)
// ============================================

export const ucpToolsApi = {
  getAll: () => apiClient.get<UcpTool[]>('/v1/admin/ucp-tools'),
  getById: (toolId: string) => apiClient.get<UcpTool>(`/v1/admin/ucp-tools/${encodeURIComponent(toolId)}`),
  create: (data: CreateUcpToolDto) => apiClient.post<UcpTool>('/v1/admin/ucp-tools', data),
  update: (toolId: string, data: UpdateUcpToolDto) =>
    apiClient.put<UcpTool>(`/v1/admin/ucp-tools/${encodeURIComponent(toolId)}`, data),
  delete: (toolId: string) => apiClient.delete<void>(`/v1/admin/ucp-tools/${encodeURIComponent(toolId)}`),
  getReadableSchema: (toolId: string, schemaType: 'request' | 'response') =>
    apiClient.get<ReadableSchemaProperty[]>(`/v1/admin/ucp-tools/${encodeURIComponent(toolId)}/schema/readable?type=${schemaType}`),
};

// ============================================
// Agents API (Multi-Agent System)
// ============================================

export const agentsApi = {
  // Uses proxy configured in vite.config.ts: /admin/agents -> http://localhost:3001
  // VITE_ORCHESTRATOR_URL is set to http://localhost:5173 which proxies to 3001
  getAll: () => apiClient.orchestratorGet<AgentMetadata[]>('/admin/agents'),
};

export default apiClient;
