
import React, { useState } from 'react';

const AttendanceCard: React.FC = () => {
  const [tab, setTab] = useState<'pendentes' | 'assinados' | 'cancelados'>('pendentes');

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Cartão de ponto</h2>
      </div>

      <div className="flex p-2 bg-slate-50 border-b border-slate-100">
        {(['pendentes', 'assinados', 'cancelados'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'pendentes' ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between group active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-800">Cartão de Ponto</p>
                <p className="text-xs text-slate-400 font-medium">01/11/2024 à 30/11/2024</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium">Nenhum cartão encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceCard;
