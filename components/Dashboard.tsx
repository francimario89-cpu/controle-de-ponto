
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
  const [showValues, setShowValues] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  
  const needsFacialRecord = !user.hasFacialRecord && user.role === 'employee';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const moods = [
    { icon: '😢', label: 'Triste' },
    { icon: '😐', label: 'Neutro' },
    { icon: '🙂', label: 'Bem' },
    { icon: '😄', label: 'Ótimo' },
    { icon: '🤩', label: 'Incrível' }
  ];

  const progress = 75; // Simulação de progresso da jornada

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* HEADER DE LOCALIZAÇÃO (Referência Ortep 3.0) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[35px] border border-orange-50 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center text-xl shadow-inner">📍</div>
        <div className="flex-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Localização Aproximada</p>
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate">Rua J. G. Vargas, 665, Savassi - BH</p>
        </div>
      </div>

      {/* RELÓGIO E DATA */}
      <div className="text-center space-y-1">
         <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">
           {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
         </h1>
         <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
           {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(time)}
         </p>
      </div>

      {/* MOOD TRACKER */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Como você está se sentindo?</p>
        <div className="flex justify-between items-center px-2">
          {moods.map((m) => (
            <button 
              key={m.label} 
              onClick={() => setSelectedMood(m.label)}
              className={`text-2xl transition-all ${selectedMood === m.label ? 'scale-150 grayscale-0' : 'grayscale hover:grayscale-0 active:scale-90'}`}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD DE MÉTRICAS (Igual Ortep 3.0) */}
      <div className="grid grid-cols-3 gap-3">
        <div onClick={() => onNavigate('requests')} className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-50 dark:border-slate-800 shadow-sm text-center cursor-pointer active:scale-95 transition-all">
           <p className="text-xl mb-1">✉️</p>
           <p className="text-[14px] font-black text-slate-800 dark:text-white">10</p>
           <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Pedidos</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-50 dark:border-slate-800 shadow-sm text-center">
           <p className="text-xl mb-1">⚠️</p>
           <p className="text-[14px] font-black text-slate-800 dark:text-white">0</p>
           <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Desvios</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-50 dark:border-slate-800 shadow-sm text-center">
           <p className="text-xl mb-1">📅</p>
           <p className="text-[14px] font-black text-slate-800 dark:text-white">2</p>
           <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Faltas</p>
        </div>
      </div>

      {/* STATUS DA JORNADA */}
      <div className="bg-[#5c67f2] p-8 rounded-[44px] text-white shadow-xl relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Sua Jornada Hoje</p>
            <p className="text-2xl font-black tracking-tighter">07:48 <span className="text-xs opacity-60">trabalhadas</span></p>
          </div>
          <button onClick={() => setShowValues(!showValues)} className="bg-white/20 p-2 rounded-xl text-lg backdrop-blur-md">
            {showValues ? '👁️' : '🙈'}
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-white transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
             <span>Inicio: 08:00</span>
             <span>Fim: 18:00</span>
          </div>
        </div>
      </div>

      {/* BOTÃO PRINCIPAL DE PONTO */}
      <div className="flex gap-4">
        <button 
          onClick={onPunchClick} 
          className={`flex-1 py-7 rounded-[40px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all ${needsFacialRecord ? 'bg-indigo-600 text-white' : 'bg-primary text-white'}`}
        >
          <div className="text-3xl mb-1">{needsFacialRecord ? '👤' : '📸'}</div>
          {needsFacialRecord ? 'CADASTRAR FACE' : 'REGISTRAR PONTO'}
        </button>
        
        <button className="bg-slate-900 dark:bg-slate-800 text-white w-24 rounded-[40px] flex items-center justify-center shadow-xl active:scale-95 transition-all">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
        </button>
      </div>

      {/* FUNCIONALIDADES ADICIONAIS */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { id: 'mypoint', label: 'Histórico', icon: '📅' },
          { id: 'benefits', label: 'Cartão', icon: '💳' },
          { id: 'assistant', label: 'IA Chat', icon: '🤖' }
        ].map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} className="bg-slate-50 dark:bg-slate-800/50 py-4 rounded-[28px] flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="text-[8px] font-black text-slate-500 uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
