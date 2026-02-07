
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { AttendanceRequest } from '../types';

const Requests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  
  // Form State
  const [type, setType] = useState<'inclusão' | 'abono'>('inclusão');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [times, setTimes] = useState<string[]>(['08:00', '12:00', '13:00', '18:00']);
  const [reason, setReason] = useState('Esquecimento');
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('fortime_user') || '{}');

  useEffect(() => {
    if (!user.companyCode) return;
    const q = query(
      collection(db, "requests"), 
      where("companyCode", "==", user.companyCode),
      where("matricula", "==", user.matricula),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
    return () => unsub();
  }, [user.companyCode, user.matricula]);

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'approved') return r.status === 'approved';
    return r.status === 'rejected';
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "requests"), {
        companyCode: user.companyCode,
        matricula: user.matricula,
        userName: user.name,
        type,
        reason,
        date,
        times: type === 'inclusão' ? times : [],
        status: 'pending',
        createdAt: new Date()
      });
      setShowCreateMode(false);
    } catch (e) {
      alert("Erro ao enviar solicitação.");
    }
    setLoading(false);
  };

  if (showCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900">
        <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
          <button onClick={() => setShowCreateMode(false)} className="p-2 text-[#0057ff]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center font-bold text-slate-800 dark:text-white mr-10 text-sm">Nova solicitação</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-24">
          {/* Date Selector Card */}
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-4 border border-slate-100 dark:border-slate-700">
            <div className="text-xl">📅</div>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="bg-transparent border-none outline-none font-medium text-slate-600 dark:text-slate-300 text-sm flex-1"
            />
          </div>

          {/* Type Toggle Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={() => setType('inclusão')}
              className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'inclusão' ? 'border-[#0057ff] bg-[#0057ff] text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800'}`}
            >
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${type === 'inclusão' ? 'border-white' : 'border-slate-300'}`}>
                {type === 'inclusão' && <span className="text-xs">✓</span>}
              </div>
              <span className="text-[10px] font-bold uppercase">Solicitar inclusão</span>
            </button>
            <button 
              onClick={() => setType('abono')}
              className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'abono' ? 'border-[#0057ff] bg-[#0057ff] text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800'}`}
            >
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${type === 'abono' ? 'border-white' : 'border-slate-300'}`}>
                {type === 'abono' && <span className="text-xs">✓</span>}
              </div>
              <span className="text-[10px] font-bold uppercase">Solicitar Abono</span>
            </button>
          </div>

          {type === 'inclusão' && (
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase px-1">Quais horários você gostaria de incluir?</p>
              <div className="grid grid-cols-2 gap-3">
                {times.map((t, idx) => (
                  <div key={idx} className="flex bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="bg-[#eef4ff] dark:bg-indigo-950/40 w-10 flex items-center justify-center text-[10px] font-black text-[#0057ff]">{idx + 1}</div>
                    <input 
                      type="time" 
                      value={t} 
                      onChange={e => {
                        const newTimes = [...times];
                        newTimes[idx] = e.target.value;
                        setTimes(newTimes);
                      }}
                      className="bg-transparent p-3 outline-none text-xs font-bold text-slate-700 dark:text-slate-200 flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase px-1">Defina um motivo</p>
            <div className="relative">
              <select 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none"
              >
                <option value="Esquecimento">Esquecimento</option>
                <option value="Problemas Técnicos">Problemas Técnicos</option>
                <option value="Trabalho Externo">Trabalho Externo</option>
                <option value="Outros">Outros</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-5 bg-[#0057ff] text-white rounded-[25px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all mt-6"
          >
            {loading ? 'ENVIANDO...' : 'Realizar Solicitação'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <h1 className="font-bold text-slate-800 dark:text-white text-sm mb-4">Minhas Solicitações</h1>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
          <button 
            onClick={() => setActiveTab('pending')} 
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
          >
            Em andamento
          </button>
          <button 
            onClick={() => setActiveTab('approved')} 
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'approved' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
          >
            Aprovadas
          </button>
          <button 
            onClick={() => setActiveTab('rejected')} 
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${activeTab === 'rejected' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
          >
            Reprovadas
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-24">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-[#f8faff] dark:bg-slate-800/50 p-6 rounded-2xl flex items-center justify-between border border-slate-50 dark:border-slate-800 group active:scale-[0.98] transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-xl border border-orange-100 dark:border-orange-900/20">
                <span className="text-orange-400">⏳</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-tight">#{req.id.substring(0, 7)} - {req.type === 'inclusão' ? 'Inclusões' : 'Abono'} -</p>
                </div>
                {req.times && req.times.length > 0 && (
                  <div className="flex gap-2">
                    {req.times.filter(t => t !== '').map((t, i) => (
                      <span key={i} className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-slate-300">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center opacity-30">
             <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhuma solicitação encontrada</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowCreateMode(true)}
        className="fixed bottom-10 right-10 w-16 h-16 bg-[#0057ff] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Requests;
