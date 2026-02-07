
import React from 'react';

const BenefitsView: React.FC = () => {
  const benefits = [
    { name: 'Refeição', balance: 520.40, icon: '🍱', color: 'bg-orange-500' },
    { name: 'Alimentação', balance: 450.00, icon: '🛒', color: 'bg-emerald-500' },
    { name: 'Mobilidade', balance: 120.00, icon: '🚗', color: 'bg-blue-500' },
    { name: 'Saúde', balance: 0, icon: '🏥', color: 'bg-rose-500' },
    { name: 'Cultura', balance: 50.00, icon: '🎬', color: 'bg-purple-500' },
    { name: 'Home Office', balance: 100.00, icon: '🏠', color: 'bg-slate-700' }
  ];

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase text-xs">Meus Benefícios</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Saldos Disponíveis</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {benefits.map((b) => (
          <div key={b.name} className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-50 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 ${b.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-slate-100 dark:shadow-none`}>
                {b.icon}
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1">{b.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Disponível</p>
              </div>
            </div>
            <p className="text-lg font-black text-slate-800 dark:text-white">R$ {b.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#5c67f2] p-8 rounded-[40px] text-white space-y-4">
        <div className="flex justify-between items-center">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ações Rápidas</p>
           <button className="text-xl">⚙️</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white/10 py-4 rounded-2xl text-[9px] font-black uppercase hover:bg-white/20">Transferir</button>
          <button className="bg-white/10 py-4 rounded-2xl text-[9px] font-black uppercase hover:bg-white/20">Extrato</button>
        </div>
      </div>
    </div>
  );
};

export default BenefitsView;
