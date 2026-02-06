
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

  // Menu extremamente simplificado conforme solicitado
  const menuItems = [
    { id: 'dashboard', label: 'Início / Dashboard', icon: '🏠' },
    { id: 'profile', label: 'Editar Perfil & Marca', icon: '🎨' },
    { id: 'logout', label: 'Sair do Sistema', icon: '🚪' }
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
      <div className={`fixed top-0 left-0 h-full w-[260px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Cabeçalho do Menu */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6 shrink-0 bg-slate-50/50">
           {company?.logoUrl ? (
             <div className="w-20 h-20 rounded-[32px] bg-white shadow-xl flex items-center justify-center mb-3 border border-slate-100 p-3">
                <img src={company.logoUrl} className="max-w-full max-h-full object-contain" alt="Company Logo" />
             </div>
           ) : (
             <div className="w-16 h-16 rounded-3xl bg-primary shadow-xl flex items-center justify-center text-white text-xl font-black mb-3 border-4 border-white">
                {initials}
             </div>
           )}
           <h2 className="text-slate-800 font-black text-base tracking-tight text-center leading-tight">{user.name}</h2>
           <p className="text-primary text-[8px] font-black uppercase tracking-[0.3em] mt-1">{user.role === 'admin' ? 'GESTOR' : 'COLABORADOR'}</p>
        </div>

        {/* Menu Lateral Único */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (item.id !== 'logout') onClose();
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                  : 'bg-transparent border border-transparent hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span className={`text-xl ${isActive ? 'grayscale-0' : 'opacity-40'}`}>
                  {item.icon}
                </span>
                <span className={`text-xs font-black uppercase tracking-tighter ${
                  isActive ? 'text-white' : 'text-slate-600'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rodapé do Menu */}
        <div className="px-6 py-5 flex flex-col items-center gap-1 border-t border-slate-50 shrink-0 bg-slate-50/30">
           <span className="text-primary text-[8px] font-black uppercase tracking-[0.4em]">FORTIME PRO</span>
           <span className="text-slate-300 text-[7px] font-bold uppercase tracking-widest">v3.5.2 Cloud Edition</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
