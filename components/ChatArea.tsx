
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const actions = [
    "Resumir tudo",
    "Criar guia de estudo",
    "Principais argumentos",
    "Extrair linha do tempo"
  ];

  return (
    <div className="flex flex-col h-full bg-[#FBFCFE]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-3xl px-6 py-4 shadow-sm text-base leading-relaxed ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-100'
            }`}>
              {msg.text.split('\n').map((l, i) => <p key={i} className={i > 0 ? 'mt-3' : ''}>{l}</p>)}
            </div>
          </div>
        ))}
        {isLoading && <div className="animate-pulse text-indigo-600 font-medium">Gemini está pensando...</div>}
      </div>

      <div className="p-8 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
            {actions.map(a => (
              <button 
                key={a}
                onClick={() => onSendMessage(a)}
                className="whitespace-nowrap px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold transition-all"
              >
                {a}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onSendMessage(inputValue); setInputValue(''); }} className="relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte qualquer coisa sobre suas fontes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm"
            />
            <button className="absolute right-3 top-2 h-11 w-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
