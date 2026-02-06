export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: any;
}

export interface StreamChunk {
  type: 'token' | 'tool_call' | 'done' | 'error' | 'cards' | 'comparison' | 'cart_updated' | 'order_created' | 'followups' | 'clarification';
  content?: string;
  toolCall?: {
    name: string;
    arguments: any;
  };
  error?: string;
  products?: any[];
  matrix?: Record<string, string[]>;
  cart?: any;
  order?: any;
  suggestions?: string[];
  question?: string;
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LLMProvider {
  name: 'openai' | 'claude' | 'gemini';
  generateResponse(
    messages: LLMMessage[],
    tools: LLMTool[],
    config: LLMConfig,
  ): AsyncGenerator<StreamChunk>;
  isAvailable(): boolean;
}
