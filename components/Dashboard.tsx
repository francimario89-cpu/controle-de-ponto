
import React, { useState, useEffect } from 'react';
import { PointRecord, User } from '../types';

interface DashboardProps {
  onPunchClick: () => void;
  lastPunch?: PointRecord;
  onNavigate: (v: any) => void;
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ onPunchClick, lastPunch, onNavigate, user }) => {
  const [time, setTime] = useState(new Date());
  const needsFacialRecord = !user.hasFacialRecord && user.role === 'employee';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-[40px] p-8 shadow-sm border border-primary-light dark:border-primary/10 text-center transition-all">
        <p className="text-6xl font-bold text-slate-800 dark:text-white tracking-tighter mb-2">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(time)}</p>
        
        <button 
          onClick={onPunchClick} 
          className={`w-full py-5 rounded-[28px] font-semibold text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all ${needsFacialRecord ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-primary text-white shadow-primary-light'}`}
        >
          <span className="text-2xl">{needsFacialRecord ? '👤' : '📸'}</span>
          {needsFacialRecord ? 'GRAVAR BIOMETRIA FACIAL' : 'REGISTRAR PONTO'}
        </button>

        {needsFacialRecord && (
          <p className="mt-4 text-[9px] text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Primeiro acesso: Realize o cadastro facial</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
         <button onClick={() => onNavigate('chat')} className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center justify-center text-center group">
            <span className="text-3xl mb-2">🤖</span>
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">IA ForTime</p>
            <p className="text-[7px] text-indigo-400 dark:text-indigo-500 uppercase font-bold mt-1">Dúvidas CLT</p>
         </button>
         <button onClick={() => onNavigate('requests')} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-3xl mb-2">📄</span>
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Justificativas</p>
            <p className="text-[7px] text-slate-400 dark:text-slate-500 uppercase font-bold mt-1">Atestados/Faltas</p>
         </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-1">
        <button onClick={() => onNavigate('mypoint')} className="bg-white dark:bg-slate-800 py-5 px-2 rounded-[24px] border border-primary-light dark:border-primary/10 flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl mb-1">📝</span>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Histórico</span>
        </button>
        <button onClick={() => onNavigate('card')} className="bg-white dark:bg-slate-800 py-5 px-2 rounded-[24px] border border-primary-light dark:border-primary/10 flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl mb-1">📇</span>
          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Extrato P.671</span>
        </button>
      </div>

      {lastPunch && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Último Registro</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}

      <div className="text-center pt-4 opacity-30">
         <p className="text-[9px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">Ponto autorizado apenas na empresa</p>
      </div>
    </div>
  );
};

export default Dashboard;
