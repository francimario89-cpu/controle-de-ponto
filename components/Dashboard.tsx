
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
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-start gap-2 mb-4">
           <svg className="w-5 h-5 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Localização aproximada:</p>
              <p className="text-sm font-medium text-slate-700">Avenida Getúlio Vargas, 665, Savassi, Belo Horizonte, MG</p>
           </div>
        </div>

        <div className="flex flex-col items-center py-4">
          <p className="text-4xl font-bold text-slate-800 tracking-tight">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-slate-400 capitalize mt-1">{formattedDate}</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button 
            onClick={onPunchClick}
            className="flex-1 bg-[#0055b8] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            Registrar Ponto
          </button>
          <button className="w-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          </button>
        </div>

        {lastPunch && (
          <div className="mt-6 pt-6 border-t border-slate-50">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-bold uppercase">Último registro desse aparelho</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <p className="text-sm font-bold text-slate-700">Último registro às {lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Solicitações', value: 10, icon: '💬' },
          { label: 'Ocorrências', value: 0, icon: '⚠️' },
          { label: 'Faltas (Mês)', value: 0, icon: '📅' }
        ].map(card => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
            <span className="text-xl mb-1">{card.icon}</span>
            <span className="text-lg font-bold text-slate-800">{card.value}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Funcionalidades</h3>
         <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Banco de Horas', icon: '⏱️' },
              { name: 'Solicitações', icon: '📝' },
              { name: 'Cartões de Ponto', icon: '📇' }
            ].map(fn => (
              <button key={fn.name} className="flex flex-col items-center p-3 bg-white border border-slate-100 rounded-2xl">
                 <span className="text-2xl mb-2">{fn.icon}</span>
                 <span className="text-[10px] font-bold text-slate-600 leading-tight">{fn.name}</span>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
