
import React, { useState, useEffect, useMemo } from 'react';
import { PointRecord, User } from '../types';

interface DashboardProps {
  onPunchClick: () => void;
  lastPunch?: PointRecord;
  records?: PointRecord[]; 
  onNavigate: (v: any) => void;
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ onPunchClick, lastPunch, records = [], onNavigate, user }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeline = useMemo(() => {
    const today = new Date().toDateString();
    const todayRecords = records
      .filter(r => new Date(r.timestamp).toDateString() === today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const slots = [
      { type: 'Entrada', time: '08:00', done: false, actual: '' },
      { type: 'Intervalo', time: '12:00', done: false, actual: '' },
      { type: 'Retorno', time: '13:00', done: false, actual: '' },
      { type: 'Saída', time: '18:00', done: false, actual: '' },
    ];

    todayRecords.forEach((rec, idx) => {
      if (slots[idx]) {
        slots[idx].done = true;
        slots[idx].actual = new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    });

    return slots;
  }, [records]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 space-y-6 pb-36 overflow-y-auto no-scrollbar">
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Olá, {user.name.split(' ')[0]} 👋</p>
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Painel de Ponto</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[44px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[42px] font-black text-slate-800 dark:text-white tracking-tighter leading-none">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(time)}
          </p>
        </div>

        <button 
          onClick={onPunchClick}
          className="w-48 h-48 rounded-full bg-orange-500 p-2 shadow-2xl shadow-orange-200 dark:shadow-none relative group active:scale-90 transition-all"
        >
          <div className="w-full h-full rounded-full border-4 border-white/20 flex flex-col items-center justify-center text-white space-y-1">
            <span className="text-4xl">☝️</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Registrar</span>
            <span className="text-[10px] font-bold opacity-60 uppercase">Ponto Agora</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20 -z-10"></div>
        </button>

        <div className="flex gap-4 w-full pt-4">
           <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Horária</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{user.workShift || '08:00h'}</p>
           </div>
           <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-3xl text-center">
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Saldo Atual</p>
              <p className="text-sm font-black text-emerald-600">+00:15h</p>
           </div>
        </div>
      </div>

      {/* NOVO CARD CENTRAL DE JUSTIFICATIVA */}
      <div onClick={() => onNavigate('requests')} className="bg-orange-600 p-6 rounded-[35px] shadow-lg shadow-orange-200 dark:shadow-none flex items-center justify-between group active:scale-95 transition-all cursor-pointer">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl text-white">📝</div>
            <div>
               <p className="text-[11px] font-black text-white uppercase tracking-widest">Justificativa para o RH</p>
               <p className="text-[9px] font-bold text-white/70 uppercase">Faltas, Atestados ou Ajustes</p>
            </div>
         </div>
         <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Linha do Tempo - Hoje</p>
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 top-4 -z-0"></div>
          {timeline.map((rec, i) => (
            <div key={i} className="flex flex-col items-center space-y-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all ${rec.done ? 'bg-orange-500 border-orange-50 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-300'}`}>
                {rec.done ? <span className="text-[10px]">✓</span> : <span className="text-[8px] font-black">{i+1}</span>}
              </div>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase ${rec.done ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{rec.type}</p>
                <p className={`text-[10px] font-bold ${rec.done ? 'text-orange-600' : 'text-slate-400'}`}>
                  {rec.done ? rec.actual : rec.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
