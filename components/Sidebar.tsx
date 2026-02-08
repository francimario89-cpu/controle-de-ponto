
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

  // Itens específicos para o Administrador (Gestão de RH)
  const adminItems = [
    { id: 'company_profile', label: 'Dados da Empresa', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { id: 'colaboradores', label: 'Gestão de Pessoas', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'aprovacoes', label: 'Solicitações RH', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'saldos', label: 'Saldos e Relatórios', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'audit', label: 'Auditoria de Risco', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
  ];

  // Itens específicos para o Colaborador (Visão essencial)
  const employeeItems = [
    { id: 'profile', label: 'Meus Dados', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'mypoint', label: 'Meu Histórico', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'card', label: 'Cartão de Ponto', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'requests', label: 'Solicitações', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
  ];

  const commonItems = [
    { id: 'assistant', label: 'Assistente IA', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { id: 'logout', label: 'Sair do App', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> }
  ];

  const menuItems = isAdmin ? [...adminItems, ...commonItems] : [...employeeItems, ...commonItems];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-slate-900 z-50 transform transition-transform duration-500 ease-in-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col items-center pt-12 pb-10 px-6 bg-primary/5 dark:bg-white/5">
           <div className="w-20 h-20 rounded-[30px] border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 overflow-hidden mb-4 transform -rotate-6">
              <img 
                src={isAdmin ? (company?.logoUrl || `https://ui-avatars.com/api/?name=${company?.name}&background=0057ff&color=fff`) : (user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0057ff&color=fff`)} 
                className="w-full h-full object-cover" 
              />
           </div>
           <h2 className="text-slate-800 dark:text-white font-black text-sm text-center leading-tight uppercase truncate w-full tracking-tighter">
             {isAdmin ? company?.name : user.name}
           </h2>
           <p className="text-primary text-[9px] font-black uppercase tracking-[0.3em] mt-2">
             {isAdmin ? 'Módulo Administrativo' : (user.roleFunction || 'Colaborador')}
           </p>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
          {/* Link para o Dashboard sempre no topo */}
          <button 
            onClick={() => { onNavigate('dashboard'); onClose(); }} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeView === 'dashboard' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[11px] uppercase tracking-wider">Início</span>
          </button>

          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { onNavigate(item.id); if (item.id !== 'logout') onClose(); }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-lg shadow-blue-100 dark:shadow-none font-black' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold'}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="p-6 text-center border-t dark:border-slate-800">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ForTime PRO v4.0</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
