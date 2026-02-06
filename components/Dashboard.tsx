
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
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-orange-50 text-center">
        <p className="text-5xl font-black text-slate-800 tracking-tighter mb-1">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em] mb-6">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(time)}</p>
        
        <button onClick={onPunchClick} className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-white py-5 rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
          <span className="text-xl">{user.hasFacialRecord || user.role === 'admin' ? '📸' : '👤'}</span>
          {user.hasFacialRecord || user.role === 'admin' ? 'Registrar Ponto' : 'Cadastrar Face'}
        </button>
      </div>

      {/* Grid de Menus - Agora mais próximos (gap-2) e compactos */}
      <div className="grid grid-cols-3 gap-2 px-1">
        {[
          { label: 'Histórico', icon: '📝', view: 'mypoint' },
          { label: 'Folha', icon: '📇', view: 'card' },
          { label: 'Ajustes', icon: '💬', view: 'requests' }
        ].map(b => (
          <button 
            key={b.label} 
            onClick={() => onNavigate(b.view)} 
            className="bg-white py-3 px-2 rounded-2xl border border-orange-50 flex flex-col items-center justify-center shadow-sm active:bg-orange-50 transition-colors"
          >
            <span className="text-xl mb-0.5">{b.icon}</span>
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{b.label}</span>
          </button>
        ))}
      </div>

      {/* Seção Código da Empresa (RH) */}
      {isAdmin && (
        <div 
          onClick={() => copyToClipboard(user.companyCode)}
          className="bg-orange-50/50 p-4 rounded-[28px] border-2 border-dashed border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-all group"
        >
          <div>
            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Código da Empresa</p>
            <p className="text-sm font-black text-slate-800 tracking-widest group-hover:text-orange-600 transition-colors">{user.companyCode}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-black text-slate-400 uppercase">Toque p/ copiar</span>
            <div className="w-8 h-8 rounded-xl bg-white border border-orange-100 flex items-center justify-center text-orange-500 text-xs">📋</div>
          </div>
        </div>
      )}

      {lastPunch && (
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Última Marcação</p>
            <p className="text-sm font-black text-emerald-700">{lastPunch.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      )}

      {/* Info Rodapé Dashboard */}
      <div className="text-center pt-2">
         <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">ForTime PRO Intelligence System</p>
      </div>
    </div>
  );
};

export default Dashboard;
