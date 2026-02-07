
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

  const punchMethods = [
    { icon: "https://cdn-icons-png.flaticon.com/512/3563/3563395.png", title: "Relógio de Ponto", desc: "Registro em equipamento físico integrado." },
    { icon: "https://cdn-icons-png.flaticon.com/512/2004/2004613.png", title: "Web", desc: "Marcação via desktop com login e senha." },
    { icon: "https://cdn-icons-png.flaticon.com/512/4214/4214041.png", title: "Tablet", desc: "Equipamento compartilhado na empresa." },
    { icon: "https://cdn-icons-png.flaticon.com/512/3437/3437364.png", title: "Celular", desc: "Mobile com geolocalização ativa." }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* CARD PRINCIPAL DE PONTO */}
      <div className="bg-white dark:bg-slate-800 rounded-[44px] p-8 shadow-sm border border-slate-100 dark:border-primary/10 text-center transition-all">
        <p className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-1">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-8">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(time)}</p>
        
        <button 
          onClick={onPunchClick} 
          className={`w-full py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all ${needsFacialRecord ? 'bg-indigo-600 text-white' : 'bg-primary text-white'}`}
        >
          <span className="text-2xl">{needsFacialRecord ? '👤' : '📸'}</span>
          {needsFacialRecord ? 'CADASTRAR FACE' : 'REGISTRAR AGORA'}
        </button>
      </div>

      {/* SEÇÃO INFORMATIVA CONFORME REFERÊNCIA */}
      <div className="space-y-4">
        <div className="text-center px-4">
          <h3 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-tight">COMO POSSO REGISTRAR?</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {punchMethods.map((m, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-[35px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-slate-50 dark:border-slate-800 flex flex-col gap-3 transition-transform hover:scale-[1.02]">
              <img src={m.icon} className="w-10 h-10 object-contain" alt={m.title} />
              <div>
                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight mb-1">{m.title}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ÚLTIMO REGISTRO */}
      {lastPunch && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-5 rounded-[36px] border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between animate-in slide-in-from-bottom-4">
          <div>
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Último Registro Hoje</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}

      {/* LINKS RÁPIDOS */}
      <div className="grid grid-cols-2 gap-3 px-1">
        <button onClick={() => onNavigate('mypoint')} className="bg-slate-100 dark:bg-slate-800 py-4 rounded-[24px] flex flex-col items-center justify-center">
          <span className="text-xl mb-1">📝</span>
          <span className="text-[9px] font-black text-slate-500 uppercase">Histórico</span>
        </button>
        <button onClick={() => onNavigate('requests')} className="bg-slate-100 dark:bg-slate-800 py-4 rounded-[24px] flex flex-col items-center justify-center">
          <span className="text-xl mb-1">💬</span>
          <span className="text-[9px] font-black text-slate-500 uppercase">Pedidos</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
