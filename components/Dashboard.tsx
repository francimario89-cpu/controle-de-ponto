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
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado para a área de transferência!');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Seção Relógio */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-primary-light text-center">
        <p className="text-6xl font-bold text-slate-800 tracking-tighter mb-2">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-8">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(time)}</p>
        
        <button onClick={onPunchClick} className="w-full bg-primary text-white py-5 rounded-[28px] font-semibold text-sm uppercase tracking-widest shadow-xl shadow-primary-light flex items-center justify-center gap-3 active:scale-95 transition-all">
          <span className="text-2xl">{user.hasFacialRecord || user.role === 'admin' ? '📸' : '👤'}</span>
          {user.hasFacialRecord || user.role === 'admin' ? 'REGISTRAR PONTO' : 'CADASTRAR FACE'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 px-1">
        {[
          { label: 'Histórico', icon: '📝', view: 'mypoint' },
          { label: 'Folha', icon: '📇', view: 'card' },
          { label: 'Ajustes', icon: '💬', view: 'requests' }
        ].map(b => (
          <button 
            key={b.label} 
            onClick={() => onNavigate(b.view)} 
            className="bg-white py-4 px-2 rounded-[24px] border border-primary-light flex flex-col items-center justify-center shadow-sm active:bg-primary-light transition-colors"
          >
            <span className="text-2xl mb-1">{b.icon}</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{b.label}</span>
          </button>
        ))}
      </div>

      {isAdmin && (
        <div 
          onClick={() => copyToClipboard(user.companyCode)}
          className="bg-primary-light p-5 rounded-[32px] border-2 border-dashed border-primary/20 flex items-center justify-between cursor-pointer hover:bg-white transition-all group"
        >
          <div>
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Código da Empresa</p>
            <p className="text-base font-bold text-slate-800 tracking-widest group-hover:text-primary transition-colors">{user.companyCode}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-semibold text-slate-400 uppercase">Toque p/ copiar</span>
            <div className="w-9 h-9 rounded-2xl bg-white border border-primary/20 flex items-center justify-center text-primary text-sm shadow-sm">📋</div>
          </div>
        </div>
      )}

      {lastPunch && (
        <div className="bg-emerald-50 p-5 rounded-[32px] border border-emerald-100 flex items-center justify-between animate-in slide-in-from-bottom-2 shadow-sm shadow-emerald-50">
          <div>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Última Marcação</p>
            <p className="text-base font-bold text-emerald-700">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}

      <div className="text-center pt-4">
         <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-[0.3em]">ForTime PRO White Label Edition</p>
      </div>
    </div>
  );
};

export default Dashboard;