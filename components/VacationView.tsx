
import React from 'react';

const VacationView: React.FC = () => {
  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase text-xs">Férias e Afastamentos</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Gestão de Descanso</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm space-y-8">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponível</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white">15</p>
            <p className="text-[8px] font-bold text-emerald-500 uppercase mt-1">Dias</p>
          </div>
          <div className="w-px h-12 bg-slate-100 dark:bg-slate-800"></div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gozação</p>
            <p className="text-3xl font-black text-slate-300">15</p>
            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Dias</p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[30px] border border-slate-100 dark:border-slate-800">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Último Período</p>
          <div className="flex justify-between items-center">
             <div>
                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">01/01/2024 - 15/01/2024</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Férias Gozadas</p>
             </div>
             <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">✅</div>
          </div>
        </div>
      </div>

      <button className="w-full py-6 bg-slate-900 text-white rounded-[35px] font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">
        Solicitar Novo Afastamento
      </button>

      <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-[35px] border border-orange-100 dark:border-orange-900/30">
        <p className="text-[9px] font-black text-orange-800 dark:text-orange-300 uppercase leading-relaxed text-center">
          As solicitações de férias devem ser feitas com no mínimo 30 dias de antecedência para aprovação do gestor.
        </p>
      </div>
    </div>
  );
};

export default VacationView;
