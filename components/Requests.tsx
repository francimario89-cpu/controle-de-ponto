
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { AttendanceRequest } from '../types';

const Requests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [type, setType] = useState<'inclusão' | 'abono'>('inclusão');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [times, setTimes] = useState<string[]>(['08:00', '12:00', '13:00', '18:00']);
  const [reason, setReason] = useState('Esquecimento');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem('fortime_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user?.companyCode) return;
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
    }, (err) => {
      console.error("Erro ao carregar solicitações:", err);
    });
    return () => unsub();
  }, [user?.companyCode, user?.matricula]);

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'approved') return r.status === 'approved';
    return r.status === 'rejected';
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "requests"), {
        companyCode: user.companyCode,
        matricula: user.matricula,
        userName: user.name,
        type: type === 'abono' ? 'atestado' : 'inclusão',
        reason,
        date,
        times: type === 'inclusão' ? times : [],
        status: 'pending',
        attachment: attachmentName ? "base64_simulado" : null,
        attachmentName: attachmentName,
        createdAt: new Date()
      });
      setShowCreateMode(false);
      setAttachmentName(null);
    } catch (e) {
      alert("Erro ao enviar solicitação. Verifique sua conexão.");
    }
    setLoading(false);
  };

  if (showCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
        <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
          <button onClick={() => setShowCreateMode(false)} className="p-2 text-[#f97316]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center font-black text-slate-800 dark:text-white mr-10 text-sm uppercase">Nova Justificativa</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
          <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] flex items-center gap-4 border border-slate-100 dark:border-slate-700">
            <div className="text-xl">📅</div>
            <div className="flex-1">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data do Registro</p>
               <input 
                 type="date" 
                 value={date} 
                 onChange={e => setDate(e.target.value)}
                 className="bg-transparent border-none outline-none font-black text-slate-800 dark:text-slate-200 text-sm w-full"
               />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setType('inclusão')}
              className={`flex-1 p-5 rounded-[30px] border-2 flex flex-col items-center gap-2 transition-all ${type === 'inclusão' ? 'border-orange-500 bg-orange-500 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800'}`}
            >
              <span className="text-xl">📝</span>
              <span className="text-[10px] font-black uppercase">Ajuste de Ponto</span>
            </button>
            <button 
              onClick={() => setType('abono')}
              className={`flex-1 p-5 rounded-[30px] border-2 flex flex-col items-center gap-2 transition-all ${type === 'abono' ? 'border-orange-500 bg-orange-500 text-white shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800'}`}
            >
              <span className="text-xl">🏥</span>
              <span className="text-[10px] font-black uppercase">Atestado / Abono</span>
            </button>
          </div>

          {type === 'inclusão' ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Informe os horários corretos</p>
              <div className="grid grid-cols-2 gap-3">
                {times.map((t, idx) => (
                  <div key={idx} className="flex bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="bg-orange-100 dark:bg-orange-950/40 w-10 flex items-center justify-center text-[10px] font-black text-orange-600">{idx + 1}</div>
                    <input 
                      type="time" 
                      value={t} 
                      onChange={e => {
                        const newTimes = [...times];
                        newTimes[idx] = e.target.value;
                        setTimes(newTimes);
                      }}
                      className="bg-transparent p-4 outline-none text-xs font-black text-slate-800 dark:text-slate-200 flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                 <p className="text-[10px] font-black text-orange-700 dark:text-orange-300 uppercase leading-relaxed text-center">Ao selecionar Abono, o RH irá avaliar o atestado para abonar o período.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Motivo da Solicitação</p>
            <select 
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl text-[11px] font-black text-slate-800 dark:text-slate-200 outline-none appearance-none"
            >
              <option value="Esquecimento">Esquecimento</option>
              <option value="Problemas Técnicos">Problemas Técnicos</option>
              <option value="Trabalho Externo">Trabalho Externo</option>
              <option value="Atestado Médico">Atestado Médico</option>
              <option value="Folga / Compensação">Folga / Compensação</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="space-y-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect}
              accept="image/*,application/pdf"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-5 rounded-3xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${attachmentName ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'}`}
            >
              <span className="text-lg">{attachmentName ? '✅' : '📎'}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {attachmentName ? `Anexado: ${attachmentName}` : 'Anexar Comprovante / Atestado'}
              </span>
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            <button onClick={() => setShowCreateMode(false)} className="flex-1 py-5 border-2 border-slate-100 rounded-[28px] text-[10px] font-black uppercase text-slate-400">Voltar</button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-[2] py-5 bg-orange-600 text-white rounded-[28px] font-black uppercase text-[10px] shadow-xl disabled:opacity-50"
            >
              {loading ? 'ENVIANDO...' : 'Enviar para o RH'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificativas</p>
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase">Minhas Solicitações</h1>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl w-full mt-4 border dark:border-slate-700 shadow-sm">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)} 
              className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400'}`}
            >
              {t === 'pending' ? 'Em análise' : t === 'approved' ? 'Aprovadas' : 'Recusadas'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-32">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-[35px] flex items-center justify-between border border-slate-100 dark:border-slate-700 group active:scale-[0.98] transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-xl">
                {req.type === 'inclusão' ? '📝' : '🏥'}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none">{req.type === 'inclusão' ? 'Ajuste de Ponto' : 'Abono / Atestado'}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Data: {new Date(req.date).toLocaleDateString('pt-BR')}</p>
                {req.attachmentName && <span className="inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[7px] font-black mt-1 uppercase truncate max-w-[120px]">{req.attachmentName}</span>}
              </div>
            </div>
            <div className="text-slate-300">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
             <span className="text-4xl mb-4">📝</span>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma justificativa {activeTab === 'pending' ? 'pendente' : activeTab === 'approved' ? 'aprovada' : 'recusada'}</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowCreateMode(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20 border-4 border-white"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Requests;
