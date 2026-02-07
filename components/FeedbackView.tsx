
import React, { useState } from 'react';
import { User } from '../types';

interface FeedbackViewProps {
  user: User;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'recebidos' | 'enviados'>('recebidos');

  const feedbacks = [
    { from: 'RH ForTime', rating: 5, comment: 'Excelente pontualidade neste mês!', date: '10/03/2025' },
    { from: 'Gestor Direto', rating: 4, comment: 'Ótimo trabalho na entrega do relatório.', date: '05/03/2025' }
  ];

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase text-xs">Clima e Feedback</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Cultura Organizacional</p>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[30px]">
        <button 
          onClick={() => setActiveTab('recebidos')} 
          className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl transition-all ${activeTab === 'recebidos' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
        >
          Recebidos
        </button>
        <button 
          onClick={() => setActiveTab('enviados')} 
          className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl transition-all ${activeTab === 'enviados' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400'}`}
        >
          Enviados
        </button>
      </div>

      <div className="space-y-4">
        {feedbacks.map((f, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-50 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">👤</div>
                <div>
                  <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">{f.from}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{f.date}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className={`text-xs ${s <= f.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold italic border-l-2 border-primary/20 pl-4">
              "{f.comment}"
            </p>
          </div>
        ))}
      </div>

      <button className="w-full py-5 bg-primary text-white rounded-[30px] font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">
        Enviar Novo Feedback
      </button>
    </div>
  );
};

export default FeedbackView;
