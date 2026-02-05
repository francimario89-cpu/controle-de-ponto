
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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-orange-50 text-center">
        <p className="text-5xl font-black text-slate-800 tracking-tighter mb-2">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-8">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(time)}</p>
        
        <button onClick={onPunchClick} className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
          <span className="text-xl">{user.hasFacialRecord ? '📸' : '👤'}</span>
          {user.hasFacialRecord ? 'Registrar Ponto' : 'Cadastrar Face'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Histórico', icon: '📝', view: 'mypoint' },
          { label: 'Folha', icon: '📇', view: 'card' },
          { label: 'Solicitar', icon: '💬', view: 'requests' }
        ].map(b => (
          <button key={b.label} onClick={() => onNavigate(b.view)} className="bg-white p-4 rounded-3xl border border-orange-50 flex flex-col items-center shadow-sm">
            <span className="text-2xl mb-1">{b.icon}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase">{b.label}</span>
          </button>
        ))}
      </div>

      {lastPunch && (
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Último Ponto</p>
            <p className="text-sm font-black text-emerald-700">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
