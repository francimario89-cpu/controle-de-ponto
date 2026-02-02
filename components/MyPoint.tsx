
import React from 'react';

const MyPoint: React.FC = () => {
  const mockDays = [
    { date: '29/11/2024 - Sex', hours: '03:33', entries: ['08:09', '11:42', 'Sem Registro', '18:03'] },
    { date: '28/11/2024 - Qui', hours: '05:06', entries: ['07:58', '13:04', 'Sem Registro', '17:58'] },
    { date: '27/11/2024 - Qua', hours: '08:36', entries: ['08:14', '13:12', '14:22', '18:00'] },
    { date: '26/11/2024 - Ter', hours: '08:47', entries: ['07:59', '13:05', '14:17', '17:58'], status: 'ok' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-lg font-bold text-slate-800">Meu Ponto</h2>
         <button className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600">
            1 de novembro - 30 de novembro
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
         </button>
      </div>

      <div className="space-y-3">
        {mockDays.map((day, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-500">{day.date}</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {day.hours}
                </div>
             </div>

             <div className="grid grid-cols-4 gap-2">
                {day.entries.map((entry, j) => (
                  <div key={j} className={`p-2 rounded-xl text-center border ${entry === 'Sem Registro' ? 'border-red-100 bg-red-50 text-red-500' : 'border-slate-100 bg-slate-50 text-slate-700'}`}>
                     <p className="text-[10px] font-bold tracking-tighter leading-tight">
                       {entry === 'Sem Registro' ? 'SEM REGISTRO' : entry}
                     </p>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPoint;
