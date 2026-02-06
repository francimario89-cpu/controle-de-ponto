
import React from 'react';
import { PointRecord } from '../types';

interface PunchSuccessProps {
  record: PointRecord;
  onClose: () => void;
}

const PunchSuccess: React.FC<PunchSuccessProps> = ({ record, onClose }) => {
  const handleDownloadReceipt = () => {
    let receipt = "COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR\n";
    receipt += "================================================\n\n";
    receipt += `EMPRESA: ${record.userName}\n`;
    receipt += `DATA: ${record.timestamp.toLocaleDateString('pt-BR')}\n`;
    receipt += `HORÁRIO: ${record.timestamp.toLocaleTimeString('pt-BR')}\n`;
    receipt += `LOCAL: ${record.address}\n`;
    receipt += `MATRÍCULA: ${record.matricula}\n`;
    receipt += `\n------------------------------------------------\n`;
    receipt += `ASSINATURA DIGITAL (HASH):\n${record.digitalSignature}\n`;
    receipt += `------------------------------------------------\n`;
    receipt += `Gerado eletronicamente por ForTime PRO v3.5\nConforme Portaria 671 MTP.`;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comprovante_Ponto_${record.timestamp.getTime()}.txt`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white rounded-[44px] w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
        <div className="bg-emerald-500 h-28 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-white/10 pattern-grid-lg"></div>
          <div className="bg-white rounded-full p-3 shadow-2xl relative z-10">
             <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>

        <div className="p-8 text-center">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Sucesso!</p>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-6">
            {record.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </h2>
          
          <div className="bg-slate-50 rounded-3xl p-5 text-left border border-slate-100 space-y-3 mb-8">
             <div className="flex gap-3">
               <span className="text-emerald-500">📍</span>
               <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">{record.address}</p>
             </div>
             <div className="pt-3 border-t border-slate-200">
                <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest mb-1">Assinatura do Registro</p>
                <p className="text-[8px] font-mono text-slate-400 break-all">{record.digitalSignature}</p>
             </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleDownloadReceipt}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Baixar Comprovante
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PunchSuccess;
