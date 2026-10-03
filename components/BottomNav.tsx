
import React from 'react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate }) => {
  const items = [
    { id: 'dashboard', label: 'Início', icon: '🏠' },
    { id: 'mypoint', label: 'Histórico', icon: '📊' },
    { id: 'requests', label: 'JUSTIFICAR', icon: '📝', isCenter: true },
    { id: 'card', label: 'Espelho', icon: '📋' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div className="fixed bottom-2 left-0 right-0 px-2 sm:px-4 z-50 md:hidden">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.12)] rounded-[26px] h-16 grid grid-cols-5 items-center px-1">
        {items.map((item) => {
          if (item.isCenter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center py-0.5 active:scale-90 transition-all cursor-pointer"
                title="Justificar"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 border-2 border-white dark:border-slate-800">
                  <span className="text-xl leading-none">📝</span>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 mt-0.5">
                  Justificar
                </span>
              </button>
            );
          }

          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center py-0.5 active:scale-90 transition-all cursor-pointer"
            >
              <div className="h-8 flex items-center justify-center">
                <span className={`text-2xl transition-all ${isActive ? 'opacity-100 scale-110' : 'opacity-45 grayscale'}`}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[7.5px] font-black uppercase tracking-wider ${isActive ? 'text-orange-600 font-black' : 'text-slate-400'} mt-0.5`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
