import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Database } from 'lucide-react';
import { useAppStore } from '../store';
import { sendMessage, runAssistant, checkRunStatus, getMessages, sendWebhook, createCompletion } from '../services/api';
import { Message } from '../types';
import MessageBubble from './MessageBubble';

const ChatInterface: React.FC = () => {
  const { 
    activeThread, 
    activeConfiguration, 
    messages, 
    addMessage, 
    getThreadMessages,
    setLoading,
    isLoading,
    updateThread
  } = useAppStore();
  
  const [input, setInput] = useState('');
  const [fileAttachments, setFileAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const threadMessages = activeThread 
    ? getThreadMessages(activeThread.threadId)
    : [];
  
  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async () => {
    if (!input.trim() || !activeThread || !activeConfiguration) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Add user message to store
      const userMessage: Message = {
        threadId: activeThread.threadId,
        content: input,
        role: 'user',
        timestamp: new Date().toISOString(),
        attachments: [],
      };
      addMessage(userMessage);
      
      // Clear input and focus
      setInput('');
      setFileAttachments([]);
      
      // Determine// Continuing from where I left off in the ChatInterface.tsx file

      // Determine whether to use Assistant API or direct completion
      if (activeConfiguration.useAssistantApi && activeConfiguration.assistantId) {
        await handleAssistantWorkflow(input);
      } else {
        await handleDirectCompletionWorkflow(input);
      }
      
      inputRef.current?.focus();
      
    } catch (error: any) {
      console.error('Error in message workflow:', error);
      setError(error.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAssistantWorkflow = async (userInput: string) => {
    if (!activeConfiguration || !activeThread) {
      console.error('Missing configuration or active thread');
      return;
    }
    
    try {
      console.log('Starting Assistant API v2 workflow...'); 
      
      // Send message to API with explicit v2 header
      // Only pass file IDs if there are actually files to attach
      const fileIds = fileAttachments.length > 0 ? [] : undefined; // We'll implement file uploads later
      await sendMessage(
        activeConfiguration,
        activeThread.threadId,
        userInput,
        fileIds
      );
      
      // Run the assistant with explicit v2 header
      const runResponse = await runAssistant(
        activeConfiguration,
        activeThread.threadId
      );
      
      // Store the run ID for potential future reference
      setRunId(runResponse.id);
      
      // Poll for completion
      let runStatus = runResponse.status;
      let pollCount = 0;
      const maxPolls = 60; // Limit polling to prevent infinite loops
      
      while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'cancelled' && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await checkRunStatus(
          activeConfiguration,
          activeThread.threadId,
          runResponse.id
        );
        runStatus = statusResponse.status;
        pollCount++;
        
        console.log(`Run status check ${pollCount}: ${runStatus}`);
      }
      
      if (runStatus === 'completed') {
        // Get the latest messages with explicit v2 header
        const messagesResponse = await getMessages(
          activeConfiguration,
          activeThread.threadId
        );
        
        // Find the assistant's response (should be the most recent)
        const assistantMessage = messagesResponse.data.find(m => m.role === 'assistant');
        
        if (assistantMessage) {
          // Extract text content
          const content = assistantMessage.content
            .filter(c => c.type === 'text')
            .map(c => c.text?.value || '')
            .join('\n');
          
          // Add assistant message to store
          const newAssistantMessage: Message = {
            threadId: activeThread.threadId,
            content,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            attachments: [],
          };
          addMessage(newAssistantMessage);
          
          // Update thread name if it's the default name
          updateThreadNameIfNeeded(userInput);
          
          // Send webhook if configured
          sendWebhookIfConfigured(userInput);
        } else {
          const error = new Error('No assistant response found in the thread');
          console.error(error);
          throw error;
        }
      } else if (runStatus === 'failed') {
        const error = new Error('Assistant run failed. Please try again.');
        console.error(error);
        throw error;
      } else if (runStatus === 'cancelled') {
        const error = new Error('Assistant run was cancelled.');
        console.error(error);
        throw error;
      } else {
        const error = new Error('Assistant run timed out. Please try again.');
        console.error(error);
        throw error;
      }
    } catch (error) {
      console.error('Error in assistant workflow:', error);
      throw error; // Re-throw to be caught by the parent handler
    }
  };
  
  const handleDirectCompletionWorkflow = async (userInput: string) => {
    if (!activeConfiguration || !activeThread) {
      console.error('Missing configuration or active thread');
      return;
    }
    
    try {
      console.log('Starting direct completion workflow...');
      
      // Get conversation history for context
      const conversationHistory = threadMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Limit history to last 10 messages to avoid token limits
      const limitedHistory = conversationHistory.slice(-10);
      
      // Create completion request
      const response = await createCompletion(
        activeConfiguration,
        limitedHistory.concat([{ role: 'user', content: userInput }])
      );
      
      // Extract assistant's response
      const assistantResponse = response.choices[0]?.message?.content;
      
      if (assistantResponse) {
        // Add assistant message to store
        const newAssistantMessage: Message = {
          threadId: activeThread.threadId,
          content: assistantResponse,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          attachments: [],
        };
        addMessage(newAssistantMessage);
        
        // Update thread name if it's the default name
        updateThreadNameIfNeeded(userInput);
        
        // Send webhook if configured
        sendWebhookIfConfigured(userInput);
      } else {
        const error = new Error('No response received from the model');
        console.error(error);
        throw error;
      }
    } catch (error) {
      console.error('Error in direct completion workflow:', error);
      throw error; // Re-throw to be caught by the parent handler
    }
  };
  
  const updateThreadNameIfNeeded = (userInput: string) => {
    if (!activeThread) return;
    
    if (activeThread.name.startsWith('Thread ')) {
      // Extract a title from the conversation
      const firstFewWords = userInput.split(' ').slice(0, 4).join(' ');
      const newName = `${firstFewWords}...`;
      updateThread({
        ...activeThread,
        name: newName,
      });
    }
  };
  
  const sendWebhookIfConfigured = (userInput: string) => {
    if (!activeConfiguration || !activeThread) return;
    
    if (activeConfiguration.webhookURL) {
      sendWebhook(activeConfiguration.webhookURL, {
        userName: 'User', // This would be dynamic in a real app
        prompt: userInput,
        timestamp: new Date().toISOString(),
        model: activeConfiguration.model,
        threadId: activeThread.threadId,
      });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFileAttachments(Array.from(e.target.files));
    }
  };
  
  if (!activeThread) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">No Active Thread</h2>
          <p className="text-gray-400">
            Select an existing thread or create a new one to start chatting
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold truncate">{activeThread.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-400">
            Created: {new Date(activeThread.createdAt).toLocaleString()}
          </p>
          
          {activeConfiguration?.useAssistantApi && (
            <span className="text-xs bg-cyan-900 text-cyan-300 px-1.5 py-0.5 rounded inline-flex items-center">
              Assistant API
            </span>
          )}
          
          {activeConfiguration?.vectorStoreId && (
            <span className="text-xs bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded inline-flex items-center">
              <Database size={12} className="mr-1" />
              Vector Store
            </span>
          )}
          
          {runId && (
            <span className="text-xs bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
              Run: {runId.substring(0, 8)}...
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {threadMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          threadMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-700">
        {error && (
          <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded-md text-red-200">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {fileAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {fileAttachments.map((file, index) => (
              <div key={index} className="bg-gray-700 text-sm rounded px-2 py-1 flex items-center">
                <span className="truncate max-w-xs">{file.name}</span>
                <button 
                  className="ml-2 text-gray-400 hover:text-red-500"
                  onClick={() => {
                    setFileAttachments(fileAttachments.filter((_, i) => i !== index));
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <label className="cursor-pointer text-gray-400 hover:text-cyan-500">
            <Paperclip size={20} />
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              multiple
            />
          </label>
          
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-md ${
              !input.trim() || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
