
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

  const adminItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'colaboradores', label: 'Colaboradores', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'aprovacoes', label: 'Aprovações RH', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'saldos', label: 'Relatórios/Saldos', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg> },
    { id: 'audit', label: 'Auditoria IA', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { id: 'company_profile', label: 'Configurações', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  const employeeItems = [
    { id: 'dashboard', label: 'Registrar Ponto', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'mypoint', label: 'Meu Histórico', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'card', label: 'Cartão de Ponto', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'requests', label: 'Solicitações', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
    { id: 'profile', label: 'Meus Dados', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  ];

  const menuItems = isAdmin ? adminItems : employeeItems;

  return (
    <>
      {/* OVERLAY MOBILE */}
      {isOpen && <div className="fixed inset-0 bg-slate-950/40 z-40 backdrop-blur-sm md:hidden" onClick={onClose} />}
      
      <div className={`
        fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-slate-900 z-50 transform transition-transform duration-500 ease-in-out flex flex-col shadow-2xl
        md:static md:translate-x-0 md:shadow-none md:border-r md:dark:border-slate-800 md:w-64 md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col items-center pt-12 pb-10 px-6 bg-primary/5 dark:bg-white/5">
           <div className="w-20 h-20 rounded-[30px] border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 overflow-hidden mb-4">
              <img 
                src={isAdmin ? (company?.logoUrl || `https://ui-avatars.com/api/?name=${company?.name}&background=0057ff&color=fff`) : (user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=0057ff&color=fff`)} 
                className="w-full h-full object-cover" 
              />
           </div>
           <h2 className="text-slate-800 dark:text-white font-black text-sm text-center leading-tight uppercase truncate w-full tracking-tighter">
             {isAdmin ? company?.name : user.name}
           </h2>
           <p className="text-primary text-[9px] font-black uppercase tracking-[0.3em] mt-2">
             {isAdmin ? 'Administrador' : (user.roleFunction || 'Colaborador')}
           </p>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
          <div className="pt-2 pb-4 px-5">
            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{isAdmin ? 'Gestão Corporativa' : 'Menu Colaborador'}</p>
          </div>

          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { onNavigate(item.id); onClose(); }} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-lg font-black' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold'}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </button>
          ))}

          <div className="pt-8 border-t dark:border-slate-800 mt-4">
            <button 
              onClick={() => onNavigate('logout')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="text-[10px] uppercase tracking-wider">Sair do App</span>
            </button>
          </div>
        </div>
        
        <div className="p-6 text-center border-t dark:border-slate-800">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ForTime PRO v4.5</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
