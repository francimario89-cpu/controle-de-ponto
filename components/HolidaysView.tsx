
import React, { useState } from 'react';
import { Company, Holiday } from '../types';

interface HolidaysViewProps {
  company: Company | null;
}

const HolidaysView: React.FC<HolidaysViewProps> = ({ company }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const holidays = company?.holidays || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const calendarDays = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarDays.push(d);
  }

  // Normaliza qualquer string de data para o formato comparável YYYY-MM-DD
  const formatForComparison = (dateStr: string) => {
    if (!dateStr) return "";
    const separator = dateStr.includes('-') ? '-' : '/';
    const parts = dateStr.split(separator);
    
    if (parts.length !== 3) return dateStr;

    let y, m, d;
    if (parts[0].length === 4) { // YYYY-MM-DD
      [y, m, d] = parts;
    } else { // DD/MM/YYYY
      [d, m, y] = parts;
    }
    
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  const getHolidayForDay = (day: number) => {
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => formatForComparison(h.date) === target);
  };

  const currentMonthHolidays = holidays.filter(h => {
    const formatted = formatForComparison(h.date);
    return formatted.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  }).sort((a, b) => formatForComparison(a.date).localeCompare(formatForComparison(b.date)));

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col items-center text-center mb-2">
        <h2 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-widest">FERIADOS E DATAS OFICIAIS</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-xl border dark:border-slate-800 overflow-hidden">
        {/* HEADER VERDE - CONFORME FOTO */}
        <div className="bg-[#10b981] p-6 flex justify-between items-center text-white">
          <button 
            onClick={() => setCurrentDate(new Date(year, month - 1))} 
            className="w-10 h-10 flex items-center justify-center bg-[#3b82f6] rounded-full shadow-lg active:scale-90 transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-1">{year}</p>
            <p className="text-[18px] font-black uppercase tracking-[0.1em]">{monthName}</p>
          </div>

          <button 
            onClick={() => setCurrentDate(new Date(year, month + 1))} 
            className="w-10 h-10 flex items-center justify-center bg-[#3b82f6] rounded-full shadow-lg active:scale-90 transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* CORPO DO CALENDÁRIO */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-slate-300 dark:text-slate-600 py-1 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-3 gap-x-2">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square"></div>;
              const holiday = getHolidayForDay(d);
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                    holiday 
                    ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg scale-110 z-10' 
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`text-[12px] font-black ${holiday ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{d}</span>
                  {holiday && <div className="absolute bottom-2 w-1 h-1 bg-white rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTA DE EVENTOS ABAIXO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EVENTOS EM {monthName}</h3>
        </div>

        <div className="space-y-3">
          {currentMonthHolidays.length > 0 ? (
            currentMonthHolidays.map(h => (
              <div key={h.id} className="bg-white dark:bg-slate-800 p-4 rounded-[28px] border dark:border-slate-700 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                   <span className="text-[18px] font-black text-emerald-600 dark:text-emerald-400">{formatForComparison(h.date).split('-')[2]}</span>
                </div>
                <div className="min-w-0 flex-1">
                   <p className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate">{h.description}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Feriado Oficial</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sem eventos registrados para este mês</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HolidaysView;
