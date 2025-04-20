import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Configuration, Message, Thread } from '../types';

interface AppState {
  configurations: Configuration[];
  activeConfiguration: Configuration | null;
  threads: Thread[];
  activeThread: Thread | null;
  messages: Message[];
  isLoading: boolean;
  darkMode: boolean;

  // Configuration actions
  addConfiguration: (config: Configuration) => void;
  updateConfiguration: (config: Configuration) => void;
  deleteConfiguration: (id: string) => void;
  setActiveConfiguration: (config: Configuration) => void;
  
  // Thread actions
  addThread: (thread: Thread) => void;
  updateThread: (thread: Thread) => void;
  deleteThread: (threadId: string) => void;
  setActiveThread: (thread: Thread) => void;
  
  // Message actions
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (id: string) => void;
  getThreadMessages: (threadId: string) => Message[];
  
  // UI actions
  setLoading: (isLoading: boolean) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      configurations: [],
      activeConfiguration: null,
      threads: [],
      activeThread: null,
      messages: [],
      isLoading: false,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,

      // Configuration actions
      addConfiguration: (config) => {
        const newConfig = { 
          ...config, 
          id: Date.now().toString(),
          // Ensure useAssistantApi is defined (for backward compatibility)
          useAssistantApi: config.useAssistantApi !== undefined 
            ? config.useAssistantApi 
            : !!config.assistantId
        };
        
        set((state) => ({
          configurations: [...state.configurations, newConfig],
          activeConfiguration: config.isDefault ? newConfig : state.activeConfiguration,
        }));
      },
      
      updateConfiguration: (config) => {
        set((state) => ({
          configurations: state.configurations.map((c) => 
            c.id === config.id ? config : c
          ),
          activeConfiguration: state.activeConfiguration?.id === config.id 
            ? config 
            : state.activeConfiguration,
        }));
      },
      
      deleteConfiguration: (id) => {
        set((state) => ({
          configurations: state.configurations.filter((c) => c.id !== id),
          activeConfiguration: state.activeConfiguration?.id === id 
            ? null 
            : state.activeConfiguration,
        }));
      },
      
      setActiveConfiguration: (config) => {
        set({ activeConfiguration: config });
      },
      
      // Thread actions
      addThread: (thread) => {
        set((state) => ({
          threads: [...state.threads, thread],
          activeThread: thread,
        }));
      },
      
      updateThread: (thread) => {
        set((state) => ({
          threads: state.threads.map((t) => 
            t.threadId === thread.threadId ? thread : t
          ),
          activeThread: state.activeThread?.threadId === thread.threadId 
            ? thread 
            : state.activeThread,
        }));
      },
      
      deleteThread: (threadId) => {
        set((state) => ({
          threads: state.threads.filter((t) => t.threadId !== threadId),
          activeThread: state.activeThread?.threadId === threadId 
            ? null 
            : state.activeThread,
          messages: state.messages.filter((m) => m.threadId !== threadId),
        }));
      },
      
      setActiveThread: (thread) => {
        set({ activeThread: thread });
      },
      
      // Message actions
      addMessage: (message) => {
        const newMessage = { ...message, id: Date.now().toString() };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
        
        // Update thread's lastUpdated
        const { updateThread, threads } = get();
        const thread = threads.find((t) => t.threadId === message.threadId);
        if (thread) {
          updateThread({
            ...thread,
            lastUpdated: new Date().toISOString(),
          });
        }
      },
      
      updateMessage: (message) => {
        set((state) => ({
          messages: state.messages.map((m) => 
            m.id === message.id ? message : m
          ),
        }));
      },
      
      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        }));
      },
      
      getThreadMessages: (threadId) => {
        return get().messages.filter((m) => m.threadId === threadId);
      },
      
      // UI actions
      setLoading: (isLoading) => {
        set({ isLoading });
      },
      
      toggleDarkMode: () => {
        set((state) => ({ darkMode: !state.darkMode }));
      },
    }),
    {
      name: 'openai-assistant-storage',
      partialize: (state) => ({
        configurations: state.configurations,
        threads: state.threads,
        messages: state.messages,
        darkMode: state.darkMode,
        activeConfiguration: state.activeConfiguration,
      }),
    }
  )
);
