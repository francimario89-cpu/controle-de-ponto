
import React, { useState } from 'react';

const Requests: React.FC = () => {
  const [tab, setTab] = useState<'em_andamento' | 'aprovadas' | 'reprovadas'>('em_andamento');

  const mockRequests = [
    { id: '#2984028', type: 'Abono', date: '04/12/2024', status: 'pending' },
    { id: '#2894022', type: 'Inclusão', date: '02/12/2024', status: 'pending', times: '08:00 - 12:00' },
    { id: '#2894012', type: 'Inclusão', date: '01/12/2024', status: 'pending', times: '08:00 - 12:00' },
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Minhas Solicitações</h2>
      </div>

      <div className="flex p-2 bg-slate-50 border-b border-slate-100">
        {(['em_andamento', 'aprovadas', 'reprovadas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockRequests.map((req) => (
          <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{req.id} - {req.type}</p>
                {req.times && <p className="text-xs text-slate-400 font-bold">{req.times}</p>}
                <p className="text-[10px] text-slate-300 font-medium">{req.date}</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        ))}
      </div>

      <button className="absolute bottom-6 right-6 w-14 h-14 bg-[#0055b8] text-white rounded-full shadow-xl shadow-blue-200 flex items-center justify-center active:scale-90 transition-transform">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Requests;
