export interface Configuration {
  id?: string;
  apiKey: string;
  assistantId: string;
  vectorStoreId: string;
  model: string;
  isDefault: boolean;
  name: string;
  webhookURL: string;
  useAssistantApi: boolean; // New field to make assistant functionality optional
}

export interface Thread {
  threadId: string;
  name: string;
  createdAt: string;
  lastUpdated: string;
  isActive: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
}

export interface Message {
  id?: string;
  threadId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  attachments: Attachment[];
}

export interface OpenAIThreadResponse {
  id: string;
  object: string;
  created_at: number;
  metadata: Record<string, any>;
}

export interface OpenAIMessageResponse {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: string;
    text?: {
      value: string;
      annotations: any[];
    };
  }>;
  file_ids: string[];
  assistant_id: string | null;
  run_id: string | null;
  metadata: Record<string, any>;
}

export interface OpenAIRunResponse {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'requires_action' | 'failed' | 'cancelled' | 'expired';
  started_at: number | null;
  completed_at: number | null;
  model: string;
  instructions: string | null;
  tools: any[];
  file_ids: string[];
  metadata: Record<string, any>;
}

export interface OpenAIMessagesListResponse {
  object: string;
  data: OpenAIMessageResponse[];
  first_id: string;
  last_id: string;
  has_more: boolean;
}

// New interfaces for direct model completion
export interface CompletionRequest {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface VectorStore {
  id: string;
  name: string;
  created_at: number;
  object: string;
  file_counts: {
    total_count: number;
    pending_count: number;
    active_count: number;
    failed_count: number;
  };
}
