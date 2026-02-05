
import React, { useState, useEffect } from 'react';
import { PointRecord } from '../types';

interface DashboardProps {
  onPunchClick: () => void;
  lastPunch?: PointRecord;
}

const Dashboard: React.FC<DashboardProps> = ({ onPunchClick, lastPunch }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(time);

  return (
    <div className="p-4 space-y-6 pb-12">
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-orange-50">
        <div className="flex items-start gap-3 mb-6 bg-orange-50/50 p-4 rounded-3xl border border-orange-100/50">
           <div className="p-2 bg-white rounded-xl shadow-sm">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Localização Atual:</p>
              <p className="text-xs font-bold text-slate-600">Sincronizado via GPS de Alta Precisão</p>
           </div>
        </div>

        <div className="flex flex-col items-center py-4">
          <p className="text-6xl font-black text-slate-800 tracking-tighter drop-shadow-sm">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            <span className="text-2xl text-orange-500 ml-1 opacity-80">{time.toLocaleTimeString('pt-BR', { second: '2-digit' })}</span>
          </p>
          <p className="text-[11px] text-orange-400 font-black uppercase tracking-[0.2em] mt-3 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
            {formattedDate}
          </p>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onPunchClick}
            className="flex-1 bg-gradient-to-br from-orange-500 to-orange-600 text-white py-5 rounded-[28px] font-black text-sm uppercase tracking-wider shadow-xl shadow-orange-200 flex items-center justify-center gap-3 transition-all active:scale-95 hover:shadow-orange-300/50"
          >
            <span className="text-xl">📸</span>
            Registrar Ponto
          </button>
          <button className="w-16 bg-white border-2 border-orange-100 rounded-[28px] flex items-center justify-center text-orange-400 hover:text-orange-600 transition-colors shadow-sm">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </button>
        </div>

        {lastPunch && (
          <div className="mt-8 pt-6 border-t border-orange-50 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Registro</p>
               <p className="text-sm font-black text-orange-600">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-emerald-500 uppercase">Sincronizado</span>
               <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ajustes', value: '02', icon: '💬', color: 'text-indigo-500' },
          { label: 'Pendências', value: '00', icon: '⚠️', color: 'text-amber-500' },
          { label: 'Horas', value: '168h', icon: '⏱️', color: 'text-emerald-500' }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-[32px] border border-orange-50 flex flex-col items-center text-center shadow-sm hover:scale-105 transition-transform">
            <span className="text-xl mb-1">{card.icon}</span>
            <span className={`text-sm font-black ${card.color}`}>{card.value}</span>
            <span className="text-[8px] text-slate-400 font-black uppercase tracking-tight">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
         <h3 className="text-[10px] font-black text-orange-300 uppercase tracking-[0.3em] ml-2">Serviços RH</h3>
         <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Histórico', icon: '📝' },
              { name: 'Solicitar', icon: '➕' },
              { name: 'Perfil', icon: '⚙️' }
            ].map(fn => (
              <button key={fn.name} className="flex flex-col items-center p-5 bg-white border border-orange-50 rounded-[32px] shadow-sm hover:bg-orange-50 transition-all group active:scale-90">
                 <span className="text-xl mb-2 group-hover:rotate-12 transition-transform">{fn.icon}</span>
                 <span className="text-[9px] font-black text-slate-500 uppercase leading-tight">{fn.name}</span>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
