
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

  // Menu extremamente compacto com nomes diretos conforme solicitado
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'mypoint', label: 'Meus Registros', icon: '📝' },
    { id: 'card', label: 'Folha de Ponto', icon: '📇' },
    { id: 'requests', label: 'Ajustes', icon: '💬' },
    ...(isAdmin ? [
      { id: 'shifts', label: 'Jornada de Trabalho', icon: '🕒' },
      { id: 'calendar', label: 'Calendário', icon: '📅' },
      { id: 'vacations', label: 'Férias', icon: '🏖️' }
    ] : []),
    { id: 'profile', label: 'Meu Perfil', icon: '👤' },
    { id: 'logout', label: 'Sair do App', icon: '🚪' }
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
      <div className={`fixed top-0 left-0 h-full w-[240px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabeçalho Compacto Centralizado */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 shrink-0 bg-slate-50/50">
           {company?.logoUrl ? (
             <div className="w-16 h-16 rounded-[24px] bg-white shadow-lg flex items-center justify-center mb-2 border border-slate-100 p-2.5">
                <img src={company.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
             </div>
           ) : (
             <div className="w-16 h-16 rounded-2xl bg-primary shadow-lg flex items-center justify-center text-white text-xl font-black mb-2 border-4 border-white shadow-primary/20">
                {initials}
             </div>
           )}
           <h2 className="text-slate-800 font-black text-sm tracking-tight text-center leading-tight truncate w-full">{user.name}</h2>
           <p className="text-primary text-[7px] font-black uppercase tracking-[0.4em] mt-0.5">{isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}</p>
        </div>

        {/* Menu "Pai" - Itens mais juntos e compactos */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 no-scrollbar">
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
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-primary text-white shadow-sm scale-[1.02]' 
                  : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className={`text-base ${isActive ? 'grayscale-0' : 'opacity-40 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${
                  isActive ? 'text-white' : isCritical ? 'text-red-400' : 'text-slate-600'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé do Menu */}
        <div className="px-6 py-4 flex flex-col items-center gap-0.5 border-t border-slate-50 shrink-0 bg-slate-50/30">
           <span className="text-primary text-[7px] font-black uppercase tracking-[0.5em]">FORTIME PRO</span>
           <span className="text-slate-300 text-[6px] font-bold uppercase tracking-widest">v3.5.2 Cloud</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
