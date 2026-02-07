
import React, { useState } from 'react';
import { Company, Holiday } from '../types';

interface HolidaysViewProps {
  company: Company | null;
}

const HolidaysView: React.FC<HolidaysViewProps> = ({ company }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Iniciando em Fev 2026 para facilitar seu teste
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

  // Função robusta para converter qualquer string de data para YYYY-MM-DD
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return "";
    // Se vier YYYY-MM-DD (padrão de input date)
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) return dateStr;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // Se vier DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const isHoliday = (day: number) => {
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.some(h => normalizeDate(h.date) === target);
  };

  const getHolidayData = (day: number) => {
    const target = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => normalizeDate(h.date) === target);
  };

  const monthHolidays = holidays.filter(h => {
    const norm = normalizeDate(h.date);
    return norm.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  }).sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="text-center">
        <h2 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">FERIADOS E DATAS OFICIAIS</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border dark:border-slate-800">
        {/* HEADER CONFORME REFERÊNCIA */}
        <div className="bg-[#10b981] p-6 flex justify-between items-center text-white">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="w-10 h-10 flex items-center justify-center bg-[#3b82f6] rounded-full shadow-lg active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 mb-1">{year}</p>
            <p className="text-[20px] font-black uppercase tracking-widest">{monthName}</p>
          </div>

          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="w-10 h-10 flex items-center justify-center bg-[#3b82f6] rounded-full shadow-lg active:scale-90 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-7 gap-1 mb-6">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-4 gap-x-2">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={i}></div>;
              const holiday = getHolidayData(d);
              return (
                <div key={i} className="flex flex-col items-center justify-center relative aspect-square">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${
                    holiday 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110 z-10' 
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}>
                    <span className="text-[13px] font-black">{d}</span>
                  </div>
                  {holiday && <div className="absolute -bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EVENTOS EM {monthName}</h3>
        </div>

        {monthHolidays.map(h => (
          <div key={h.id} className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border dark:border-slate-800 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
             <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-xl font-black text-emerald-600">{normalizeDate(h.date).split('-')[2]}</span>
             </div>
             <div>
                <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase leading-tight">{h.description}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{h.type === 'feriado' ? 'Feriado Oficial' : 'Evento Interno'}</p>
             </div>
          </div>
        ))}
        {monthHolidays.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[40px]">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum feriado para este mês</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysView;
