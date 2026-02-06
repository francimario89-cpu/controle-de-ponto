import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove } from "firebase/firestore";

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
  const [showAddModal, setShowAddModal] = useState(false);
  
  // States para novos cadastros
  const [newHoliday, setNewHoliday] = useState({ date: '', desc: '', type: 'feriado' as 'feriado' | 'parada' });
  const [newEmp, setNewEmp] = useState({ name: '', matricula: '', password: '123', email: '', roleFunction: '', workShift: '08:00 - 17:00' });

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

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.desc || !company?.id) return;
    const holiday: Holiday = { id: Date.now().toString(), date: newHoliday.date, description: newHoliday.desc, type: newHoliday.type };
    await updateDoc(doc(db, "companies", company.id), { holidays: arrayUnion(holiday) });
    setNewHoliday({ date: '', desc: '', type: 'feriado' });
  };

  const handleRemoveHoliday = async (h: Holiday) => {
    if (!company?.id) return;
    await updateDoc(doc(db, "companies", company.id), { holidays: arrayRemove(h) });
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status });
      alert(`Solicitação processada: ${status}`);
    } catch (e) {
      alert("Erro ao processar.");
    }
  };

  // Fix: Implemented handleUpdateEmployee to resolve the "Cannot find name" error and handle Firestore updates
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      const { id, ...data } = editingEmp;
      await updateDoc(doc(db, "employees", id), data);
      setEditingEmp(null);
      alert("Colaborador atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar colaborador:", err);
      alert("Erro ao atualizar dados do colaborador.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center">
      <div className="w-full p-4 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'jornada', 'calendario', 'ferias'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Ajustes (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        
        {tab === 'colaboradores' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestão de Equipe</h3>
              <button onClick={() => setShowAddModal(true)} className="bg-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm">Novo +</button>
            </div>
            {employees.map(e => (
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-10 h-10 rounded-2xl object-cover" />
                  <div>
                    <p className="text-xs font-black text-slate-800 truncate w-32">{e.name}</p>
                    <p className="text-[7px] font-bold text-primary uppercase tracking-tighter">{e.roleFunction || 'Colaborador'}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="text-[9px] font-black text-slate-400 uppercase underline">Editar</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'aprovacoes' && (
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Ajustes Pendentes</h3>
             {requests.filter(r => r.status === 'pending').map(req => (
               <div key={req.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <p className="text-[10px] font-black text-slate-800 uppercase">{req.userName}</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-600 font-bold italic">"{req.reason}"</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequestAction(req.id, 'rejected')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase">Rejeitar</button>
                    <button onClick={() => handleRequestAction(req.id, 'approved')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Aprovar</button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Feriados e Paradas</h3>
            
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <div className="flex gap-2">
                 <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="flex-1 p-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none" />
                 <select value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})} className="p-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none">
                    <option value="feriado">Feriado</option>
                    <option value="parada">Parada</option>
                 </select>
               </div>
               <input type="text" placeholder="Descrição do evento" value={newHoliday.desc} onChange={e => setNewHoliday({...newHoliday, desc: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-[10px] font-bold outline-none" />
               <button onClick={handleAddHoliday} className="w-full bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-primary/20">Adicionar à Agenda</button>
            </div>

            <div className="space-y-2">
               {(company?.holidays || []).sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                 <div key={h.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-800">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">{h.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${h.type === 'feriado' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{h.type}</span>
                      <button onClick={() => handleRemoveHoliday(h)} className="text-red-300">✕</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {tab === 'jornada' && (
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Configuração de Jornada</h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Carga Horária Semanal</span>
                  <input type="text" defaultValue="44h" className="w-16 bg-transparent text-right font-black text-primary outline-none" />
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Tolerância (min)</span>
                  <input type="number" defaultValue="10" className="w-16 bg-transparent text-right font-black text-primary outline-none" />
               </div>
               <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Salvar Parâmetros</button>
            </div>
          </div>
        )}

        {tab === 'ferias' && (
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Férias e Afastamentos</h3>
             <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-slate-100 text-center flex flex-col items-center gap-4 opacity-50">
                <span className="text-4xl">🏖️</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Módulo de Gestão de Férias<br/>Em desenvolvimento</p>
             </div>
          </div>
        )}

      </div>

      {/* Modal Adicionar Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[44px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novo Colaborador</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300">✕</button>
            </div>
            <form onSubmit={(e) => {e.preventDefault(); onAddEmployee(newEmp); setShowAddModal(false);}} className="space-y-3">
              <input type="text" placeholder="Nome Completo" onChange={e => setNewEmp({...newEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" required />
              <input type="text" placeholder="Matrícula" onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" required />
              <input type="text" placeholder="Cargo/Função" onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-primary/20">Cadastrar no Sistema</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Colaborador */}
      {editingEmp && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[44px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editar Perfil</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="space-y-3">
              <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" />
              <input type="text" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" />
              <input type="text" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => {onDeleteEmployee(editingEmp.id); setEditingEmp(null);}} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[9px]">Excluir</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-[9px] shadow-lg">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;