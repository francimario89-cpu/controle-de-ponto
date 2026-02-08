
import React, { useState } from 'react';
import { PointRecord } from '../types';

interface MyPointProps {
  records: PointRecord[];
}

const MyPoint: React.FC<MyPointProps> = ({ records }) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const handleDownloadPersonalReport = () => {
    if (records.length === 0) return alert("Nenhum registro para exportar.");
    
    let content = `MEU LIVRO DE PONTO - FOR TIME PRO\n`;
    content += `COLABORADOR: ${records[0].userName}\n`;
    content += `DATA DE EMISSÃO: ${new Date().toLocaleString()}\n`;
    content += `------------------------------------------------------------\n`;
    
    records.forEach(r => {
      content += `${new Date(r.timestamp).toLocaleString()} | ${r.type.toUpperCase()} | ${r.address}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Meu_Espelho_Ponto_${Date.now()}.txt`;
    link.click();
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
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase text-xs">Minhas Marcações</h2>
        <button onClick={handleDownloadPersonalReport} className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-primary/20">
          Baixar Espelho
        </button>
      </div>

      <div className="space-y-3">
        {days.map(date => {
          const dayRecords = grouped[date].sort((a: any, b: any) => a.timestamp - b.timestamp);
          const isSelected = selectedDay === date;

          return (
            <div key={date} className={`bg-white dark:bg-slate-900 rounded-[35px] border transition-all duration-300 ${isSelected ? 'shadow-xl border-primary/20 scale-[1.02]' : 'border-slate-100 dark:border-slate-800'}`}>
              <button 
                onClick={() => setSelectedDay(isSelected ? null : date)}
                className="w-full p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-slate-800 dark:text-white">{date.split('/')[0]}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{date.split('/')[1]}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{dayRecords.length} Marcações</p>
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full">
                  <span className="text-[10px] font-black text-emerald-600">✓ OK</span>
                </div>
              </button>

              {isSelected && (
                <div className="px-6 pb-8 pt-2 space-y-4 animate-in slide-in-from-top-4">
                   <div className="grid grid-cols-1 gap-2">
                      {dayRecords.map((r: PointRecord, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{r.type}</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                           <p className="text-[8px] text-slate-400 text-right truncate max-w-[120px]">{r.address}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyPoint;
