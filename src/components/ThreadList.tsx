import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { createThread } from '../services/api';

const ThreadList: React.FC = () => {
  const { 
    threads, 
    activeThread, 
    activeConfiguration, 
    addThread, 
    setActiveThread, 
    deleteThread,
    setLoading
  } = useAppStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sort threads by last updated (most recent first)
  const sortedThreads = [...threads].sort((a, b) => 
    new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
  
  const handleCreateThread = async () => {
    if (!activeConfiguration) {
      alert('Please select or create a configuration first');
      return;
    }
    
    try {
      setIsCreating(true);
      setLoading(true);
      setError(null);
      
      // If using Assistant API, create a thread on OpenAI
      let threadId = '';
      
      if (activeConfiguration.useAssistantApi && activeConfiguration.assistantId) {
        try {
          console.log('Creating thread with Assistant API...');
          const response = await createThread(activeConfiguration);
          threadId = response.id;
          console.log('Thread created successfully:', threadId);
        } catch (err: any) {
          console.error('Error in Assistant API thread creation:', err);
          
          // If Assistant API fails, fall back to direct completion
          if (confirm('Failed to create thread with Assistant API. Would you like to use direct completion instead?')) {
            threadId = `local-${Date.now()}`;
            // Update configuration to not use Assistant API
            const updatedConfig = {
              ...activeConfiguration,
              useAssistantApi: false
            };
            // This would require adding a temporary update function to the store
            // For now, we'll just create the local thread
          } else {
            // User chose not to continue
            throw err;
          }
        }
      } else {
        // For direct completion, create a local thread ID
        threadId = `local-${Date.now()}`;
      }
      
      // Create a new thread
      const newThread = {
        threadId,
        name: `Thread ${threads.length + 1}`,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true,
      };
      
      addThread(newThread);
      
    } catch (error: any) {
      console.error('Error creating thread:', error);
      setError(error.message || 'Failed to create thread. Please try again.');
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">Threads</h2>
        <button
          onClick={handleCreateThread}
          disabled={isCreating || !activeConfiguration}
          className={`p-2 rounded-md ${
            isCreating || !activeConfiguration
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-700'
          }`}
          title={!activeConfiguration ? 'Please select a configuration first' : 'Create new thread'}
        >
          {isCreating ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
        </button>
      </div>
      
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-400">Error creating thread</p>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {sortedThreads.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 p-4 text-center">
            <div>
              <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
              <p>No threads yet</p>
              <p className="text-sm mt-2">
                {activeConfiguration 
                  ? 'Click the + button to create your first thread' 
                  : 'Select a configuration to get started'}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {sortedThreads.map((thread) => (
              <li 
                key={thread.threadId}
                className={`hover:bg-gray-800 ${
                  activeThread?.threadId === thread.threadId ? 'bg-gray-800' : ''
                }`}
              >
                <div className="flex items-center justify-between p-4">
                  <button
                    className="flex-1 text-left truncate"
                    onClick={() => setActiveThread(thread)}
                  >
                    <div className="font-medium truncate">{thread.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(thread.lastUpdated).toLocaleString()}
                    </div>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this thread?')) {
                        deleteThread(thread.threadId);
                      }
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ThreadList;
