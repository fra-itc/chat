import axios from 'axios';
import { Configuration } from '../types';

export const validateAssistantId = async (apiKey: string, assistantId: string) => {
  try {
    const response = await axios.get(`https://api.openai.com/v1/assistants/${assistantId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
    });
    
    return {
      isValid: true,
      exists: true,
      message: 'Assistant ID is valid',
      data: response.data,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          isValid: false,
          exists: false,
          message: 'Assistant ID not found. Please check the ID and try again.',
        };
      } else if (error.response?.status === 401) {
        return {
          isValid: false,
          exists: false,
          message: 'Authentication failed. Please check your API key.',
        };
      }
    }
    
    return {
      isValid: false,
      exists: false,
      message: 'Error validating Assistant ID',
    };
  }
};

export const validateVectorStoreId = async (apiKey: string, vectorStoreId: string) => {
  if (!vectorStoreId) {
    return {
      isValid: true,
      exists: false,
      message: 'No Vector Store ID provided',
    };
  }
  
  try {
    const response = await axios.get(`https://api.openai.com/v1/vector_stores/${vectorStoreId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
    });
    
    return {
      isValid: true,
      exists: true,
      message: 'Vector Store ID is valid',
      data: response.data,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return {
          isValid: false,
          exists: false,
          message: 'Vector Store ID not found. Please check the ID and try again.',
        };
      } else if (error.response?.status === 401) {
        return {
          isValid: false,
          exists: false,
          message: 'Authentication failed. Please check your API key.',
        };
      }
    }
    
    return {
      isValid: false,
      exists: false,
      message: 'Error validating Vector Store ID',
    };
  }
};

export const runAssistantDiagnostics = async (config: Configuration) => {
  const diagnosticMessages: string[] = [];
  const recommendations: string[] = [];
  let threadCreationWorks = false;
  
  // Check API key format
  if (!config.apiKey.startsWith('sk-')) {
    diagnosticMessages.push('❌ API key format is invalid. It should start with "sk-".');
    recommendations.push('Ensure your API key starts with "sk-" and is correctly copied from the OpenAI dashboard.');
    return { diagnosticMessages, recommendations, threadCreationWorks };
  }
  
  // Check API key validity
  try {
    diagnosticMessages.push('🔍 Testing API key validity...');
    
    const modelsResponse = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    diagnosticMessages.push('✅ API key is valid and can access the OpenAI API.');
    
    // Check if the model exists
    const availableModels = modelsResponse.data.data.map((model: any) => model.id);
    if (!config.useAssistantApi && !availableModels.includes(config.model)) {
      diagnosticMessages.push(`❌ Model "${config.model}" is not available for your API key.`);
      
      // Suggest an alternative model
      const suggestedModel = availableModels.find((m: string) => 
        (config.model.includes('gpt-4') && m.includes('gpt-4')) || 
        (config.model.includes('gpt-3.5') && m.includes('gpt-3.5'))
      );
      
      if (suggestedModel) {
        recommendations.push(`Use "${suggestedModel}" instead of "${config.model}".`);
      } else {
        recommendations.push('Check available models in your OpenAI account and select one that is accessible.');
      }
    } else if (!config.useAssistantApi) {
      diagnosticMessages.push(`✅ Model "${config.model}" is available.`);
    }
    
    // Check Assistants API access
    if (config.useAssistantApi) {
      diagnosticMessages.push('🔍 Testing Assistants API access...');
      
      try {
        const assistantsResponse = await axios.get('https://api.openai.com/v1/assistants', {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
            'Content-Type': 'application/json',
          },
        });
        
        diagnosticMessages.push('✅ Assistants API is accessible.');
        
        // Check if Assistant ID is provided and valid
        if (config.assistantId) {
          diagnosticMessages.push(`🔍 Validating Assistant ID: ${config.assistantId}...`);
          
          try {
            const assistantResponse = await axios.get(`https://api.openai.com/v1/assistants/${config.assistantId}`, {
              headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'OpenAI-Beta': 'assistants=v2',
                'Content-Type': 'application/json',
              },
            });
            
            diagnosticMessages.push('✅ Assistant ID is valid and accessible.');
            
            // Check if the assistant uses the same model as configured
            const assistantModel = assistantResponse.data.model;
            if (assistantModel !== config.model && config.model) {
              diagnosticMessages.push(`ℹ️ Assistant uses model "${assistantModel}".`);
            }
            
            // Check if vector store is configured
            if (config.vectorStoreId) {
              diagnosticMessages.push(`🔍 Checking Vector Store ID: ${config.vectorStoreId}...`);
              
              const vectorStoreValidation = await validateVectorStoreId(config.apiKey, config.vectorStoreId);
              
              if (vectorStoreValidation.isValid && vectorStoreValidation.exists) {
                diagnosticMessages.push('✅ Vector Store ID is valid and accessible.');
              } else {
                diagnosticMessages.push('❌ Vector Store ID is invalid or inaccessible.');
                recommendations.push('Check your Vector Store ID or create a new vector store in the OpenAI dashboard.');
                
                if (vectorStoreValidation.message) {
                  diagnosticMessages.push(`   ${vectorStoreValidation.message}`);
                }
              }
            } else {
              diagnosticMessages.push('ℹ️ No Vector Store configured. Assistant will not be able to search through documents.');
              recommendations.push('Consider adding a Vector Store to enable document search capabilities.');
            }
            
          } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
              diagnosticMessages.push('❌ Assistant ID not found.');
              recommendations.push('Check your Assistant ID or create a new assistant in the OpenAI dashboard.');
            } else {
              diagnosticMessages.push('❌ Error validating Assistant ID.');
              recommendations.push('Check your Assistant ID and ensure it is correctly formatted (should start with "asst_").');
            }
          }
        } else {
          diagnosticMessages.push('⚠️ No Assistant ID provided.');
          recommendations.push('Add an Assistant ID to use the Assistants API features.');
        }
        
        // Test thread creation
        diagnosticMessages.push('🔍 Testing thread creation...');
        
        try {
          const threadResponse = await axios.post('https://api.openai.com/v1/threads', {}, {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'OpenAI-Beta': 'assistants=v2',
              'Content-Type': 'application/json',
            },
          });
          
          diagnosticMessages.push('✅ Thread creation successful.');
          threadCreationWorks = true;
        } catch (error) {
          diagnosticMessages.push('❌ Thread creation failed.');
          recommendations.push('Check your API key permissions and ensure you have access to the Assistants API.');
        }
        
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          diagnosticMessages.push('❌ Assistants API is not available for your account.');
          recommendations.push('Upgrade your OpenAI plan or use direct completion instead of the Assistants API.');
        } else {
          diagnosticMessages.push('❌ Error accessing Assistants API.');
          recommendations.push('Check your API key and network connection.');
        }
      }
    } else {
      diagnosticMessages.push('ℹ️ Using direct completion mode (not using Assistants API).');
    }
    
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      diagnosticMessages.push('❌ API key is invalid or has expired.');
      recommendations.push('Generate a new API key in the OpenAI dashboard.');
    } else {
      diagnosticMessages.push('❌ Error connecting to OpenAI API.');
      recommendations.push('Check your network connection and firewall settings.');
    }
  }
  
  return { diagnosticMessages, recommendations, threadCreationWorks };
};
