
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

  // Função robusta para normalizar e comparar datas YYYY-MM-DD
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  };

  const getHolidayForDay = (day: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => normalizeDate(h.date) === targetDateStr);
  };

  // Filtrar feriados do mês atual para a lista
  const currentMonthHolidays = holidays.filter(h => {
    const norm = normalizeDate(h.date);
    return norm.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  }).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl mb-2">📅</div>
        <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Gestão de Calendário</h2>
        <p className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Feriados e Datas Oficiais</p>
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
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
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
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg scale-105 z-10' 
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-transparent'
                  }`}
                >
                  <span className="text-[11px] font-black">{d}</span>
                  {holiday && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
           <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
           Eventos em {monthName}
        </h3>
        
        {currentMonthHolidays.length > 0 ? (
          currentMonthHolidays.map(h => (
            <div key={h.id} className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border dark:border-slate-700 flex items-center gap-4 shadow-sm group">
              <div className="w-11 h-11 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-900/30 shrink-0 group-hover:bg-orange-500 group-hover:border-orange-500 transition-all">
                 <span className="text-[14px] font-black text-orange-600 dark:text-orange-400 group-hover:text-white">{h.date.split('-')[2]}</span>
              </div>
              <div className="min-w-0 flex-1">
                 <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{h.description}</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Feriado Nacional / Estadual</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <span className="text-3xl grayscale opacity-20 block mb-3">🏖️</span>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Nenhum feriado registrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysView;
