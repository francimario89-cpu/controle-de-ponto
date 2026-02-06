
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
    return onSnapshot(q, (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
  }, [company?.id]);

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status });
      alert(`Solicitação processada: ${status}`);
    } catch (e) {
      alert("Erro ao processar.");
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    await updateDoc(doc(db, "employees", editingEmp.id), {
      name: editingEmp.name,
      password: editingEmp.password,
      roleFunction: editingEmp.roleFunction || '',
      workShift: editingEmp.workShift || ''
    });
    setEditingEmp(null);
    alert("Dados atualizados!");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center">
      {/* Menu de Abas Superior Centralizado */}
      <div className="w-full p-4 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar flex justify-center">
        <div className="flex p-1 bg-slate-100 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'jornada', 'calendario', 'ferias'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Ajustes (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-20 space-y-4">
        {tab === 'aprovacoes' && (
          <div className="space-y-3">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center mb-4">Pedidos Pendentes</h3>
             {requests.length === 0 ? (
               <div className="py-20 text-center opacity-30">
                 <p className="text-[10px] font-black uppercase">Sem solicitações</p>
               </div>
             ) : (
               requests.sort((a:any, b:any) => b.createdAt - a.createdAt).map(req => (
                 <div key={req.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-primary animate-pulse' : 'bg-slate-300'}`}></div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{req.userName}</p>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-primary-light text-primary`}>{req.type}</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Data: {new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                       <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">"{req.reason}"</p>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase">Rejeitar</button>
                        <button onClick={() => handleRequestAction(req.id, 'approved')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Aprovar</button>
                      </div>
                    )}
                 </div>
               ))
             )}
          </div>
        )}

        {tab === 'colaboradores' && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center mb-4">Gestão de Equipe</h3>
            {employees.map(e => (
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm hover:border-primary/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 truncate w-32">{e.name}</p>
                    <p className="text-[8px] font-bold text-primary uppercase tracking-tighter">{e.roleFunction || 'Colaborador'}</p>
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:bg-primary-light hover:text-primary transition-all">Editar</button>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Edição Centralizado */}
        {editingEmp && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editar Cadastro</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
              </div>
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Nome Completo</label>
                   <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Cargo</label>
                   <input type="text" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Senha Provisória</label>
                   <input type="text" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-primary/20">Salvar Alterações</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
