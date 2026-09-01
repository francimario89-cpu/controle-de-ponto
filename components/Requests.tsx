
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { AttendanceRequest } from '../types';

const Requests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [type, setType] = useState<'inclusão' | 'abono'>('inclusão');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [informTimes, setInformTimes] = useState(false);
  const [times, setTimes] = useState<string[]>(['08:00', '12:00', '14:00', '18:00']);
  const [reason, setReason] = useState('Esquecimento');
  const [customDetail, setCustomDetail] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem('fortime_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user?.companyCode || !user?.matricula) return;
    
    const q = query(
      collection(db, "requests"), 
      where("companyCode", "==", user.companyCode),
      where("matricula", "==", user.matricula)
    );

    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        reqs.push({ 
          id: d.id, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())
        });
      });
      setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limite de 600KB para garantir o sucesso no Firestore (Documento total < 1MB)
      if (file.size > 600 * 1024) { 
        alert("Arquivo muito pesado! Por favor, reduza a qualidade da foto ou envie um arquivo de até 600KB.");
        return;
      }
      setAttachmentName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => setAttachmentData(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!user || !user.companyCode) {
      alert("Erro ao identificar empresa. Saia e entre novamente.");
      return;
    }
    setLoading(true);
    try {
      const fullReason = customDetail.trim() 
        ? `${reason} - ${customDetail.trim()}` 
        : reason;

      const payload: any = {
        companyCode: user.companyCode,
        matricula: user.matricula,
        userName: user.name,
        type: type === 'abono' ? 'atestado' : 'inclusão',
        reason: fullReason,
        date,
        status: 'pending',
        attachment: attachmentData || "",
        attachmentName: attachmentName || "",
        createdAt: serverTimestamp()
      };

      if (type === 'inclusão' && informTimes) {
        payload.suggestedTimes = times.filter(t => !!t);
      }

      await addDoc(collection(db, "requests"), payload);
      setShowCreateMode(false);
      setAttachmentName(null);
      setAttachmentData(null);
      setCustomDetail('');
      setActiveTab('pending');
      alert("Solicitação de aprovação enviada com sucesso para o RH!");
    } catch (e) {
      alert("Erro ao enviar. Tente novamente ou verifique se o arquivo não é muito grande.");
    }
    setLoading(false);
  };

  if (showCreateMode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
        <header className="px-4 py-4 flex items-center border-b dark:border-slate-800">
          <button onClick={() => setShowCreateMode(false)} className="p-2 text-orange-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="flex-1 text-center font-black text-slate-800 dark:text-white mr-10 text-sm uppercase">Pedir Aprovação ao RH</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar pb-32">
          <div className="bg-orange-50/70 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-800">
            <span className="text-xl">📋</span>
            <div className="text-[9px] font-bold leading-relaxed uppercase">
              <span className="font-black text-orange-700">Solicitação Simplificada:</span> Informe a data e a justificativa para que o RH avalie e aprove o ajuste do seu ponto.
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[28px] border dark:border-slate-700">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data da Ocorrência / Esquecimento</p>
             <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-slate-800 dark:text-white text-sm w-full" />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setType('inclusão')} className={`flex-1 p-5 rounded-[30px] border-2 transition-all ${type === 'inclusão' ? 'border-orange-500 bg-orange-500 text-white shadow-md' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
              <span className="text-xl block mb-2">📝</span>
              <span className="text-[9px] font-black uppercase">Esquecimento de Ponto</span>
            </button>
            <button onClick={() => setType('abono')} className={`flex-1 p-5 rounded-[30px] border-2 transition-all ${type === 'abono' ? 'border-orange-500 bg-orange-500 text-white shadow-md' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
              <span className="text-xl block mb-2">🏥</span>
              <span className="text-[9px] font-black uppercase">Atestado Médico</span>
            </button>
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Motivo Principal</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-3xl text-[11px] font-black outline-none">
              <option value="Esquecimento">Esquecimento</option>
              <option value="Atestado Médico">Atestado Médico</option>
              <option value="Problemas Técnicos">Problemas Técnicos</option>
              <option value="Trabalho Externo">Trabalho Externo</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {type === 'inclusão' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                  Deseja sugerir os horários esquecidos?
                </span>
                <button
                  type="button"
                  onClick={() => setInformTimes(!informTimes)}
                  className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${
                    informTimes ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {informTimes ? 'Sim (Informar)' : 'Não (Apenas Pedir)'}
                </button>
              </div>

              {informTimes && (
                <div className="space-y-2 pt-2 border-t dark:border-slate-700 animate-in fade-in duration-200">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Horários sugeridos para inclusão:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Entrada 1', 'Saída 1 (Almoço)', 'Entrada 2 (Retorno)', 'Saída 2'].map((label, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-400 block">{label}</label>
                        <input
                          type="time"
                          value={times[idx] || ''}
                          onChange={e => {
                            const newTimes = [...times];
                            newTimes[idx] = e.target.value;
                            setTimes(newTimes);
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-black border dark:border-slate-700 outline-none text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Observação / Justificativa (Opcional)</label>
            <textarea
              rows={3}
              value={customDetail}
              onChange={e => setCustomDetail(e.target.value)}
              placeholder="Descreva brevemente a justificativa para o gestor..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-3xl text-[11px] font-bold outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Comprovante / Atestado (Opcional)</label>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className={`w-full p-5 rounded-3xl border-2 border-dashed transition-all ${attachmentName ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
              <span className="font-black text-[10px] uppercase">{attachmentName || '📁 Anexar Foto / Documento (Max 600KB)'}</span>
            </button>
          </div>

          <div className="flex gap-4 pt-2">
            <button onClick={() => setShowCreateMode(false)} className="flex-1 py-5 bg-slate-100 hover:bg-slate-200 rounded-[28px] text-[10px] font-black uppercase text-slate-600">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[28px] font-black uppercase shadow-xl disabled:opacity-50 transition-all">
              {loading ? 'Enviando...' : 'Pedir Aprovação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <header className="px-4 py-4 border-b dark:border-slate-800 flex flex-col items-center">
        <h1 className="font-black text-slate-800 dark:text-white text-sm uppercase">Meus Pedidos RH</h1>
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl w-full mt-4 border dark:border-slate-700">
          {(['pending', 'approved', 'rejected'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === t ? 'bg-orange-500 text-white' : 'text-slate-400'}`}>
              {t === 'pending' ? 'Em análise' : t === 'approved' ? 'Aprovadas' : 'Recusadas'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-32">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-[35px] border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${req.type === 'atestado' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'}`}>
                    {req.type === 'atestado' ? '🏥' : '📝'}
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase leading-none">{req.type === 'atestado' ? 'Atestado' : 'Esquecimento de Ponto'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Ref: {new Date(req.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                 </div>
               </div>
               <div className={`px-3 py-1 rounded-full text-[7px] font-black uppercase ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : req.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                 {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Recusado' : 'Em análise'}
               </div>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 italic">"{req.reason}"</p>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
            <span className="text-4xl mb-2">📄</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma solicitação nesta aba</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowCreateMode(true)} className="fixed bottom-28 right-6 w-16 h-16 bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 border-4 border-white transition-all">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
};

export default Requests;
