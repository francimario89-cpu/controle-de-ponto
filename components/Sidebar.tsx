
import React from 'react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, onClose, onNavigate, activeView }) => {
  const menuItems = [
    ...(user.role === 'admin' ? [{ id: 'admin', label: 'Painel Gestor', icon: '📊' }] : []),
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'mypoint', label: 'Meus Registros', icon: '📝' },
    { id: 'card', label: 'Folha de Ponto', icon: '📇' },
    { id: 'requests', label: 'Ajustes', icon: '💬' },
    { id: 'logout', label: 'Sair do App', icon: '🚪' }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-orange-900/20 z-40 animate-in fade-in backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 flex flex-col border-r border-orange-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 bg-orange-50/50 border-b border-orange-50">
           <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-[32px] overflow-hidden border-4 border-white shadow-xl">
                 <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                 <h2 className="font-black text-lg leading-tight text-slate-800 tracking-tight">{user.name}</h2>
                 <p className="text-[10px] text-orange-400 font-bold uppercase tracking-[0.2em] mt-1">
                   {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar px-4 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[20px] text-sm font-bold transition-all ${
                activeView === item.id 
                ? 'text-orange-700 bg-orange-50 shadow-sm border border-orange-100' 
                : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50/30'
              }`}
            >
              <span className={`text-xl ${activeView === item.id ? 'grayscale-0' : 'grayscale opacity-60'}`}>{item.icon}</span>
              <span className="tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-8 border-t border-orange-50 flex items-center justify-between text-[9px] text-orange-200 font-black uppercase tracking-[0.2em]">
           <span>V: 3.5.0</span>
           <span className="text-orange-400">ForTime Pro</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
