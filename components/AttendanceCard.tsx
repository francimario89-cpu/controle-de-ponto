
import React from 'react';
import { PointRecord } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records }) => {
  const totalHours = records.length > 0 ? (records.length * 4.2).toFixed(1) : "0.0";

  const handleDownloadMirror = () => {
    if (records.length === 0) return alert("Nenhum dado para o espelho de ponto.");
    
    let content = "ESPELHO DE PONTO MENSAL - FORTIME PRO\n";
    content += "====================================\n\n";
    content += `Funcionário: Colaborador\n`;
    content += `Mês de Referência: Dezembro / 2024\n`;
    content += `Total de Horas Calculadas: ${totalHours}h\n\n`;
    content += "REGISTROS ENCONTRADOS:\n";
    
    records.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()).forEach(r => {
      content += `[${r.timestamp.toLocaleDateString('pt-BR')}] - ${r.timestamp.toLocaleTimeString('pt-BR')} - ${r.address}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Espelho_Ponto_Mensal.txt`;
    a.click();
  };

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
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Ações do Documento</h3>
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleDownloadMirror}
            className="w-full py-5 bg-orange-500 text-white rounded-[28px] font-black uppercase text-xs shadow-lg shadow-orange-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Baixar Espelho de Ponto
          </button>
          
          <div className="p-6 border-2 border-dashed border-orange-100 rounded-[32px] text-center bg-orange-50/20 mt-2">
            <p className="text-[10px] font-black text-slate-300 uppercase leading-relaxed mb-4">Aguardando fechamento do RH para liberar a assinatura do colaborador.</p>
            <div className="w-12 h-1 bg-orange-100 mx-auto rounded-full"></div>
          </div>
          <button disabled className="w-full py-5 bg-slate-100 text-slate-300 rounded-[28px] font-black uppercase text-xs cursor-not-allowed">Assinar Documento</button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCard;
