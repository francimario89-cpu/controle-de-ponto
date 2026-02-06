
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

  const getHolidayForDay = (day: number) => {
    // Formata a data atual para YYYY-MM-DD garantindo o preenchimento de zeros
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date.trim() === dStr);
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl mb-2">📅</div>
        <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Calendário de Feriados</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-xl border dark:border-slate-800 overflow-hidden">
        <div className="bg-primary p-4 flex justify-between items-center text-white">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="font-black text-lg">◀</button>
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{year}</p>
            <p className="text-[11px] font-black uppercase tracking-widest">{monthName}</p>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="font-black text-lg">▶</button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <div key={d} className="text-center text-[8px] font-black text-slate-300 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square"></div>;
              const holiday = getHolidayForDay(d);
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl relative transition-all ${
                    holiday 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-black">{d}</span>
                  {holiday && <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Lista do Mês</h3>
        {holidays.filter(h => h.date.startsWith(`${year}-${String(month+1).padStart(2, '0')}`)).length > 0 ? (
          holidays
            .filter(h => h.date.startsWith(`${year}-${String(month+1).padStart(2, '0')}`))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(h => (
              <div key={h.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-900/30 shrink-0">
                   <span className="text-[12px] font-black text-orange-600">{h.date.split('-')[2]}</span>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate">{h.description}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Feriado / Ponto Facultativo</p>
                </div>
              </div>
            ))
        ) : (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[28px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhum feriado este mês</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysView;
