
import React, { useState } from 'react';

const Requests: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('Abono');

  const mockRequests = [
    { id: '#4421', type: 'Abono', status: 'pendente', date: '04/12/2024' },
    { id: '#4390', type: 'Inclusão', status: 'aprovado', date: '01/12/2024' },
  ];

  return (
    <div className="p-6 space-y-6 h-full relative">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Solicitações</h2>
        <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">{mockRequests.length} TOTAIS</span>
      </div>

      <div className="space-y-3">
        {mockRequests.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-[32px] border border-orange-50 flex items-center justify-between shadow-sm group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${r.status === 'aprovado' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase">{r.type}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{r.date} • {r.id}</p>
              </div>
            </div>
            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${r.status === 'aprovado' ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-600'}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>

      <button onClick={() => setShowModal(true)} className="absolute bottom-8 right-8 w-16 h-16 bg-orange-500 text-white rounded-full shadow-2xl shadow-orange-200 flex items-center justify-center active:scale-90 transition-transform z-10">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="w-full bg-white rounded-[44px] p-8 animate-in slide-in-from-bottom-full">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-6">Nova Solicitação</h3>
            <div className="space-y-4">
              <select onChange={e => setType(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold appearance-none">
                <option>Abono de Faltas</option>
                <option>Inclusão de Ponto Esquecido</option>
                <option>Ajuste de Horário</option>
              </select>
              <textarea placeholder="Motivo da solicitação..." className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold h-32 resize-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={() => {alert('Enviado!'); setShowModal(false)}} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Enviar para RH</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
