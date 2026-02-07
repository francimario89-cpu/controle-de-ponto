
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

  // Simulação de dados para o visual
  const workedMinutes = 468; // 7h 48m
  const neededMinutes = 480; // 8h
  const progress = (workedMinutes / neededMinutes) * 100;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* HEADER DE PERFIL RÁPIDO */}
      <div className="flex items-center gap-4 px-2">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
          <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}`} className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white truncate max-w-[200px]">{user.name}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.roleFunction || 'Colaborador'}</p>
        </div>
      </div>

      {/* MOOD TRACKER */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-50 dark:border-slate-800 shadow-sm">
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

      {/* BALANCE CARDS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#5c67f2] p-5 rounded-[35px] text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Saldo Acumulado</p>
            <button onClick={() => setShowValues(!showValues)} className="text-white/60">
              {showValues ? '👁️' : '🙈'}
            </button>
          </div>
          <p className="text-xl font-black">{showValues ? '00:25' : '••••'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-800 p-5 rounded-[35px] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Benefícios</p>
            <span className="text-primary">💳</span>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-white">{showValues ? 'R$ 452,00' : '••••'}</p>
        </div>
      </div>

      {/* TODAY STATUS PROGRESS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status de Hoje</p>
            <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(time)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Trabalhando</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
            <span>07:48 Trabalhadas</span>
            <span>00:12 Faltantes</span>
          </div>
        </div>
      </div>

      {/* AVISOS RECENTES */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-[35px] border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4">
        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl shadow-sm">📄</div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase leading-none mb-1">Espelho de Ponto</p>
          <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase opacity-70 tracking-widest">Documento pronto para assinatura</p>
        </div>
        <button className="text-emerald-500 font-black text-[10px]">VER</button>
      </div>

      {/* MAIN PUNCH BUTTON */}
      <button 
        onClick={onPunchClick} 
        className={`w-full py-7 rounded-[40px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all fixed bottom-24 left-4 right-4 max-w-[calc(100%-2rem)] mx-auto z-10 ${needsFacialRecord ? 'bg-indigo-600 text-white' : 'bg-primary text-white'}`}
      >
        <div className="text-3xl mb-1">{needsFacialRecord ? '👤' : '📸'}</div>
        {needsFacialRecord ? 'CADASTRAR FACE' : 'REGISTRAR PONTO'}
      </button>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <button onClick={() => onNavigate('mypoint')} className="bg-slate-100 dark:bg-slate-800 py-4 rounded-[28px] flex items-center gap-3 px-6 hover:bg-slate-200 transition-colors">
          <span className="text-lg">📅</span>
          <span className="text-[10px] font-black text-slate-500 uppercase">Histórico</span>
        </button>
        <button onClick={() => onNavigate('benefits')} className="bg-slate-100 dark:bg-slate-800 py-4 rounded-[28px] flex items-center gap-3 px-6 hover:bg-slate-200 transition-colors">
          <span className="text-lg">💳</span>
          <span className="text-[10px] font-black text-slate-500 uppercase">Benefícios</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
