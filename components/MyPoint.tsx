
import React, { useState } from 'react';
import { PointRecord, Company } from '../types';
import { downloadReceiptPDF, shareOrCopyReceipt, formatPunchType } from '../utils/receiptGenerator';
import { FileText, Share2, Check, Download, X, ShieldCheck, MapPin, Clock } from 'lucide-react';

interface MyPointProps {
  records: PointRecord[];
  company?: Company | null;
}

const MyPoint: React.FC<MyPointProps> = ({ records, company }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRecordForReceipt, setSelectedRecordForReceipt] = useState<PointRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDownloadPersonalReport = () => {
    if (records.length === 0) return alert("Nenhum registro para exportar.");
    
    let content = `MEU LIVRO DE PONTO - PONTO EXATO\n`;
    content += `COLABORADOR: ${records[0].userName}\n`;
    content += `DATA DE EMISSÃO: ${new Date().toLocaleString()}\n`;
    content += `------------------------------------------------------------\n`;
    
    records.forEach(r => {
      content += `${new Date(r.timestamp).toLocaleString()} | ${r.type.toUpperCase()} | ${r.address} ${r.isAdjustment ? '(AJUSTADO)' : ''}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Meu_Espelho_Ponto_${Date.now()}.txt`;
    link.click();
  };

  const handleShareReceipt = async (r: PointRecord) => {
    const success = await shareOrCopyReceipt(r, company);
    if (success) {
      setToastMessage("Comprovante copiado / compartilhado com sucesso!");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const grouped = records.reduce((acc: any, curr) => {
    const day = curr.timestamp.toLocaleDateString('pt-BR');
    if (!acc[day]) acc[day] = [];
    acc[day].push(curr);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase text-xs">Minhas Marcações</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Histórico e Comprovantes de Batida</p>
        </div>
        <button 
          onClick={handleDownloadPersonalReport} 
          className="bg-orange-600/10 hover:bg-orange-600/20 active:scale-95 text-orange-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-orange-200 transition-all flex items-center gap-1.5"
        >
          <Download size={12} />
          <span>Baixar Espelho</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 animate-in fade-in">
          <Check size={14} className="text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        {days.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-100 dark:border-slate-800 p-10 text-center space-y-2">
            <span className="text-2xl">📋</span>
            <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">Nenhuma batida registrada ainda</p>
            <p className="text-[10px] text-slate-400">Suas marcações de ponto aparecerão aqui com opção de salvar o comprovante.</p>
          </div>
        ) : (
          days.map(date => {
            const dayRecords = grouped[date].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            const isSelected = selectedDay === date;

            return (
              <div key={date} className={`bg-white dark:bg-slate-900 rounded-[35px] border transition-all duration-300 ${isSelected ? 'shadow-xl border-orange-200 scale-[1.01]' : 'border-slate-100 dark:border-slate-800'}`}>
                <button 
                  onClick={() => setSelectedDay(isSelected ? null : date)}
                  className="w-full p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                      <span className="text-[13px] font-black text-slate-800 dark:text-white leading-none">{date.split('/')[0]}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{date.split('/')[1]}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{dayRecords.length} Marcações</p>
                      {dayRecords.some((r: any) => r.isAdjustment) && (
                        <span className="text-[7.5px] font-black text-orange-600 uppercase">Contém Ajustes</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
                      <span className="text-[10px] font-black text-emerald-600">✓ OK</span>
                    </div>
                  </div>
                </button>

                {isSelected && (
                  <div className="px-6 pb-6 pt-1 space-y-3 animate-in slide-in-from-top-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">
                      Toque em uma marcação para salvar ou emitir comprovante:
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {dayRecords.map((r: PointRecord, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedRecordForReceipt(r)}
                          className={`p-4 rounded-[24px] border cursor-pointer hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-md transition-all flex justify-between items-center ${
                            r.isAdjustment ? 'bg-orange-50 border-orange-100 dark:bg-orange-950/10' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <p className={`text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1.5 ${r.isAdjustment ? 'text-orange-600' : 'text-slate-400'}`}>
                              <span>{formatPunchType(r.type)}</span>
                              {r.isAdjustment && <span>(AJUSTADO)</span>}
                              {r.isOffline && <span className="text-amber-500">📴 OFFLINE</span>}
                            </p>
                            <p className={`text-base font-black tracking-tight ${r.isAdjustment ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>
                              {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <p className="text-[8px] text-slate-400 text-right truncate max-w-[120px] hidden sm:block">
                              {r.address}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecordForReceipt(r);
                              }}
                              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl font-black text-[8px] uppercase tracking-wider hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 shrink-0"
                            >
                              <FileText size={11} className="text-orange-500" />
                              <span>Comprovante</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Comprovante Individual do Trabalhador */}
      {selectedRecordForReceipt && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[38px] w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 shadow-2xl my-auto border border-slate-100 dark:border-slate-800">
            {/* Header do Modal */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Comprovante de Ponto</h3>
                  <p className="text-[7.5px] text-slate-400 uppercase">Portaria MTP nº 671/2021</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecordForReceipt(null)}
                className="text-white/60 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Comprovante */}
            <div className="p-6 space-y-4">
              <div className="text-center py-2 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/30">
                <p className="text-[8.5px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {formatPunchType(selectedRecordForReceipt.type)}
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {new Date(selectedRecordForReceipt.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </h4>
                <p className="text-[9px] text-slate-500 font-bold">
                  {new Date(selectedRecordForReceipt.timestamp).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Informações detalhadas */}
              <div className="space-y-2 text-[9px] bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[8px] block">Colaborador:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 uppercase">{selectedRecordForReceipt.userName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[8px] block">Matrícula:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{selectedRecordForReceipt.matricula || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[8px] block">Localização Registrada:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 leading-snug block">{selectedRecordForReceipt.address}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-400 uppercase text-[7.5px] block">Assinatura Digital (Hash SHA-256):</span>
                  <span className="font-mono text-[7px] text-slate-500 dark:text-slate-400 break-all block">
                    {selectedRecordForReceipt.digitalSignature}
                  </span>
                </div>
              </div>

              {/* Ações de Download e Compartilhamento */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => downloadReceiptPDF(selectedRecordForReceipt, company)}
                  className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={15} />
                  <span>Baixar Comprovante em PDF</span>
                </button>

                <button
                  onClick={() => handleShareReceipt(selectedRecordForReceipt)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-black uppercase text-[9px] tracking-wider border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={13} />
                  <span>Compartilhar / Salvar Texto</span>
                </button>

                <button
                  onClick={() => setSelectedRecordForReceipt(null)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black uppercase text-[9px] tracking-wider"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPoint;
