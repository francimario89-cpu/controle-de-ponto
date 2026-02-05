
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
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-orange-50">
        <div className="flex items-start gap-3 mb-6">
           <div className="p-2 bg-orange-50 rounded-xl">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-orange-300 uppercase tracking-widest">Localização Detectada:</p>
              <p className="text-sm font-bold text-slate-600">Av. Getúlio Vargas, 665, Belo Horizonte</p>
           </div>
        </div>

        <div className="flex flex-col items-center py-6">
          <p className="text-5xl font-black text-orange-600 tracking-tighter">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-[11px] text-orange-400 font-black uppercase tracking-[0.15em] mt-2">{formattedDate}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onPunchClick}
            className="flex-1 bg-orange-500 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-wider shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-orange-600"
          >
            Registrar Ponto
          </button>
          <button className="w-16 bg-orange-50 border border-orange-100 rounded-[24px] flex items-center justify-center text-orange-400 hover:text-orange-600 transition-colors">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </button>
        </div>

        {lastPunch && (
          <div className="mt-8 pt-6 border-t border-orange-50 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Última Batida</p>
               <p className="text-sm font-black text-orange-600">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
               <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Solicitações', value: 10, icon: '💬' },
          { label: 'Ocorrências', value: 0, icon: '⚠️' },
          { label: 'Faltas', value: 0, icon: '📅' }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-[30px] border border-orange-50 flex flex-col items-center text-center shadow-sm">
            <span className="text-xl mb-1">{card.icon}</span>
            <span className="text-base font-black text-orange-600">{card.value}</span>
            <span className="text-[9px] text-orange-300 font-black uppercase tracking-tight">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
         <h3 className="text-[10px] font-black text-orange-300 uppercase tracking-widest ml-2">Acesso Rápido</h3>
         <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Extrato', icon: '⏱️' },
              { name: 'Ajustes', icon: '📝' },
              { name: 'Espelho', icon: '📇' }
            ].map(fn => (
              <button key={fn.name} className="flex flex-col items-center p-4 bg-white border border-orange-50 rounded-[30px] shadow-sm hover:bg-orange-50/50 transition-colors group">
                 <span className="text-xl mb-2 group-hover:scale-110 transition-transform">{fn.icon}</span>
                 <span className="text-[9px] font-black text-orange-400 uppercase leading-tight">{fn.name}</span>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
