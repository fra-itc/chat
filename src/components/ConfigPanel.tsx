import React, { useState, useEffect } from 'react';
import { Save, Trash2, Check, AlertCircle, RefreshCw, Info, Download, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { Configuration } from '../types';
import { fetchAvailableModels, validateConfiguration } from '../services/modelSelection';
import { runAssistantDiagnostics, validateAssistantId } from '../services/assistantDiagnostics';

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        className="flex items-center w-full text-left px-2 py-2 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={18} className="mr-2" /> : <ChevronRight size={18} className="mr-2" />}
        <span className="font-semibold text-cyan-300">{title}</span>
      </button>
      {open && <div className="mt-2 px-2">{children}</div>}
    </div>
  );
};

const ConfigPanel: React.FC = () => {
  const { 
    configurations, 
    activeConfiguration, 
    addConfiguration, 
    updateConfiguration, 
    deleteConfiguration, 
    setActiveConfiguration 
  } = useAppStore();
  
  const [config, setConfig] = useState<Configuration>({
    id: '',
    apiKey: '',
    assistantId: '',
    vectorStoreId: '',
    model: 'gpt-3.5-turbo',
    isDefault: false,
    name: '',
    webhookURL: '',
    useAssistantApi: true
  });
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | 'warning' | ''>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [availableVectorStores, setAvailableVectorStores] = useState<{id: string, name: string}[]>([]);
  const [isLoadingVectorStores, setIsLoadingVectorStores] = useState(false);
  const [customVectorStoreId, setCustomVectorStoreId] = useState('');
  const [customVectorStoreName, setCustomVectorStoreName] = useState('');
  const [showCustomVectorStore, setShowCustomVectorStore] = useState(false);
  
  // Initialize form with active configuration
  useEffect(() => {
    if (activeConfiguration) {
      setConfig(activeConfiguration);
      setIsEditing(true);
      
      // If the configuration has an API key, fetch available models and vector stores
      if (activeConfiguration.apiKey && activeConfiguration.apiKey.length > 20) {
        fetchAvailableModels(activeConfiguration.apiKey).then(models => {
          setAvailableModels(models);
        });
        
        fetchVectorStores(activeConfiguration.apiKey);
      }
    } else {
      resetForm();
      setIsEditing(false);
    }
  }, [activeConfiguration]);
  
  const resetForm = () => {
    setConfig({
      id: '',
      apiKey: '',
      assistantId: '',
      vectorStoreId: '',
      model: 'gpt-3.5-turbo',
      isDefault: configurations.length === 0, // First config is default
      name: `Configuration ${configurations.length + 1}`,
      webhookURL: '',
      useAssistantApi: true
    });
    setValidationMessage('');
    setValidationStatus('');
    setDiagnosticResults(null);
    setCustomVectorStoreId('');
    setCustomVectorStoreName('');
    setShowCustomVectorStore(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig({ ...config, [name]: checked });
    } else {
      setConfig({ ...config, [name]: value });
    }
    
    // Clear validation when editing
    setValidationMessage('');
    setValidationStatus('');
  };
  
  const handleApiKeyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = e.target.value;
    setConfig({ ...config, apiKey });
    
    // Only fetch models if API key is reasonably long
    if (apiKey.length > 20 && apiKey.startsWith('sk-')) {
      try {
        setIsLoading(true);
        const models = await fetchAvailableModels(apiKey);
        setAvailableModels(models);
        
        // Also fetch vector stores
        await fetchVectorStores(apiKey);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching models:', error);
        setIsLoading(false);
      }
    }
  };
  
  const fetchVectorStores = async (apiKey: string) => {
    try {
      setIsLoadingVectorStores(true);
      
      // Create a client with explicit v2 header for this specific request
      const response = await fetch('https://api.openai.com/v1/vector_stores', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vector stores: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Format the vector stores for the dropdown
      const stores = data.data.map((store: any) => ({
        id: store.id,
        name: store.name || store.id
      }));
      
      setAvailableVectorStores(stores);
    } catch (error) {
      console.error('Error fetching vector stores:', error);
      // If we can't fetch vector stores, set an empty array
      setAvailableVectorStores([]);
    } finally {
      setIsLoadingVectorStores(false);
    }
  };
  
  const handleAssistantIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const assistantId = e.target.value;
    setConfig({ ...config, assistantId });
    
    // Validate assistant ID format
    if (assistantId && !assistantId.startsWith('asst_')) {
      setValidationMessage('Assistant ID should start with "asst_"');
      setValidationStatus('warning');
    } else {
      setValidationMessage('');
      setValidationStatus('');
    }
  };
  
  const handleVectorStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    // If "custom" is selected, show the custom vector store input fields
    if (value === "custom") {
      setShowCustomVectorStore(true);
      // Don't update the config yet, wait for the custom ID to be entered
    } else {
      setShowCustomVectorStore(false);
      setConfig({ ...config, vectorStoreId: value });
    }
  };
  
  const handleCustomVectorStoreSubmit = () => {
    if (customVectorStoreId) {
      // Update the config with the custom vector store ID
      setConfig({ ...config, vectorStoreId: customVectorStoreId });
      
      // Add the custom vector store to the available vector stores list
      if (!availableVectorStores.some(store => store.id === customVectorStoreId)) {
        setAvailableVectorStores([
          ...availableVectorStores,
          {
            id: customVectorStoreId,
            name: customVectorStoreName || `Custom Store (${customVectorStoreId})`
          }
        ]);
      }
      
      // Hide the custom vector store input fields
      setShowCustomVectorStore(false);
    } else {
      setValidationMessage('Vector Store ID is required');
      setValidationStatus('error');
    }
  };
  
  const validateAndSave = async () => {
    if (!config.apiKey) {
      setValidationMessage('API Key is required');
      setValidationStatus('error');
      return;
    }
    
    if (!config.name) {
      setValidationMessage('Name is required');
      setValidationStatus('error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Validate configuration
      const validationResult = await validateConfiguration(config);
      
      if (!validationResult.isValid) {
        setValidationMessage(validationResult.message || 'Invalid configuration');
        setValidationStatus('error');
        setIsLoading(false);
        return;
      }
      
      // If using Assistant API, validate Assistant ID
      if (config.useAssistantApi && config.assistantId) {
        const assistantValidation = await validateAssistantId(config.apiKey, config.assistantId);
        
        if (!assistantValidation.isValid || !assistantValidation.exists) {
          setValidationMessage(assistantValidation.message);
          setValidationStatus('error');
          setIsLoading(false);
          return;
        }
      }
      
      // If we have a suggested model, update the config
      if (validationResult.suggestedModel) {
        setConfig(prev => ({ ...prev, model: validationResult.suggestedModel! }));
      }
      
      // If assistants API is not available but user wants to use it, show warning
      if (config.useAssistantApi && validationResult.assistantsAvailable === false) {
        setValidationMessage('Your API key does not have access to the Assistants API. Direct completion will be used instead.');
        setValidationStatus('warning');
        setConfig(prev => ({ ...prev, useAssistantApi: false }));
      }
      
      // Save configuration
      if (isEditing && config.id) {
        updateConfiguration(config);
      } else {
        addConfiguration(config);
      }
      
      setValidationMessage('Configuration saved successfully');
      setValidationStatus('success');
      
      // Reset form if not editing
      if (!isEditing) {
        resetForm();
      }
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      setValidationMessage(error.message || 'Error saving configuration');
      setValidationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (!config.id) return;
    
    if (confirm('Are you sure you want to delete this configuration?')) {
      deleteConfiguration(config.id);
      resetForm();
    }
  };
  
  const handleCancel = () => {
    if (activeConfiguration) {
      setConfig(activeConfiguration);
    } else {
      resetForm();
    }
    setIsEditing(!!activeConfiguration);
  };
  
  const runDiagnostics = async () => {
    if (!config.apiKey) {
      setValidationMessage('API Key is required for diagnostics');
      setValidationStatus('error');
      return;
    }
    
    try {
      setIsRunningDiagnostics(true);
      const results = await runAssistantDiagnostics(config);
      setDiagnosticResults(results);
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      setValidationMessage(error.message || 'Error running diagnostics');
      setValidationStatus('error');
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const exportConfigurations = () => {
    if (configurations.length === 0) {
      setValidationMessage('No configurations to export');
      setValidationStatus('warning');
      return;
    }
    
    const dataStr = JSON.stringify(configurations, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = 'assistant-configurations.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importConfigurations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedConfigs = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(importedConfigs)) {
          throw new Error('Invalid configuration format');
        }
        
        // Validate each configuration
        importedConfigs.forEach((config) => {
          if (!config.id || !config.name || !config.apiKey) {
            throw new Error('One or more configurations are invalid');
          }
        });
        
        // Add each configuration
        importedConfigs.forEach((config) => {
          // Check if configuration already exists
          const exists = configurations.some((c) => c.id === config.id);
          if (!exists) {
            addConfiguration(config);
          } else {
            // Update existing configuration
            updateConfiguration(config);
          }
        });
        
        setValidationMessage(`Successfully imported ${importedConfigs.length} configurations`);
        setValidationStatus('success');
      } catch (error: any) {
        console.error('Error importing configurations:', error);
        setValidationMessage(error.message || 'Error importing configurations');
        setValidationStatus('error');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    e.target.value = '';
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">
          {isEditing ? 'Edit Configuration' : 'New Configuration'}
        </h2>
      </div>
      
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <CollapsibleSection title="Authentication" defaultOpen>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              name="apiKey"
              value={config.apiKey}
              onChange={handleApiKeyChange}
              className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="sk-..."
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="General" defaultOpen>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Configuration Name
            </label>
            <input
              type="text"
              name="name"
              value={config.name}
              onChange={handleInputChange}
              className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="My Configuration"
            />
          </div>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              checked={config.isDefault}
              onChange={(e) => setConfig({ ...config, isDefault: e.target.checked })}
              className="mr-2 bg-gray-800 rounded"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-gray-300">
              Set as default configuration
            </label>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Assistant API & Model" defaultOpen>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useAssistantApi"
              name="useAssistantApi"
              checked={config.useAssistantApi}
              onChange={(e) => setConfig({ ...config, useAssistantApi: e.target.checked })}
              className="mr-2 bg-gray-800 rounded"
            />
            <label htmlFor="useAssistantApi" className="text-sm font-medium text-gray-300">
              Use Assistant API (requires Assistant ID)
            </label>
          </div>
          {/* Model selection - only show when not using Assistant API */}
          {!config.useAssistantApi && (
            <div className="transition-all duration-300 mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Model
              </label>
              <select
                name="model"
                value={config.model}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="gpt-4">gpt-4</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    <option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</option>
                    <option value="claude-3-opus">claude-3-opus</option>
                    <option value="claude-3-sonnet">claude-3-sonnet</option>
                    <option value="claude-3-haiku">claude-3-haiku</option>
                  </>
                )}
              </select>
              <div className="mt-1 text-xs text-gray-400">
                Model selection is available when not using an assistant.
              </div>
            </div>
          )}
          {/* Assistant ID - only show when using Assistant API */}
          {config.useAssistantApi && (
            <div className="transition-all duration-300 mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Assistant ID
              </label>
              <input
                type="text"
                name="assistantId"
                value={config.assistantId}
                onChange={handleAssistantIdChange}
                className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="asst_..."
              />
              <div className="mt-1 text-xs text-gray-400">
                The Assistant ID from your OpenAI dashboard (starts with "asst_").
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="File Handling & Vector Store">
          {/* Vector Store - only show when using Assistant API */}
          {config.useAssistantApi && (
            <div className="transition-all duration-300">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Vector Store
              </label>
              <select
                name="vectorStoreId"
                value={showCustomVectorStore ? "custom" : config.vectorStoreId}
                onChange={handleVectorStoreChange}
                className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={isLoadingVectorStores}
              >
                <option value="">None (No Vector Store)</option>
                {availableVectorStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
                <option value="custom">Enter Custom Vector Store ID...</option>
              </select>
              
              {showCustomVectorStore && (
                <div className="mt-2 p-3 border border-gray-700 rounded-md bg-gray-800/50">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Custom Vector Store ID
                    </label>
                    <input
                      type="text"
                      value={customVectorStoreId}
                      onChange={(e) => setCustomVectorStoreId(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="vs_..."
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customVectorStoreName}
                      onChange={(e) => setCustomVectorStoreName(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="My Vector Store"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCustomVectorStoreSubmit}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded-md text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomVectorStore(false);
                        setConfig({ ...config, vectorStoreId: "" });
                      }}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {isLoadingVectorStores && (
                <div className="mt-1 text-sm text-gray-400 flex items-center">
                  <RefreshCw className="animate-spin mr-1" size={14} />
                  Loading vector stores...
                </div>
              )}
              
              <div className="mt-1 text-xs text-gray-400 flex items-start gap-1">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>
                  Vector stores allow your assistant to search through your documents for relevant information.
                  {!showCustomVectorStore && " Select 'Enter Custom Vector Store ID' if yours isn't listed."}
                </span>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Webhook & Import/Export">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Webhook URL (Optional)
            </label>
            <input
              type="text"
              name="webhookURL"
              value={config.webhookURL}
              onChange={handleInputChange}
              className="w-full bg-gray-800 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={exportConfigurations}
              className="flex-1 p-2 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white"
            >
              <Download size={20} className="mx-auto" />
              <span className="text-sm">Export</span>
            </button>
            
            <label className="flex-1 cursor-pointer">
              <div className="p-2 rounded-md bg-indigo-700 hover:bg-indigo-600 text-white text-center">
                <Upload size={20} className="mx-auto" />
                <span className="text-sm">Import</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={importConfigurations}
                className="hidden"
              />
            </label>
          </div>
        </CollapsibleSection>

        {validationMessage && (
          <div className={`p-3 rounded-md text-sm ${
            validationStatus === 'success' ? 'bg-green-900/50 border border-green-700 text-green-400' :
            validationStatus === 'warning' ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-400' :
            'bg-red-900/50 border border-red-700 text-red-400'
          }`}>
            <div className="flex items-start gap-2">
              {validationStatus === 'success' ? (
                <Check size={16} className="mt-0.5 flex-shrink-0" />
              ) : validationStatus === 'warning' ? (
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              )}
              <div>{validationMessage}</div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={validateAndSave}
            disabled={isLoading}
            className={`flex-1 p-2 rounded-md ${
              isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {isLoading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : <Save size={20} className="mx-auto" />}
            <span className="text-sm">{isEditing ? 'Update' : 'Save'}</span>
          </button>
          
          {isEditing && (
            <button
              onClick={handleDelete}
              className="flex-1 p-2 rounded-md bg-red-900 hover:bg-red-800 text-white"
            >
              <Trash2 size={20} className="mx-auto" />
              <span className="text-sm">Delete</span>
            </button>
          )}
          
          <button
            onClick={handleCancel}
            className="flex-1 p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
          >
            <span className="text-sm">Cancel</span>
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={runDiagnostics}
            disabled={isRunningDiagnostics || !config.apiKey}
            className={`w-full p-2 rounded-md ${
              isRunningDiagnostics || !config.apiKey
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {isRunningDiagnostics ? (
              <RefreshCw className="animate-spin inline-block mr-2" size={16} />
            ) : null}
            Run Assistant API Diagnostics
          </button>
        </div>
        
        {diagnosticResults && (
          <div className="mt-4 p-4 bg-gray-800 rounded-md">
            <h3 className="text-lg font-bold mb-2">Diagnostic Results</h3>
            
            <div className="space-y-2">
              {diagnosticResults.diagnosticMessages.map((message: string, index: number) => (
                <div key={index} className="text-sm">{message}</div>
              ))}
              
              {diagnosticResults.recommendations.length > 0 && (
                <>
                  <h4 className="text-md font-bold mt-4 mb-2">Recommendations</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {diagnosticResults.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-sm text-cyan-400">{rec}</li>
                    ))}
                  </ul>
                </>
              )}
              
              {diagnosticResults.threadCreationWorks && (
                <div className="mt-4 p-2 bg-green-900/50 border border-green-700 rounded-md text-green-400 text-sm">
                  Thread creation is working correctly! The issue might be elsewhere in your application.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Saved Configurations</h3>
        {configurations.length === 0 ? (
          <p className="text-sm text-gray-500">No configurations saved yet</p>
        ) : (
          <ul className="space-y-2">
            {configurations.map((c) => (
              <li key={c.id} className="text-sm">
                <button
                  onClick={() => setActiveConfiguration(c)}
                  className={`w-full text-left p-2 rounded-md ${
                    activeConfiguration?.id === c.id
                      ? 'bg-cyan-900/30 border border-cyan-800'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {c.useAssistantApi ? 'Assistant API' : 'Direct Completion'} • {c.model}
                    {c.vectorStoreId && ' • Vector Store'}
                  </div>
                  {c.isDefault && (
                    <span className="text-xs bg-cyan-900 text-cyan-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                      Default
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
