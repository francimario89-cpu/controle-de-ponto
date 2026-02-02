
import React from 'react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, onClose, onNavigate, activeView }) => {
  const menuItems = [
    { id: 'admin', label: 'Painel do RH (Gestor)', icon: '📊' },
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'mypoint', label: 'Meu Ponto', icon: '📝' },
    { id: 'card', label: 'Cartão de Ponto', icon: '📇' },
    { id: 'requests', label: 'Solicitações', icon: '💬' },
    { id: 'logout', label: 'Sair', icon: '🚪' }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 bg-[#0055b8] text-white">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                 <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div>
                 <h2 className="font-bold text-lg leading-tight">{user.name}</h2>
                 <p className="text-xs text-white/60">{user.role}</p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => item.id === 'logout' ? window.location.reload() : onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-medium transition-colors ${
                activeView === item.id ? 'text-[#0055b8] bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
           <span>Versão 3.2.12</span>
           <img src="https://ortep.com.br/wp-content/uploads/2021/08/logo-fortime-blue.png" alt="Fortime" className="h-3" />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
