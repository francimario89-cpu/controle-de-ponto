
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
    { id: 'dashboard', label: 'INÍCIO', icon: '🏠' },
    { id: 'profile', label: 'PERFIL', icon: '👤' },
    { id: 'mypoint', label: 'MEU PONTO', icon: '📅' },
    { id: 'schedule', label: 'MEU HORÁRIO', icon: '🕒' },
    { id: 'benefits', label: 'BENEFÍCIOS', icon: '💳' },
    { id: 'feedback', label: 'FEEDBACK', icon: '💬' },
    { id: 'vacation', label: 'FÉRIAS', icon: '🏖️' },
    { id: 'assistant', label: 'ASSISTENTE IA', icon: '🤖' },
    { id: 'card', label: 'EXTRATO', icon: '📇' },
    { id: 'holidays', label: 'FERIADOS', icon: '🎉' },
    { id: 'requests', label: 'SOLICITAÇÕES', icon: '✉️' },
    { id: 'features', label: 'FUNCIONALIDADES', icon: '🏢' },
    { id: 'settings', label: 'CONFIGURAÇÕES', icon: '⚙️' },
    ...(isAdmin ? [
      { id: 'audit', label: 'COMPLIANCE CLT', icon: '⚖️' },
      { id: 'relatorio', label: 'BATIDAS', icon: '📸' },
      { id: 'colaboradores', label: 'EQUIPE', icon: '👥' },
      { id: 'saldos', label: 'BANCO HORAS', icon: '📊' },
      { id: 'aprovacoes', label: 'APROVAÇÕES', icon: '✅' },
      { id: 'config', label: 'REGRAS EMPRESA', icon: '🛡️' }
    ] : []),
    { id: 'logout', label: 'SAIR', icon: '🚪' }
  ];

  const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-slate-900 z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col items-center pt-10 pb-8 px-6 border-b dark:border-slate-800">
           {company?.logoUrl ? <div className="w-20 h-20 rounded-[30px] bg-white shadow-xl flex items-center justify-center mb-4 p-3 border border-slate-50"><img src={company.logoUrl} className="max-w-full max-h-full object-contain" /></div> : <div className="w-20 h-20 rounded-[30px] bg-primary shadow-xl flex items-center justify-center text-white text-2xl font-black mb-4 border-4 border-white">{initials}</div>}
           <h2 className="text-slate-800 dark:text-white font-black text-lg text-center leading-tight uppercase truncate w-full">{user.name}</h2>
           <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">{isAdmin ? 'GESTOR' : 'COLABORADOR'}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 no-scrollbar">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { onNavigate(item.id); if (item.id !== 'logout') onClose(); }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-lg' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[11px] font-black tracking-tight uppercase">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
