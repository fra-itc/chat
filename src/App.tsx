import React, { useState } from 'react';
import { useAppStore } from './store';
import ThreadList from './components/ThreadList';
import ChatInterface from './components/ChatInterface';
import ConfigPanel from './components/ConfigPanel';
import DiagnosticTool from './components/DiagnosticTool';
import AssistantRetrieval from './components/AssistantRetrieval';
import { Cog, MessageSquare, Database, Wrench } from 'lucide-react';

const App: React.FC = () => {
  const { darkMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'diagnostics' | 'retrieval'>('chat');

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <header className="bg-gradient-to-r from-purple-900 to-cyan-900 p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">OpenAI Assistant Interface</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-2 rounded-md ${activeTab === 'chat' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <MessageSquare size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={`p-2 rounded-md ${activeTab === 'config' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <Cog size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('diagnostics')}
              className={`p-2 rounded-md ${activeTab === 'diagnostics' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <Wrench size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('retrieval')}
              className={`p-2 rounded-md ${activeTab === 'retrieval' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              <Database size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full grid grid-cols-12">
            <div className="col-span-3 border-r border-gray-700 h-full overflow-y-auto">
              <ThreadList />
            </div>
            <div className="col-span-9 h-full">
              <ChatInterface />
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="h-full">
            <ConfigPanel />
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="h-full p-4 overflow-y-auto">
            <DiagnosticTool />
          </div>
        )}

        {activeTab === 'retrieval' && (
          <div className="h-full p-4 overflow-y-auto">
            <AssistantRetrieval />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
