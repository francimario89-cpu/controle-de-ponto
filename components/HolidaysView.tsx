
import React, { useState } from 'react';
import { Company, Holiday } from '../types';

interface HolidaysViewProps {
  company: Company | null;
}

const HolidaysView: React.FC<HolidaysViewProps> = ({ company }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const holidays = company?.holidays || [];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

  const calendarDays = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Padding for start of month
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }

  // Actual days
  for (let d = 1; d <= totalDays; d++) {
    calendarDays.push(d);
  }

  const checkHoliday = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date === dStr);
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl mb-4">📅</div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Calendário de Feriados</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Datas e Pontos Facultativos</p>
      </div>

      {/* CALENDÁRIO VISUAL */}
      <div className="bg-white dark:bg-slate-900 rounded-[44px] shadow-2xl border dark:border-slate-800 overflow-hidden">
        <div className="bg-primary p-6 flex justify-between items-center text-white">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="font-black text-xl hover:scale-110 transition-transform">◀</button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">{year}</p>
            <p className="text-sm font-black uppercase tracking-widest">{monthName}</p>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="font-black text-xl hover:scale-110 transition-transform">▶</button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-slate-300 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={i} className="aspect-square"></div>;
              const holiday = checkHoliday(d);
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                    holiday 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs font-black">{d}</span>
                  {holiday && <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTA DE FERIADOS */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Próximos Eventos</h3>
        {holidays.length > 0 ? (
          holidays
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(h => (
              <div key={h.id} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border dark:border-slate-700 flex items-center gap-5 shadow-sm">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex flex-col items-center justify-center border border-orange-100 dark:border-orange-900/30 shrink-0">
                   <span className="text-[8px] font-black text-orange-500 uppercase">{new Date(h.date + 'T00:00:00').toLocaleString('pt-BR', { month: 'short' })}</span>
                   <span className="text-lg font-black text-orange-600 leading-none">{h.date.split('-')[2]}</span>
                </div>
                <div>
                   <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight">{h.description}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{h.type === 'feriado' ? 'Feriado Nacional' : 'Ponto Facultativo'}</p>
                </div>
              </div>
            ))
        ) : (
          <div className="py-12 text-center bg-slate-100 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma data cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysView;
