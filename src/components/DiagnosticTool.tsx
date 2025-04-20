import React, { useState } from 'react';
import { useAppStore } from '../store';
import { AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import axios from 'axios';
import { verifyAssistantConfiguration } from '../services/api';

const DiagnosticTool: React.FC = () => {
  const { activeConfiguration } = useAppStore();
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  const runDiagnostics = async () => {
    if (!activeConfiguration?.apiKey) {
      setStatus('error');
      setMessage('Missing API key');
      return;
    }

    try {
      setIsChecking(true);
      setStatus('loading');
      setMessage('Running diagnostics...');
      
      const results: any = {
        apiConnection: false,
        assistantConfiguration: null,
        threadCreation: false,
        vectorStoreConnection: false,
        fileSearchTool: false,
        issues: []
      };

      // 1. Check API connection
      try {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${activeConfiguration.apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        results.apiConnection = true;
        results.models = response.data.data.slice(0, 5); // Just get a few models for display
      } catch (error: any) {
        results.apiConnection = false;
        results.issues.push(`API connection failed: ${error.message}`);
      }

      // 2. Check Assistant configuration if using Assistant API
      if (activeConfiguration.useAssistantApi && activeConfiguration.assistantId) {
        try {
          const assistantCheck = await verifyAssistantConfiguration(activeConfiguration);
          results.assistantConfiguration = assistantCheck.assistant;
          results.fileSearchTool = assistantCheck.hasFileSearchTool;
          
          if (!assistantCheck.hasFileSearchTool) {
            results.issues.push('File search tool is not enabled on this assistant');
          }
          
          // Check vector store if specified
          if (activeConfiguration.vectorStoreId) {
            results.vectorStoreConnection = assistantCheck.vectorStoreAttached;
            
            if (!assistantCheck.vectorStoreAttached) {
              results.issues.push(`Vector store ${activeConfiguration.vectorStoreId} may not be properly attached to the assistant`);
            }
          }
        } catch (error: any) {
          results.assistantConfiguration = null;
          results.issues.push(`Assistant configuration check failed: ${error.message}`);
        }
      }

      // 3. Test thread creation
      try {
        const threadResponse = await axios.post('https://api.openai.com/v1/threads', {}, {
          headers: {
            'Authorization': `Bearer ${activeConfiguration.apiKey}`,
            'OpenAI-Beta': 'assistants=v2',
            'Content-Type': 'application/json',
          },
        });
        
        results.threadCreation = true;
        results.threadId = threadResponse.data.id;
        
        // Clean up the test thread
        try {
          await axios.delete(`https://api.openai.com/v1/threads/${threadResponse.data.id}`, {
            headers: {
              'Authorization': `Bearer ${activeConfiguration.apiKey}`,
              'OpenAI-Beta': 'assistants=v2',
              'Content-Type': 'application/json',
            },
          });
        } catch (cleanupError) {
          console.error('Error cleaning up test thread:', cleanupError);
        }
      } catch (error: any) {
        results.threadCreation = false;
        results.issues.push(`Thread creation failed: ${error.message}`);
      }

      // Set final results
      setDiagnosticResults(results);
      
      if (results.issues.length === 0) {
        setStatus('success');
        setMessage('All diagnostics passed successfully!');
      } else {
        setStatus('error');
        setMessage(`Found ${results.issues.length} issue(s) with your configuration.`);
      }
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      setStatus('error');
      setMessage(`Error running diagnostics: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-4">Assistant API Diagnostics</h2>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            disabled={isChecking || !activeConfiguration?.apiKey}
            className={`px-4 py-2 rounded-md ${
              isChecking || !activeConfiguration?.apiKey
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {isChecking ? (
              <RefreshCw className="animate-spin inline-block mr-2" size={16} />
            ) : null}
            Run Diagnostics
          </button>
        </div>
        
        {status !== 'idle' && (
          <div className={`p-3 rounded-md text-sm ${
            status === 'success' ? 'bg-green-900/50 border border-green-700 text-green-400' :
            status === 'error' ? 'bg-red-900/50 border border-red-700 text-red-400' :
            'bg-blue-900/50 border border-blue-700 text-blue-400'
          }`}>
            <div className="flex items-start gap-2">
              {status === 'success' ? (
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              ) : status === 'error' ? (
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              ) : (
                <RefreshCw size={16} className="mt-0.5 animate-spin flex-shrink-0" />
              )}
              <div>{message}</div>
            </div>
          </div>
        )}
        
        {diagnosticResults && (
          <div className="mt-4 space-y-4">
            {/* API Connection */}
            <div className="p-4 bg-gray-800 rounded-md">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                API Connection
                {diagnosticResults.apiConnection ? (
                  <CheckCircle size={16} className="ml-2 text-green-400" />
                ) : (
                  <AlertCircle size={16} className="ml-2 text-red-400" />
                )}
              </h3>
              
              {diagnosticResults.apiConnection ? (
                <p className="text-green-400">Successfully connected to OpenAI API</p>
              ) : (
                <p className="text-red-400">Failed to connect to OpenAI API</p>
              )}
            </div>
            
            {/* Assistant Configuration */}
            {activeConfiguration?.useAssistantApi && activeConfiguration?.assistantId && (
              <div className="p-4 bg-gray-800 rounded-md">
                <h3 className="text-lg font-bold mb-2 flex items-center">
                  Assistant Configuration
                  {diagnosticResults.assistantConfiguration ? (
                    <CheckCircle size={16} className="ml-2 text-green-400" />
                  ) : (
                    <AlertCircle size={16} className="ml-2 text-red-400" />
                  )}
                </h3>
                
                {diagnosticResults.assistantConfiguration ? (
                  <div>
                    <p className="text-green-400">Successfully retrieved assistant configuration</p>
                    <div className="mt-2 space-y-2">
                      <div>
                        <span className="text-gray-400">Name:</span> {diagnosticResults.assistantConfiguration.name || 'Unnamed Assistant'}
                      </div>
                      <div>
                        <span className="text-gray-400">Model:</span> {diagnosticResults.assistantConfiguration.model}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400">File Search Tool:</span>
                        {diagnosticResults.fileSearchTool ? (
                          <CheckCircle size={16} className="ml-2 text-green-400" />
                        ) : (
                          <AlertCircle size={16} className="ml-2 text-red-400" />
                        )}
                      </div>
                      
                      {activeConfiguration.vectorStoreId && (
                        <div className="flex items-center">
                          <span className="text-gray-400">Vector Store Connection:</span>
                          {diagnosticResults.vectorStoreConnection ? (
                            <CheckCircle size={16} className="ml-2 text-green-400" />
                          ) : (
                            <AlertCircle size={16} className="ml-2 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-red-400">Failed to retrieve assistant configuration</p>
                )}
              </div>
            )}
            
            {/* Thread Creation */}
            <div className="p-4 bg-gray-800 rounded-md">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Thread Creation
                {diagnosticResults.threadCreation ? (
                  <CheckCircle size={16} className="ml-2 text-green-400" />
                ) : (
                  <AlertCircle size={16} className="ml-2 text-red-400" />
                )}
              </h3>
              
              {diagnosticResults.threadCreation ? (
                <p className="text-green-400">Successfully created a test thread</p>
              ) : (
                <p className="text-red-400">Failed to create a test thread</p>
              )}
            </div>
            
            {/* Issues */}
            {diagnosticResults.issues.length > 0 && (
              <div className="p-4 bg-red-900/30 border border-red-800 rounded-md">
                <h3 className="text-lg font-bold mb-2 flex items-center">
                  Issues Found
                  <AlertCircle size={16} className="ml-2 text-red-400" />
                </h3>
                
                <ul className="list-disc pl-5 space-y-1">
                  {diagnosticResults.issues.map((issue: string, index: number) => (
                    <li key={index} className="text-red-300">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Recommendations */}
            <div className="p-4 bg-gray-800 rounded-md">
              <h3 className="text-lg font-bold mb-2 flex items-center">
                Recommendations
                <Info size={16} className="ml-2 text-cyan-400" />
              </h3>
              
              <ul className="list-disc pl-5 space-y-2">
                {!diagnosticResults.apiConnection && (
                  <li className="text-cyan-300">Check your API key and network connection</li>
                )}
                
                {activeConfiguration?.useAssistantApi && !diagnosticResults.fileSearchTool && (
                  <li className="text-cyan-300">Enable the file_search tool on your assistant using the File Search Configuration panel</li>
                )}
                
                {activeConfiguration?.vectorStoreId && !diagnosticResults.vectorStoreConnection && (
                  <li className="text-cyan-300">Verify that your vector store is properly attached to your assistant</li>
                )}
                
                {!diagnosticResults.threadCreation && (
                  <li className="text-cyan-300">Check your permissions and API access for thread creation</li>
                )}
                
                {diagnosticResults.issues.length === 0 && (
                  <li className="text-green-300">Your configuration looks good! No issues detected.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticTool;
