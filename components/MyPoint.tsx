
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

  const handleDownloadReport = () => {
    if (records.length === 0) return alert("Nenhum registro para exportar.");

    let content = "RELATÓRIO INDIVIDUAL DE PONTO - FORTIME PRO\n";
    content += "==========================================\n\n";
    content += `Data de Geração: ${new Date().toLocaleString('pt-BR')}\n`;
    content += `Total de Registros: ${records.length}\n\n`;
    content += "DATA       | HORA  | TIPO    | LOCALIZAÇÃO\n";
    content += "-----------|-------|---------|--------------------------------\n";

    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    sorted.forEach((r, idx) => {
      const date = r.timestamp.toLocaleDateString('pt-BR');
      const time = r.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const type = idx % 2 === 0 ? "ENTRADA" : "SAÍDA  ";
      content += `${date} | ${time} | ${type} | ${r.address}\n`;
    });

    content += "\n==========================================\n";
    content += "Documento gerado digitalmente via ForTime PRO.";

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Ponto_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase text-xs">Meus Registros</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Histórico completo</p>
        </div>
        <button 
          onClick={handleDownloadReport}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-orange-100 flex items-center gap-2 active:scale-95 transition-all"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar
        </button>
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

      {/* Botão Flutuante de Atalho */}
      {records.length > 0 && (
        <button 
          onClick={handleDownloadReport}
          className="fixed bottom-10 right-10 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-20 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 002-2M9 17v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2zm12-8V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2zm-6 8v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 002-2M15 17v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2zM9 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0h2a2 2 0 002-2M9 9v2a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2z" /></svg>
        </button>
      )}
    </div>
  );
};

export default MyPoint;
