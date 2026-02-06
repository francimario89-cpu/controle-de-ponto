
import React from 'react';
import { PointRecord, User } from '../types';

interface AttendanceCardProps {
  records: PointRecord[];
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ records }) => {
  const user: User = JSON.parse(localStorage.getItem('fortime_user') || '{}');

  const calculateTotalHours = () => {
    if (records.length < 2) return 0;
    const sorted = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let totalMs = 0;
    for (let i = 0; i < sorted.length; i += 2) {
      const entry = sorted[i];
      const exit = sorted[i + 1];
      if (entry && exit) totalMs += exit.timestamp.getTime() - entry.timestamp.getTime();
    }
    return totalMs / (1000 * 60 * 60);
  };

  const totalHours = calculateTotalHours();
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  const handleDownloadMirror = () => {
    if (records.length === 0) return alert("Nenhum dado.");
    
    let content = "EXTRATO DE PONTO OFICIAL - FORTIME PRO\n";
    content += "========================================\n\n";
    content += `COLABORADOR: ${user.name}\n`;
    content += `MATRÍCULA: ${user.matricula || 'N/A'}\n`;
    content += `FUNÇÃO: ${user.roleFunction || 'NÃO DEFINIDA'}\n`;
    content += `JORNADA: ${user.workShift || 'NÃO DEFINIDA'}\n`;
    content += `EMPRESA: ${user.companyName}\n\n`;
    content += `TOTAL ACUMULADO NO MÊS: ${hours}h ${minutes}m\n`;
    content += "----------------------------------------\n\n";
    content += "REGISTROS DETALHADOS:\n";
    
    records.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()).forEach(r => {
      content += `[${r.timestamp.toLocaleDateString('pt-BR')}] ${r.timestamp.toLocaleTimeString('pt-BR')} - ${r.type.toUpperCase()} (${r.address})\n`;
    });

    content += "\n\n----------------------------------------\n";
    content += "Assinatura do Colaborador: ____________________\n";
    content += "Assinatura do Gestor: _________________________\n";

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Extrato_Ponto_${user.name}_${new Date().getMonth() + 1}.txt`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900 rounded-[44px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl -mr-16 -mt-16"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">Dados Contratuais</p>
        <h2 className="text-xl font-black tracking-tight mb-2 truncate">{user.roleFunction || 'Ocupação não definida'}</h2>
        <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 inline-block px-3 py-1 rounded-lg">Jornada: {user.workShift || 'Flexível'}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Saldo do Mês</p>
            <p className="text-2xl font-black text-orange-500">{hours}h {minutes}m</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-[32px] backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase opacity-40 mb-1">Status</p>
            <p className="text-sm font-black text-emerald-400 mt-2 uppercase">● Regular</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-orange-50 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Comprovante Legal</h3>
        <button 
          onClick={handleDownloadMirror}
          className="w-full py-6 bg-slate-900 text-white rounded-[28px] font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Gerar Extrato p/ Assinatura
        </button>
      </div>
    </div>
  );
};

export default AttendanceCard;
