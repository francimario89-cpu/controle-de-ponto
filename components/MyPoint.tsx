
import React from 'react';
import { PointRecord } from '../types';

interface MyPointProps {
  records: PointRecord[];
}

const MyPoint: React.FC<MyPointProps> = ({ records }) => {
  // Agrupar registros por dia
  const grouped = records.reduce((acc: any, curr) => {
    const day = curr.timestamp.toLocaleDateString('pt-BR');
    if (!acc[day]) acc[day] = [];
    acc[day].push(curr);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase text-xs">Meus Registros</h2>
        <div className="bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
          <p className="text-[9px] font-black text-orange-500 uppercase">Mês Atual</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="py-20 text-center opacity-20">
            <p className="text-6xl mb-4">📝</p>
            <p className="text-xs font-black uppercase">Nenhum ponto registrado</p>
          </div>
        ) : (
          Object.keys(grouped).map(date => (
            <div key={date} className="bg-white rounded-[32px] p-5 border border-orange-50 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{date}</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-black uppercase">Jornada OK</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {grouped[date].sort((a: any, b: any) => a.timestamp - b.timestamp).map((r: PointRecord, idx: number) => (
                  <div key={idx} className="bg-orange-50/50 p-2.5 rounded-2xl border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-slate-700">{r.timestamp.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    <p className="text-[7px] font-black text-orange-400 uppercase mt-0.5">{idx % 2 === 0 ? 'Entrada' : 'Saída'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPoint;
