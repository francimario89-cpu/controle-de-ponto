
import React, { useState, useRef, useEffect } from 'react';
import { User, PointRecord } from '../types';
import { getGeminiResponse } from '../geminiService';

interface AiAssistantProps {
  user: User;
  records: PointRecord[];
}

const AiAssistant: React.FC<AiAssistantProps> = ({ user, records }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: `Olá ${user.name.split(' ')[0]}! Sou o assistente do PontoExato. Como posso te ajudar hoje com suas dúvidas de RH ou CLT?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const context = records.map(r => `${r.timestamp.toLocaleString()} - ${r.type} em ${r.address}`).slice(0, 20);
    const response = await getGeminiResponse(userMsg, context);
    
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-[11px] font-bold leading-relaxed shadow-sm ${
              m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 dark:text-white rounded-tl-none border dark:border-slate-800'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 flex gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 pb-20 md:pb-8">
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre seus direitos..."
            className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold px-2 dark:text-white"
          />
          <button onClick={handleSend} className="bg-primary text-white p-3 rounded-xl shadow-lg active:scale-90 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
