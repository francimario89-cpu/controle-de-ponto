import React from 'react';
import { User, Company } from '../types';

interface SidebarProps {
  user: User;
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, company, isOpen, onClose, onNavigate, activeView }) => {
  const isAdmin = user.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'INÍCIO / DASHBOARD', icon: '🏠' },
    { id: 'profile', label: 'PERFIL & IDENTIDADE', icon: '👤' },
    { id: 'mypoint', label: 'MEUS REGISTROS', icon: '📝' },
    { id: 'card', label: 'GESTÃO DE PONTO', icon: '📇' },
    { id: 'requests', label: 'AJUSTES / SOLICITAÇÕES', icon: '💬' },
    ...(isAdmin ? [
      { id: 'shifts', label: 'JORNADA DE TRABALHO', icon: '🕒' },
      { id: 'calendar', label: 'CALENDÁRIO & FERIADOS', icon: '📅' },
      { id: 'vacations', label: 'GESTÃO DE FÉRIAS', icon: '🏖️' }
    ] : []),
    { id: 'logout', label: 'SAIR DO SISTEMA', icon: '🚪' }
  ];

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 animate-in fade-in backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header - Centered Logo and User Info */}
        <div className="flex flex-col items-center pt-10 pb-8 px-6 shrink-0 border-b border-slate-50">
           {company?.logoUrl ? (
             <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 border border-slate-100 p-4 transition-transform hover:scale-105">
                <img src={company.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
             </div>
           ) : (
             <div className="w-24 h-24 rounded-full bg-emerald-500 shadow-xl flex items-center justify-center text-white text-2xl font-semibold mb-4 border-4 border-white">
                {initials}
             </div>
           )}
           <h2 className="text-slate-800 font-bold text-lg tracking-tight text-center leading-tight truncate w-full">{user.name}</h2>
           <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
             {isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}
           </p>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            const isCritical = item.id === 'logout';
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (item.id !== 'logout') onClose();
                }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-[1.02]' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`text-xl ${isActive ? 'grayscale-0' : 'opacity-60 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className={`text-[11px] font-semibold tracking-tight ${
                  isActive ? 'text-white' : isCritical ? 'text-red-500' : 'text-slate-700'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-6 flex flex-col items-center gap-1 border-t border-slate-50 shrink-0 bg-slate-50/30">
           <span className="text-emerald-500 text-[8px] font-bold uppercase tracking-[0.4em]">FORTIME PRO</span>
           <span className="text-slate-400 text-[7px] font-medium uppercase tracking-widest">Tecnologia em Gestão</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;