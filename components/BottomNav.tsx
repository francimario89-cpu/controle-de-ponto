
import React from 'react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate }) => {
  const items = [
    { id: 'dashboard', label: 'Ponto', icon: '⏰' },
    { id: 'requests', label: 'Pedidos', icon: '📝' },
    { id: 'mypoint', label: 'HISTÓRICO', icon: '📊', isCenter: true },
    { id: 'card', label: 'Cartão', icon: '📇' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 md:hidden">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[35px] h-20 flex items-center justify-around px-2 relative">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-300 ${
              item.isCenter 
                ? 'absolute -top-10 bg-orange-500 w-20 h-20 rounded-full border-[6px] border-slate-50 shadow-2xl scale-110 active:scale-95' 
                : 'flex-1 active:scale-90'
            }`}
          >
            {item.isCenter ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-0.5">📊</span>
                <span className="text-[8px] font-black text-white uppercase tracking-tighter">Histórico</span>
              </div>
            ) : (
              <>
                <span className={`text-xl mb-1 ${activeView === item.id ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                  {item.icon}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-widest ${activeView === item.id ? 'text-orange-600' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
