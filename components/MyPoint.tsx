
import React from 'react';
import { PointRecord } from '../types';

interface MyPointProps {
  records: PointRecord[];
}

const MyPoint: React.FC<MyPointProps> = ({ records }) => {
  const grouped = records.reduce((acc: any, curr) => {
    const day = curr.timestamp.toLocaleDateString('pt-BR');
    if (!acc[day]) acc[day] = [];
    acc[day].push(curr);
    return acc;
  }, {});

  const handleDownloadCSV = () => {
    if (records.length === 0) return alert("Sem registros.");

    let csv = "\uFEFF"; // BOM para o Excel entender acentos
    csv += "Data;Hora;Tipo;Endereco\n";

    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    sorted.forEach((r, idx) => {
      const date = r.timestamp.toLocaleDateString('pt-BR');
      const time = r.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const type = idx % 2 === 0 ? "ENTRADA" : "SAIDA";
      csv += `${date};${time};${type};"${r.address}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meu_Ponto_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase text-xs">Meus Registros</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Histórico em nuvem</p>
        </div>
        <button 
          onClick={handleDownloadCSV}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center gap-2 active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Exportar Excel
        </button>
      </div>

      <div className="space-y-4">
        {Object.keys(grouped).map(date => (
          <div key={date} className="bg-white rounded-[32px] p-5 border border-orange-50 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{date}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-black uppercase">Sincronizado</span>
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
        ))}
      </div>
    </div>
  );
};

export default MyPoint;
