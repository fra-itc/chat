import React from 'react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Paperclip } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser 
            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white' 
            : 'bg-gray-800 text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1 rounded-full ${isUser ? 'bg-cyan-800' : 'bg-gray-700'}`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
          <span className="font-medium">{isUser ? 'You' : 'Assistant'}</span>
          <span className="text-xs opacity-70 ml-auto">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {message.attachments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-1 text-sm mb-1">
              <Paperclip size={14} />
              <span>Attachments:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment) => (
                <div 
                  key={attachment.id}
                  className="bg-gray-700 rounded px-2 py-1 text-xs flex items-center gap-1"
                >
                  <Paperclip size={12} />
                  <span className="truncate max-w-[150px]">{attachment.filename}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
