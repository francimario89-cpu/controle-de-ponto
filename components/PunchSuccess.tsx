
import React, { useState } from 'react';
import { PointRecord, Company } from '../types';
import { downloadReceiptPDF, shareOrCopyReceipt, formatPunchType } from '../utils/receiptGenerator';
import { FileText, Share2, Check, Download } from 'lucide-react';

interface PunchSuccessProps {
  record: PointRecord;
  onClose: () => void;
  company?: Company | null;
}

const PunchSuccess: React.FC<PunchSuccessProps> = ({ record, onClose, company }) => {
  const [copiedToast, setCopiedToast] = useState(false);

  const handleDownloadPDF = () => {
    downloadReceiptPDF(record, company);
  };

  const handleShare = async () => {
    const success = await shareOrCopyReceipt(record, company);
    if (success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 shadow-2xl my-auto border border-slate-100 dark:border-slate-800">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 h-24 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-white/10 pattern-grid-lg"></div>
          <div className="bg-white dark:bg-slate-900 rounded-full p-3 shadow-2xl relative z-10">
             <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>

        <div className="p-6 md:p-7 text-center">
          <div className="inline-block bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full mb-2">
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Batida Confirmada!
            </p>
          </div>

          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">
            {record.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>

          <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider mt-0.5 mb-5">
            {formatPunchType(record.type)} • {record.timestamp.toLocaleDateString('pt-BR')}
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-4 text-left border border-slate-100 dark:border-slate-800 space-y-2.5 mb-5">
             <div className="flex gap-2.5 items-start">
               <span className="text-emerald-500 text-sm mt-0.5">📍</span>
               <p className="text-[9px] text-slate-600 dark:text-slate-300 font-bold uppercase leading-relaxed">
                 {record.address}
               </p>
             </div>
             <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Assinatura Digital (Hash SHA-256)</p>
                <p className="text-[7.5px] font-mono text-slate-500 dark:text-slate-400 break-all">{record.digitalSignature}</p>
             </div>
          </div>

          {copiedToast && (
            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[9px] font-bold uppercase animate-in fade-in flex items-center justify-center gap-1">
              <Check size={12} /> Comprovante copiado / compartilhado com sucesso!
            </div>
          )}

          <div className="space-y-2.5">
            <button 
              onClick={handleDownloadPDF}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <FileText size={15} />
              <span>Baixar Comprovante em PDF</span>
            </button>

            <button 
              onClick={handleShare}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-black uppercase text-[9px] tracking-wider border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={13} />
              <span>Compartilhar / Salvar Comprovante</span>
            </button>

            <button 
              onClick={onClose}
              className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black uppercase text-[9px] tracking-widest transition-colors"
            >
              Concluir e Fechar
            </button>
          </div>

          <p className="text-[7px] text-slate-400 uppercase tracking-widest mt-4">
            Em conformidade com a Portaria MTP nº 671/2021
          </p>
        </div>
      </div>
    </div>
  );
};

export default PunchSuccess;
