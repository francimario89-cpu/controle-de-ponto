
import React from 'react';
import { PointRecord } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records }) => {
  const totalHours = records.length > 0 ? (records.length * 4.2).toFixed(1) : "0.0";

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900 rounded-[44px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl -mr-16 -mt-16"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Folha de Ponto</p>
        <h2 className="text-3xl font-black tracking-tighter mb-8">Dezembro / 2024</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Banco de Horas</p>
            <p className="text-2xl font-black text-orange-500">+{totalHours}h</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Faltas / Atrasos</p>
            <p className="text-2xl font-black text-red-400">0h</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-orange-50 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Assinatura Digital</h3>
        <div className="p-6 border-2 border-dashed border-orange-100 rounded-[32px] text-center bg-orange-50/20">
          <p className="text-[10px] font-black text-slate-300 uppercase leading-relaxed mb-4">Aguardando fechamento do RH para liberar a assinatura do colaborador.</p>
          <div className="w-12 h-1 bg-orange-100 mx-auto rounded-full"></div>
        </div>
        <button disabled className="w-full py-5 bg-slate-100 text-slate-300 rounded-[28px] font-black uppercase text-xs cursor-not-allowed">Assinar Documento</button>
      </div>
    </div>
  );
};

export default AttendanceCard;
