
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
      { id: 'admin', label: 'GESTÃO DE EQUIPE', icon: '👥' },
      { id: 'shifts', label: 'JORNADA DE TRABALHO', icon: '🕒' },
      { id: 'calendar', label: 'CALENDÁRIO & FERIADOS', icon: '📅' },
      { id: 'vacations', label: 'GESTÃO DE FÉRIAS', icon: '🏖️' },
      { id: 'contabilidade', label: 'CONTABILIDADE / FOLHA', icon: '📈' }
    ] : []),
    { id: 'logout', label: 'SAIR DO SISTEMA', icon: '🚪' }
  ];

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col items-center pt-10 pb-8 px-6 border-b border-slate-50">
           {company?.logoUrl ? <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center mb-4 p-3"><img src={company.logoUrl} className="max-w-full max-h-full object-contain" /></div> : <div className="w-20 h-20 rounded-full bg-primary shadow-xl flex items-center justify-center text-white text-2xl font-semibold mb-4 border-4 border-white">{initials}</div>}
           <h2 className="text-slate-800 font-bold text-lg text-center leading-tight truncate w-full">{user.name}</h2>
           <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{isAdmin ? 'ADMINISTRADOR' : 'COLABORADOR'}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { onNavigate(item.id); if (item.id !== 'logout') onClose(); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[11px] font-semibold tracking-tight uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
