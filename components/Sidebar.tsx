
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
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex flex-col items-center pt-12 pb-8 px-6">
           {company?.logoUrl ? (
             <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl flex items-center justify-center mb-4 border border-slate-100 p-3">
                <img src={company.logoUrl} className="max-w-full max-h-full object-contain" alt="Company Logo" />
             </div>
           ) : (
             <div className="w-24 h-24 rounded-full bg-primary shadow-xl flex items-center justify-center text-white text-3xl font-bold mb-4 border-4 border-white">
                {initials}
             </div>
           )}
           <h2 className="text-slate-800 font-black text-xl tracking-tight text-center">{user.name}</h2>
           <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-1">{user.role === 'admin' ? 'ADMINISTRADOR' : 'COLABORADOR'}</p>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-2 no-scrollbar">
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (item.id !== 'logout') onClose();
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all group ${
                  isActive 
                  ? 'bg-primary-light border border-primary/10 shadow-sm' 
                  : 'bg-transparent border border-transparent'
                }`}
              >
                <span className={`text-xl ${isActive ? 'grayscale-0' : 'grayscale opacity-40 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className={`text-sm font-bold tracking-tight ${
                  isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-800'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-8 py-6 flex items-center justify-between border-t border-slate-50">
           <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">V: 3.5.2</span>
           <span className="text-primary text-[10px] font-black uppercase tracking-widest">FORTIME PRO</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
