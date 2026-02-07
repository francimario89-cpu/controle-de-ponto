
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
    // Aceita tanto 2024-02-24 quanto 24/02/2024
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
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl mb-2">📅</div>
        <h2 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-tight">CALENDÁRIO DE FERIADOS</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border dark:border-slate-800 overflow-hidden">
        <div className="bg-primary p-5 flex justify-between items-center text-white">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl font-black active:scale-90 transition-all">◀</button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5">{year}</p>
            <p className="text-[14px] font-black uppercase tracking-widest">{monthName}</p>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl font-black active:scale-90 transition-all">▶</button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <div key={d} className="text-center text-[8px] font-black text-slate-300 dark:text-slate-600 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square"></div>;
              const holiday = getHolidayForDay(d);
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all border ${
                    holiday 
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg scale-105 z-10' 
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  <span className="text-[11px] font-black">{d}</span>
                  {holiday && <div className="absolute bottom-1.5 w-1 h-1 bg-white rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">LISTA DE EVENTOS</h3>
        {currentMonthHolidays.length > 0 ? (
          currentMonthHolidays.map(h => (
            <div key={h.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                 <span className="text-[16px] font-black text-emerald-600 dark:text-emerald-400">{formatForComparison(h.date).split('-')[2]}</span>
              </div>
              <div className="min-w-0 flex-1">
                 <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase truncate">{h.description}</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Feriado • {monthName}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Nenhum feriado para este mês</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysView;
