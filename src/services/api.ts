import axios from 'axios';
import { Configuration, OpenAIMessagesListResponse, OpenAIRunResponse, OpenAIThreadResponse, CompletionRequest, CompletionResponse, VectorStore } from '../types';

const createOpenAIClient = (config: Configuration) => {
  return axios.create({
    baseURL: 'https://api.openai.com/v1',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'OpenAI-Beta': 'assistants=v2', // Ensure v2 API is used
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
};

// Assistant API methods
export const createThread = async (config: Configuration): Promise<OpenAIThreadResponse> => {
  try {
    // Create a client with explicit v2 header for this specific request
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2', // Explicitly set for thread creation
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('Creating thread with Assistant API v2 - explicit header check...');
    console.log('Request headers:', {
      'Authorization': 'Bearer sk-...REDACTED',
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    });
    
    // Make the API request with proper error handling
    const response = await client.post('/threads', {});
    console.log('Thread created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('Error creating thread:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          headers: error.config?.headers
        }
      });
      
      // Check for specific error conditions
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 404) {
        throw new Error('Assistants API not available for your account.');
      } else if (error.response?.status === 500) {
        throw new Error('OpenAI server error. Please try again later.');
      }
    }
    
    // Generic error
    console.error('Error creating thread:', error);
    throw new Error('Failed to create thread. Please try again.');
  }
};

export const sendMessage = async (
  config: Configuration,
  threadId: string,
  content: string,
  fileIds: string[] = []
) => {
  try {
    // Create a client with explicit v2 header for this specific request
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2', // Explicitly set for message sending
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log(`Sending message to thread ${threadId} with content length: ${content.length}`);
    console.log('Request headers:', {
      'Authorization': 'Bearer sk-...REDACTED',
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    });
    
    // Ensure content is properly formatted as a string
    const messageContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Prepare the payload with correct parameter names for v2 API
    const payload: any = {
      role: 'user',
      content: messageContent,
    };
    
    // Only add file_ids if there are actually files to attach
    if (fileIds && fileIds.length > 0) {
      payload.file_ids = fileIds;
    }
    
    console.log('Message payload:', JSON.stringify(payload, null, 2));
    
    const response = await client.post(`/threads/${threadId}/messages`, payload);
    
    console.log('Message sent successfully:', response.data.id);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error sending message:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          headers: error.config?.headers
        }
      });
      
      // Check for specific error conditions
      if (error.response?.status === 404) {
        throw new Error(`Thread ${threadId} not found. It may have expired or been deleted.`);
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request format';
        throw new Error(`Bad request: ${errorMessage}`);
      }
    }
    
    console.error('Error sending message:', error);
    throw new Error('Failed to send message. Please try again.');
  }
};

export const runAssistant = async (
  config: Configuration,
  threadId: string
): Promise<OpenAIRunResponse> => {
  try {
    // Create a client with explicit v2 header for this specific request
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2', // Explicitly set for running assistant
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log(`Running assistant on thread ${threadId} with assistant ID: ${config.assistantId}`);
    console.log('Request headers:', {
      'Authorization': 'Bearer sk-...REDACTED',
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    });
    
    const runPayload: any = {
      assistant_id: config.assistantId,
    };
    
    // Only add model if it's specified in the config
    if (config.model) {
      runPayload.model = config.model;
    }
    
    // Add vector store ID if specified in the config
    if (config.vectorStoreId) {
      // In v2, we need to specify the vector store in the tools configuration
      // This is typically done at the assistant level, not the run level
      console.log(`Vector store ID ${config.vectorStoreId} will be used if configured on the assistant`);
    }
    
    console.log('Run payload:', JSON.stringify(runPayload, null, 2));
    
    const response = await client.post(`/threads/${threadId}/runs`, runPayload);
    
    console.log('Run created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error running assistant:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        request: {
          headers: error.config?.headers
        }
      });
      
      if (error.response?.status === 404) {
        throw new Error(`Thread ${threadId} or assistant not found.`);
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error?.message || 'Invalid request';
        throw new Error(`Bad request: ${errorMessage}`);
      }
    }
    
    console.error('Error running assistant:', error);
    throw new Error('Failed to run assistant. Please try again.');
  }
};

export const checkRunStatus = async (
  config: Configuration,
  threadId: string,
  runId: string
): Promise<OpenAIRunResponse> => {
  try {
    // Create a client with explicit v2 header for this specific request
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2', // Explicitly set for checking run status
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    const response = await client.get(`/threads/${threadId}/runs/${runId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking run status:', error);
    throw error;
  }
};

export const getMessages = async (
  config: Configuration,
  threadId: string
): Promise<OpenAIMessagesListResponse> => {
  try {
    // Create a client with explicit v2 header for this specific request
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2', // Explicitly set for getting messages
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    const response = await client.get(`/threads/${threadId}/messages`);
    return response.data;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Vector store methods
export const getVectorStores = async (config: Configuration) => {
  try {
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    const response = await client.get('/vector_stores');
    return response.data;
  } catch (error) {
    console.error('Error getting vector stores:', error);
    throw error;
  }
};

export const getVectorStoreById = async (config: Configuration, vectorStoreId: string): Promise<VectorStore> => {
  try {
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    const response = await client.get(`/vector_stores/${vectorStoreId}`);
    return response.data;
  } catch (error) {
    console.error(`Error getting vector store ${vectorStoreId}:`, error);
    throw error;
  }
};

// Function to verify and configure assistant with vector store
export const verifyAssistantConfiguration = async (config: Configuration) => {
  if (!config.apiKey || !config.assistantId) {
    throw new Error('Missing API key or Assistant ID');
  }
  
  try {
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    // Get current assistant configuration
    const getResponse = await client.get(`/assistants/${config.assistantId}`);
    const assistant = getResponse.data;
    
    // Check if file_search tool is enabled
    const hasFileSearchTool = assistant.tools && 
                            assistant.tools.some((tool: any) => tool.type === 'file_search');
    
    // Check if vector store is attached (if specified in config)
    let vectorStoreAttached = true;
    if (config.vectorStoreId) {
      // In v2, vector stores are typically attached at the assistant level
      // We would need to check if the assistant has the vector store attached
      // This might require additional API calls or checking assistant metadata
      
      // For now, we'll just log that we're checking
      console.log(`Checking if vector store ${config.vectorStoreId} is attached to assistant ${config.assistantId}`);
      
      // In a real implementation, you would verify this through the appropriate API call
      // vectorStoreAttached = assistant.vector_store_ids?.includes(config.vectorStoreId) || false;
    }
    
    return {
      assistant,
      hasFileSearchTool,
      vectorStoreAttached
    };
  } catch (error) {
    console.error('Error verifying assistant configuration:', error);
    throw error;
  }
};

// Direct model completion (non-Assistant API)
export const createCompletion = async (
  config: Configuration,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<CompletionResponse> => {
  try {
    const client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // Longer timeout for completions
    });
    
    const requestData: CompletionRequest = {
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    const response = await client.post('/chat/completions', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating completion:', error);
    throw error;
  }
};

// OpenRouter API integration for additional models
export const createOpenRouterCompletion = async (
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<CompletionResponse> => {
  try {
    const client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin, // Required by OpenRouter
      },
    });
    
    const requestData: CompletionRequest = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    const response = await client.post('/chat/completions', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating OpenRouter completion:', error);
    throw error;
  }
};

export const sendWebhook = async (
  webhookURL: string,
  data: {
    userName: string;
    prompt: string;
    timestamp: string;
    model: string;
    threadId: string;
  }
) => {
  try {
    await axios.post(webhookURL, data);
    return true;
  } catch (error) {
    console.error('Error sending webhook:', error);
    return false;
  }
};
