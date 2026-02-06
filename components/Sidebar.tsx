
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
    ...(isAdmin ? [{ id: 'admin', label: 'Painel Gestor', icon: '📊' }] : []),
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'mypoint', label: 'Meus Registros', icon: '📝' },
    { id: 'card', label: 'Folha de Ponto', icon: '📇' },
    { id: 'requests', label: 'Ajustes', icon: '💬' },
    ...(isAdmin ? [
      { id: 'shifts', label: 'Jornada de Trabalho', icon: '🕒' },
      { id: 'calendar', label: 'Calendário', icon: '📅' },
      { id: 'vacations', label: 'Férias', icon: '🏖️' },
      { id: 'config', label: 'Identidade Visual', icon: '🎨' }
    ] : []),
    { id: 'profile', label: 'Meu Perfil', icon: '👤' },
    { id: 'logout', label: 'Sair do App', icon: '🚪' }
  ];

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 animate-in fade-in backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div className={`fixed top-0 left-0 h-full w-[260px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabeçalho do Menu mais compacto */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 shrink-0">
           {company?.logoUrl ? (
             <div className="w-16 h-16 rounded-[24px] bg-white shadow-lg flex items-center justify-center mb-2 border border-slate-100 p-2">
                <img src={company.logoUrl} className="max-w-full max-h-full object-contain" alt="Company Logo" />
             </div>
           ) : (
             <div className="w-16 h-16 rounded-full bg-primary shadow-lg flex items-center justify-center text-white text-xl font-black mb-2 border-4 border-white">
                {initials}
             </div>
           )}
           <h2 className="text-slate-800 font-black text-base tracking-tight text-center leading-tight">{user.name}</h2>
           <p className="text-primary text-[8px] font-black uppercase tracking-[0.2em] mt-0.5">{user.role === 'admin' ? 'ADMINISTRADOR' : 'COLABORADOR'}</p>
        </div>

        {/* Lista de Itens com espaçamento reduzido */}
        <div className="flex-1 overflow-y-auto py-1 px-3 space-y-0.5 no-scrollbar">
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (item.id !== 'logout') onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-primary-light border border-primary/10 shadow-sm' 
                  : 'bg-transparent border border-transparent hover:bg-slate-50'
                }`}
              >
                <span className={`text-lg ${isActive ? 'grayscale-0' : 'grayscale opacity-30 group-hover:opacity-80'}`}>
                  {item.icon}
                </span>
                <span className={`text-[11px] font-bold tracking-tight ${
                  isActive ? 'text-primary' : 'text-slate-600 group-hover:text-slate-900'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé do Menu */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-slate-50 shrink-0 bg-slate-50/50">
           <span className="text-slate-300 text-[8px] font-black uppercase tracking-widest">V: 3.5.2</span>
           <span className="text-primary text-[8px] font-black uppercase tracking-widest">FORTIME PRO</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
