import axios from 'axios';
import { Configuration } from '../types';

export const fetchAvailableModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Filter for chat models only
    const chatModels = response.data.data
      .filter((model: any) => {
        const id = model.id.toLowerCase();
        return (
          id.includes('gpt') && 
          !id.includes('instruct') && 
          (id.includes('turbo') || id.includes('gpt-4'))
        );
      })
      .map((model: any) => model.id)
      .sort();
    
    return chatModels;
  } catch (error) {
    console.error('Error fetching models:', error);
    
    // Return default models if API call fails
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
  }
};

export const validateConfiguration = async (config: Configuration) => {
  try {
    // Check API key format
    if (!config.apiKey.startsWith('sk-')) {
      return {
        isValid: false,
        message: 'API key should start with "sk-"',
      };
    }
    
    // Check if API key is valid by making a simple request
    const modelsResponse = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Check if the model is available
    const availableModels = modelsResponse.data.data.map((model: any) => model.id);
    let suggestedModel = null;
    
    if (!config.useAssistantApi && !availableModels.includes(config.model)) {
      // Try to find a similar model
      const modelPrefix = config.model.split('-')[0]; // e.g., 'gpt'
      const similarModels = availableModels.filter((m: string) => 
        m.startsWith(modelPrefix) && 
        (m.includes('turbo') || m.includes('gpt-4'))
      );
      
      if (similarModels.length > 0) {
        suggestedModel = similarModels[0];
      }
    }
    
    // Check if Assistants API is available
    let assistantsAvailable = true;
    if (config.useAssistantApi) {
      try {
        await axios.get('https://api.openai.com/v1/assistants', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
            'Content-Type': 'application/json',
          },
        });
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          assistantsAvailable = false;
        } else {
          throw error; // Re-throw other errors
        }
      }
    }
    
    return {
      isValid: true,
      suggestedModel,
      assistantsAvailable,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return {
          isValid: false,
          message: 'Invalid API key',
        };
      } else if (error.response?.status === 429) {
        return {
          isValid: false,
          message: 'Rate limit exceeded. Please try again later.',
        };
      }
    }
    
    return {
      isValid: false,
      message: error.message || 'Error validating configuration',
    };
  }
};

// Function to check if vector store is properly configured with assistant
export const checkVectorStoreConfiguration = async (config: Configuration) => {
  if (!config.apiKey || !config.assistantId || !config.vectorStoreId) {
    return {
      isConfigured: false,
      message: 'Missing required configuration (API key, Assistant ID, or Vector Store ID)',
    };
  }
  
  try {
    // First, check if the vector store exists and is accessible
    const vectorStoreResponse = await axios.get(`https://api.openai.com/v1/vector_stores/${config.vectorStoreId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
    });
    
    // Next, check if the assistant is configured with this vector store
    const assistantResponse = await axios.get(`https://api.openai.com/v1/assistants/${config.assistantId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
    });
    
    const assistant = assistantResponse.data;
    
    // Check if retrieval tool is enabled
    const hasRetrievalTool = assistant.tools && 
      assistant.tools.some((tool: any) => tool.type === 'retrieval');
    
    if (!hasRetrievalTool) {
      return {
        isConfigured: false,
        message: 'Assistant does not have retrieval tool enabled',
        fixInstructions: 'Update your assistant in the OpenAI dashboard to enable the retrieval tool',
      };
    }
    
    // Check if vector store is configured with the assistant
    const hasVectorStore = assistant.vector_store_ids && 
      assistant.vector_store_ids.includes(config.vectorStoreId);
    
    if (!hasVectorStore) {
      return {
        isConfigured: false,
        message: 'Assistant is not configured with the specified vector store',
        fixInstructions: 'Update your assistant in the OpenAI dashboard to include the vector store',
        assistantConfig: assistant,
      };
    }
    
    return {
      isConfigured: true,
      message: 'Vector store is properly configured with the assistant',
      vectorStore: vectorStoreResponse.data,
      assistantConfig: assistant,
    };
    
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        const resource = error.config?.url?.includes('vector_stores') 
          ? 'Vector store' 
          : 'Assistant';
        
        return {
          isConfigured: false,
          message: `${resource} not found`,
          error: error.response?.data,
        };
      } else if (error.response?.status === 401) {
        return {
          isConfigured: false,
          message: 'Authentication failed. Please check your API key.',
          error: error.response?.data,
        };
      }
    }
    
    return {
      isConfigured: false,
      message: error.message || 'Error checking vector store configuration',
      error,
    };
  }
};
