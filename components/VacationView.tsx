
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';

interface VacationRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  companyCode: string;
  createdAt: Date;
}

interface VacationViewProps {
  user: User;
}

const VacationView: React.FC<VacationViewProps> = ({ user }) => {
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "vacations"), where("userId", "==", user.matricula), where("companyCode", "==", user.companyCode));
    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        reqs.push({ id: d.id, ...data, createdAt: data.createdAt?.toDate() || new Date() });
      });
      setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    });
    return () => unsub();
  }, [user.matricula, user.companyCode]);

  const handleSubmit = async () => {
    if (!startDate || !endDate) return alert("Preencha as datas!");
    setLoading(true);
    try {
      await addDoc(collection(db, "vacations"), {
        userId: user.matricula,
        userName: user.name,
        startDate,
        endDate,
        status: 'pending',
        companyCode: user.companyCode,
        createdAt: new Date()
      });
      alert("Solicitação enviada!");
      setShowModal(false);
      setStartDate('');
      setEndDate('');
    } catch (e) {
      alert("Erro ao enviar solicitação.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Gestão de Férias</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl"
        >
          + Solicitar Férias
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Minhas Solicitações</p>
        
        {requests.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs font-bold text-slate-400 uppercase">Nenhuma solicitação encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">{new Date(req.startDate).toLocaleDateString('pt-BR')}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{new Date(req.endDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Solicitado em {req.createdAt.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase ${
                  req.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 
                  req.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                  'bg-amber-100 text-amber-600'
                }`}>
                  {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Recusado' : 'Pendente'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-6 animate-in zoom-in">
            <h2 className="text-sm font-black text-orange-600 text-center uppercase">Solicitar Férias</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Data de Início</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black dark:text-white border dark:border-slate-700" 
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Data de Término</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black dark:text-white border dark:border-slate-700" 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 border dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationView;
