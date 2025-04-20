import React, { useState } from 'react';
import { useAppStore } from '../store';
import { AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import axios from 'axios';

const AssistantRetrieval: React.FC = () => {
  const { activeConfiguration, updateConfiguration } = useAppStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [assistantDetails, setAssistantDetails] = useState<any>(null);

  const checkAssistantTools = async () => {
    if (!activeConfiguration?.apiKey || !activeConfiguration?.assistantId) {
      setStatus('error');
      setMessage('Missing API key or Assistant ID');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Checking assistant configuration...');

      const response = await axios.get(`https://api.openai.com/v1/assistants/${activeConfiguration.assistantId}`, {
        headers: {
          'Authorization': `Bearer ${activeConfiguration.apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json',
        },
      });

      const assistant = response.data;
      setAssistantDetails(assistant);

      // Check if file_search tool is enabled (previously was checking for 'retrieval')
      const hasFileSearchTool = assistant.tools && assistant.tools.some((tool: any) => tool.type === 'file_search');
      
      if (hasFileSearchTool) {
        setStatus('success');
        setMessage('File search tool is enabled on this assistant.');
      } else {
        setStatus('error');
        setMessage('File search tool is not enabled on this assistant.');
      }
    } catch (error: any) {
      console.error('Error checking assistant:', error);
      setStatus('error');
      setMessage(`Error checking assistant: ${error.response?.data?.error?.message || error.message}`);
    }
  };

  const enableFileSearchTool = async () => {
    if (!activeConfiguration?.apiKey || !activeConfiguration?.assistantId) {
      setStatus('error');
      setMessage('Missing API key or Assistant ID');
      return;
    }

    try {
      setIsUpdating(true);
      setStatus('loading');
      setMessage('Enabling file search tool...');

      // Get current assistant configuration
      const getResponse = await axios.get(`https://api.openai.com/v1/assistants/${activeConfiguration.assistantId}`, {
        headers: {
          'Authorization': `Bearer ${activeConfiguration.apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json',
        },
      });

      const assistant = getResponse.data;
      
      // Prepare tools array, ensuring we keep existing tools
      const currentTools = assistant.tools || [];
      const hasFileSearchTool = currentTools.some((tool: any) => tool.type === 'file_search');
      
      let updatedTools;
      if (!hasFileSearchTool) {
        // Add file_search tool (instead of 'retrieval')
        updatedTools = [...currentTools, { type: 'file_search' }];
      } else {
        updatedTools = currentTools;
      }

      // Update the assistant - only update the tools array
      const updateResponse = await axios.post(`https://api.openai.com/v1/assistants/${activeConfiguration.assistantId}`, {
        tools: updatedTools,
      }, {
        headers: {
          'Authorization': `Bearer ${activeConfiguration.apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json',
        },
      });

      const updatedAssistant = updateResponse.data;
      setAssistantDetails(updatedAssistant);

      // Verify the update was successful
      const updatedHasFileSearchTool = updatedAssistant.tools && 
                                     updatedAssistant.tools.some((tool: any) => tool.type === 'file_search');
      
      if (updatedHasFileSearchTool) {
        setStatus('success');
        setMessage('File search tool enabled successfully!');
      } else {
        setStatus('error');
        setMessage('Failed to enable file search tool. Please check the assistant details.');
      }
    } catch (error: any) {
      console.error('Error updating assistant:', error);
      setStatus('error');
      setMessage(`Error updating assistant: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-4">Assistant File Search Configuration</h2>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={checkAssistantTools}
            disabled={status === 'loading' || !activeConfiguration?.assistantId}
            className={`px-4 py-2 rounded-md ${
              status === 'loading' || !activeConfiguration?.assistantId
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {status === 'loading' ? (
              <RefreshCw className="animate-spin inline-block mr-2" size={16} />
            ) : null}
            Check File Search Status
          </button>
          
          <button
            onClick={enableFileSearchTool}
            disabled={isUpdating || status === 'loading' || !activeConfiguration?.assistantId}
            className={`px-4 py-2 rounded-md ${
              isUpdating || status === 'loading' || !activeConfiguration?.assistantId
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-700 hover:bg-cyan-600 text-white'
            }`}
          >
            {isUpdating ? (
              <RefreshCw className="animate-spin inline-block mr-2" size={16} />
            ) : null}
            Enable File Search Tool
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
        
        {assistantDetails && (
          <div className="mt-4 p-4 bg-gray-800 rounded-md">
            <h3 className="text-lg font-bold mb-2">Assistant Details</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">Name:</span> {assistantDetails.name || 'Unnamed Assistant'}
              </div>
              
              <div>
                <span className="text-gray-400">Model:</span> {assistantDetails.model}
              </div>
              
              <div>
                <span className="text-gray-400">Tools:</span>
                <ul className="list-disc pl-5 mt-1">
                  {assistantDetails.tools && assistantDetails.tools.length > 0 ? (
                    assistantDetails.tools.map((tool: any, index: number) => (
                      <li key={index} className={tool.type === 'file_search' ? 'text-green-400' : ''}>
                        {tool.type} {tool.type === 'file_search' && '✓'}
                      </li>
                    ))
                  ) : (
                    <li className="text-red-400">No tools configured</li>
                  )}
                </ul>
              </div>
              
              {assistantDetails.file_ids && (
                <div>
                  <span className="text-gray-400">Files:</span>
                  <ul className="list-disc pl-5 mt-1">
                    {assistantDetails.file_ids && assistantDetails.file_ids.length > 0 ? (
                      assistantDetails.file_ids.map((id: string, index: number) => (
                        <li key={index}>{id}</li>
                      ))
                    ) : (
                      <li className="text-yellow-400">No files attached to this assistant</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-gray-800 rounded-md">
          <h3 className="text-lg font-bold mb-2">How File Search Works</h3>
          
          <div className="space-y-3 text-sm">
            <p className="flex items-start gap-2">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" />
              <span>
                For document search to work with the OpenAI Assistants API, you need:
              </span>
            </p>
            
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>File search tool enabled</strong> on your assistant
                <div className="text-gray-400 ml-2">This allows the assistant to search through documents</div>
              </li>
              <li>
                <strong>Files uploaded</strong> to your assistant or thread
                <div className="text-gray-400 ml-2">The assistant can only search through files that have been uploaded</div>
              </li>
            </ol>
            
            <div className="border-l-2 border-cyan-700 pl-3 py-1 mt-2">
              <p className="font-medium text-cyan-400">Important Notes:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>You must upload files to your assistant or thread through the OpenAI dashboard or API</li>
                <li>The assistant will only search through files that have been uploaded</li>
                <li>Changes to assistant configuration may take a few minutes to propagate</li>
                <li>The OpenAI API now uses 'file_search' instead of 'retrieval' for document search functionality</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantRetrieval;
