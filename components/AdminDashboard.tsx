
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, Vacation } from '../types';
import { db } from '../firebase';
import { auditCompliance } from '../geminiService';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  
  const [newVacation, setNewVacation] = useState({ employeeId: '', startDate: '', endDate: '' });
  const [journeyConfig, setJourneyConfig] = useState(company?.config || { overtimePercentage: 50, nightShiftPercentage: 20, weeklyHours: 44, toleranceMinutes: 10 });

  // Estado para novo colaborador com todos os campos solicitados
  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({
    name: '', email: '', matricula: '', password: '', 
    cpf: '', phone: '', department: '', roleFunction: '', 
    workShift: '08:00 - 17:00', photo: ''
  });

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const qReq = query(collection(db, "requests"), where("companyCode", "==", company.id));
    const unsubReq = onSnapshot(qReq, (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });

    const qVac = query(collection(db, "vacations"), where("companyCode", "==", company.id));
    const unsubVac = onSnapshot(qVac, (s) => {
      const vacs: any[] = [];
      s.forEach(d => vacs.push({ id: d.id, ...d.data() }));
      setVacations(vacs);
    });

    return () => { unsubReq(); unsubVac(); };
  }, [company?.id]);

  const handleAudit = async () => {
    setIsAuditing(true);
    const sampleRecords = latestRecords.slice(0, 20).map(r => `${r.userName}: ${r.timestamp.toLocaleString()} - ${r.type}`);
    const result = await auditCompliance("Equipe Geral", sampleRecords);
    setAuditResult(result);
    setIsAuditing(false);
  };

  const getPresentEmployees = () => {
    const today = new Date().toLocaleDateString();
    const todayRecs = latestRecords.filter(r => r.timestamp.toLocaleDateString() === today);
    const presentIds = new Set(todayRecs.map(r => r.matricula));
    return employees.filter(e => presentIds.has(e.matricula));
  };

  const present = getPresentEmployees();

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpData.name || !newEmpData.matricula || !newEmpData.password) {
      alert("Campos Nome, Matrícula e Senha são obrigatórios.");
      return;
    }
    onAddEmployee({
      ...newEmpData,
      photo: newEmpData.photo || `https://ui-avatars.com/api/?name=${newEmpData.name}&background=random`
    });
    setShowAddModal(false);
    setNewEmpData({ name: '', email: '', matricula: '', password: '', cpf: '', phone: '', department: '', roleFunction: '', workShift: '08:00 - 17:00', photo: '' });
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      const { id, ...data } = editingEmp;
      await updateDoc(doc(db, "employees", id), data);
      setEditingEmp(null);
      alert("Dados do colaborador atualizados!");
    } catch (err) {
      alert("Erro ao atualizar.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center">
      <div className="w-full p-4 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'jornada', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-semibold uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Ajustes (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        
        {tab === 'colaboradores' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Monitor de Presença (Hoje)</h3>
               <div className="flex justify-around items-center py-2">
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-800">{present.length}</p>
                    <p className="text-[8px] text-emerald-500 font-bold uppercase">Presentes</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-800">{employees.length - present.length}</p>
                    <p className="text-[8px] text-red-400 font-bold uppercase">Ausentes</p>
                  </div>
               </div>
               <button onClick={handleAudit} disabled={isAuditing} className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2">
                 {isAuditing ? 'Analisando...' : '🔍 Auditoria CLT via IA'}
               </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Gestão de Equipe</h3>
                <button onClick={() => setShowAddModal(true)} className="bg-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase shadow-sm">Novo +</button>
              </div>
              {employees.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-10 h-10 rounded-2xl object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate w-32">{e.name}</p>
                      <p className="text-[8px] font-semibold text-primary uppercase tracking-tighter">{e.department || 'Geral'} • {e.roleFunction || 'Cargo'}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingEmp(e)} className="text-[9px] font-bold text-slate-400 uppercase underline">Editar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'contabilidade' && (
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-2xl">📊</div>
                <div>
                   <h3 className="text-sm font-bold text-slate-800">Fechamento de Folha (P. 671)</h3>
                   <p className="text-[10px] text-slate-400 mt-1">Exportação validada juridicamente para sistemas ERP.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => alert('Exportando AFDT...')} className="py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[9px]">Arquivo AFDT</button>
                  <button onClick={() => alert('Exportando ACJEF...')} className="py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[9px]">Arquivo ACJEF</button>
                </div>
                <button onClick={() => alert('Gerando CSV Consolidado...')} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase text-[10px] shadow-lg shadow-emerald-100">Planilha de Integração (ERP)</button>
             </div>
          </div>
        )}

        {tab === 'aprovacoes' && (
          <div className="space-y-4">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] text-center">Ajustes Pendentes</h3>
             {requests.filter(r => r.status === 'pending').map(req => (
               <div key={req.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 uppercase">{req.userName}</p>
                      <p className="text-[8px] text-primary font-bold">{req.type.toUpperCase()} - {new Date(req.date).toLocaleDateString()}</p>
                    </div>
                    {req.attachment && <img src={req.attachment} className="w-12 h-12 rounded-xl object-cover border border-slate-100" onClick={() => window.open(req.attachment)} />}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-slate-600 font-semibold italic">"{req.reason}"</div>
                  <div className="flex gap-2">
                    <button onClick={() => alert('Rejeitado')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-bold uppercase">Rejeitar</button>
                    <button onClick={() => alert('Aprovado')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase shadow-lg shadow-emerald-100">Aprovar</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR COLABORADOR - COMPLETO */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Novo Colaborador</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 text-xl">✕</button>
            </div>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Dados Pessoais</label>
                <input type="text" placeholder="Nome Completo *" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="CPF" value={newEmpData.cpf} onChange={e => setNewEmpData({...newEmpData, cpf: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
                  <input type="text" placeholder="Telefone" value={newEmpData.phone} onChange={e => setNewEmpData({...newEmpData, phone: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
                </div>
                <input type="email" placeholder="E-mail" value={newEmpData.email} onChange={e => setNewEmpData({...newEmpData, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Dados Profissionais</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Matrícula *" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" required />
                  <input type="text" placeholder="Departamento" value={newEmpData.department} onChange={e => setNewEmpData({...newEmpData, department: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
                </div>
                <input type="text" placeholder="Cargo / Função" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
                <input type="text" placeholder="Jornada (Ex: 08:00 - 17:00)" value={newEmpData.workShift} onChange={e => setNewEmpData({...newEmpData, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100 focus:bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest text-primary">Credenciais de Acesso</label>
                <input type="text" placeholder="Definir Senha de Acesso *" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-primary-light border border-primary/20 rounded-2xl text-[11px] font-bold text-primary outline-none focus:bg-white" required />
              </div>

              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl shadow-primary/20 active:scale-95 transition-all mt-4">Salvar Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR - COMPLETO */}
      {editingEmp && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Editar Colaborador</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-300 text-xl">✕</button>
            </div>
            
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div className="space-y-2 text-center">
                 <img src={editingEmp.photo} className="w-20 h-20 rounded-3xl mx-auto object-cover border-4 border-slate-50 shadow-sm" />
                 <input type="text" placeholder="URL da Foto" value={editingEmp.photo} onChange={e => setEditingEmp({...editingEmp, photo: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-[9px] font-semibold outline-none border border-slate-100 text-center" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Identificação</label>
                <input type="text" placeholder="Nome" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Matrícula" value={editingEmp.matricula} onChange={e => setEditingEmp({...editingEmp, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                  <input type="text" placeholder="CPF" value={editingEmp.cpf} onChange={e => setEditingEmp({...editingEmp, cpf: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Cargo & Equipe</label>
                <input type="text" placeholder="Departamento" value={editingEmp.department} onChange={e => setEditingEmp({...editingEmp, department: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                <input type="text" placeholder="Função" value={editingEmp.roleFunction} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                <input type="text" placeholder="Jornada" value={editingEmp.workShift} onChange={e => setEditingEmp({...editingEmp, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-2 tracking-widest text-primary">Alterar Senha</label>
                <input type="text" placeholder="Nova Senha" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-primary-light border border-primary/20 rounded-2xl text-[11px] font-bold text-primary outline-none" />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { if(confirm("Deseja mesmo excluir?")) { onDeleteEmployee(editingEmp.id); setEditingEmp(null); } }} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[9px]">Excluir</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-[9px] shadow-lg">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
