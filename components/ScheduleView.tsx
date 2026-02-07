
import React, { useState } from 'react';

const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(9);

  const weekDays = [
    { m: 'DEZ.', d: 7, s: 'SÁB.' },
    { m: 'DEZ.', d: 8, s: 'DOM.' },
    { m: 'DEZ.', d: 9, s: 'SEG.' },
    { m: 'DEZ.', d: 10, s: 'TER.' },
    { m: 'DEZ.', d: 11, s: 'QUA.' },
    { m: 'DEZ.', d: 12, s: 'QUI.' },
  ];

  const scheduleItems = [
    { id: 1, type: 'Entrada', time: '08:00' },
    { id: 2, type: 'Saída', time: '12:00' },
    { id: 'break', type: 'Intervalo', text: 'Intervalo, hora de descansar!' },
    { id: 3, type: 'Entrada', time: '13:12' },
    { id: 4, type: 'Saída', time: '18:00' },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
        <button className="p-2 text-[#004a99] dark:text-blue-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center font-black text-slate-800 dark:text-white mr-10 text-sm">Meu horário</h1>
      </header>

      {/* Date Picker Horizontal */}
      <div className="bg-[#f5f8ff] dark:bg-slate-800/50 p-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 justify-between min-w-max px-2">
          {weekDays.map((day) => (
            <button
              key={day.d}
              onClick={() => setSelectedDay(day.d)}
              className={`flex flex-col items-center p-3 min-w-[60px] rounded-xl transition-all ${
                selectedDay === day.d 
                ? 'bg-white dark:bg-slate-800 shadow-lg scale-110' 
                : 'opacity-40'
              }`}
            >
              <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">{day.m}</span>
              <span className={`text-xl font-black ${selectedDay === day.d ? 'text-[#0057ff]' : 'text-slate-800 dark:text-white'}`}>{day.d}</span>
              <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">{day.s}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar pb-24">
        {/* Workload Info */}
        <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-bold text-[11px]">
          <span>Carga horária : 08:48</span>
          <span>Dia Normal</span>
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          {scheduleItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              {item.id === 'break' ? (
                /* Break Indicator */
                <div className="flex items-center gap-4 w-full py-2">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                    <span className="text-emerald-500 text-xl">⏳</span>
                  </div>
                  <p className="text-[11px] font-bold text-emerald-500">{item.text}</p>
                </div>
              ) : (
                /* Regular Time Entry */
                <>
                  <div className="w-10 h-10 bg-[#e6f0ff] dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#0057ff] font-black text-sm">{item.id}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-[#f8faff] dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-50 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.type}</span>
                    <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-600">
                      <span className="text-sm font-black text-[#004a99] dark:text-blue-300">{item.time}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;
