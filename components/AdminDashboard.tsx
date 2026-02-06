
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, Vacation, WorkSchedule } from '../types';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  
  const [newVacation, setNewVacation] = useState({ employeeId: '', startDate: '', endDate: '' });
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({ date: '', description: '', type: 'feriado' });
  
  const [newJourney, setNewJourney] = useState<Partial<WorkSchedule>>({
    name: '', weeklyHours: 44, toleranceMinutes: 10, overtimePercentage: 50, nightShiftPercentage: 20
  });

  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({
    name: '', email: '', matricula: '', password: '', 
    cpf: '', phone: '', department: '', roleFunction: '', 
    workShift: '', scheduleId: '', photo: ''
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

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.matricula.includes(searchTerm) ||
    (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newHoliday.date || !newHoliday.description) return;
    const holiday = { ...newHoliday, id: Date.now().toString() } as Holiday;
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayUnion(holiday)
    });
    setNewHoliday({ date: '', description: '', type: 'feriado' });
    alert("Feriado adicionado!");
  };

  const handleDeleteHoliday = async (h: Holiday) => {
    if (!company || !confirm("Remover este feriado?")) return;
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayRemove(h)
    });
  };

  const handleAddJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newJourney.name) return;
    const journey = { ...newJourney, id: Date.now().toString() } as WorkSchedule;
    await updateDoc(doc(db, "companies", company.id), {
      schedules: arrayUnion(journey)
    });
    setNewJourney({ name: '', weeklyHours: 44, toleranceMinutes: 10, overtimePercentage: 50, nightShiftPercentage: 20 });
    setShowJourneyModal(false);
    alert("Nova Escala de Trabalho criada!");
  };

  const handleDeleteJourney = async (j: WorkSchedule) => {
    if (!company || !confirm(`Remover a escala "${j.name}"? Funcionários vinculados a ela ficarão sem escala definida.`)) return;
    await updateDoc(doc(db, "companies", company.id), {
      schedules: arrayRemove(j)
    });
  };

  const handleAddVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newVacation.employeeId || !newVacation.startDate) return;
    const emp = employees.find(e => e.id === newVacation.employeeId);
    await addDoc(collection(db, "vacations"), {
      ...newVacation,
      employeeName: emp?.name || 'Desconhecido',
      companyCode: company.id,
      status: 'planned'
    });
    setShowVacationModal(false);
    setNewVacation({ employeeId: '', startDate: '', endDate: '' });
    alert("Férias agendadas!");
  };

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
    setNewEmpData({ name: '', email: '', matricula: '', password: '', cpf: '', phone: '', department: '', roleFunction: '', workShift: '', scheduleId: '', photo: '' });
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
          {(['colaboradores', 'aprovacoes', 'calendario', 'jornada', 'ferias', 'contabilidade'] as const).map(t => (
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
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipe ForTime</h3>
                  <span className="text-[9px] font-black text-primary bg-primary-light px-2 py-1 rounded-lg">
                    {employees.filter(e => e.hasFacialRecord).length} / {employees.length} BIOMETRIAS OK
                  </span>
               </div>
               
               <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Buscar por Nome ou Matrícula..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
                  />
               </div>

               <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                 Novo Colaborador +
               </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Lista de Funcionários</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{filteredEmployees.length} Encontrados</p>
              </div>
              
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-11 h-11 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                       <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${e.hasFacialRecord ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'}`}></span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate w-32">{e.name}</p>
                      <p className="text-[8px] font-semibold text-primary uppercase tracking-tighter">
                        MAT: {e.matricula} • {e.roleFunction || 'S/ Cargo'}
                      </p>
                      <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">
                        Escala: {company?.schedules?.find(s => s.id === e.scheduleId)?.name || 'Padrão'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setEditingEmp(e)} className="bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white p-2.5 rounded-xl transition-all">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                </div>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-10">
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum colaborador encontrado</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'jornada' && (
          <div className="space-y-6">
            <button onClick={() => setShowJourneyModal(true)} className="w-full bg-white p-6 rounded-[32px] border-2 border-dashed border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
               ➕ Criar Nova Escala / Grupo
            </button>

            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Escalas Cadastradas</h3>
               {company?.schedules?.length ? company.schedules.map(j => (
                 <div key={j.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 relative">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="text-sm font-bold text-slate-800">{j.name}</h4>
                          <p className="text-[9px] text-primary font-bold uppercase tracking-wider">{j.weeklyHours}h Semanais • Tolerância: {j.toleranceMinutes}min</p>
                       </div>
                       <button onClick={() => handleDeleteJourney(j)} className="text-red-400 text-xs">Remover</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                       <div className="text-center bg-slate-50 p-2 rounded-xl">
                          <p className="text-[8px] text-slate-400 font-bold uppercase">H. Extra</p>
                          <p className="text-[10px] font-black text-slate-700">{j.overtimePercentage}%</p>
                       </div>
                       <div className="text-center bg-slate-50 p-2 rounded-xl">
                          <p className="text-[8px] text-slate-400 font-bold uppercase">Ad. Noturno</p>
                          <p className="text-[10px] font-black text-slate-700">{j.nightShiftPercentage}%</p>
                       </div>
                    </div>
                    <p className="text-[8px] text-slate-300 font-bold uppercase text-center italic">
                      {employees.filter(e => e.scheduleId === j.id).length} Funcionários vinculados
                    </p>
                 </div>
               )) : (
                 <p className="text-center text-[10px] text-slate-400 py-10 uppercase font-bold tracking-widest">Nenhuma escala personalizada criada</p>
               )}
            </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Adicionar Feriado / Parada</h3>
               <form onSubmit={handleAddHoliday} className="space-y-3">
                  <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                  <input type="text" placeholder="Descrição (Ex: Natal)" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100" />
                  <select value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold outline-none border border-slate-100">
                    <option value="feriado">Feriado Nacional/Estadual</option>
                    <option value="parada">Parada Técnica / Interna</option>
                  </select>
                  <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Salvar Feriado</button>
               </form>
            </div>

            <div className="space-y-3">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Calendário Cadastrado</h3>
               {company?.holidays?.length ? company.holidays.map(h => (
                 <div key={h.id} className="bg-white p-5 rounded-[32px] border border-slate-100 flex items-center justify-between">
                    <div>
                       <p className="text-[11px] font-bold text-slate-800 uppercase">{h.description}</p>
                       <p className="text-[8px] text-primary font-bold">{new Date(h.date).toLocaleDateString()} • {h.type.toUpperCase()}</p>
                    </div>
                    <button onClick={() => handleDeleteHoliday(h)} className="text-red-400 p-2">✕</button>
                 </div>
               )) : (
                 <p className="text-center text-[10px] text-slate-400 py-10 uppercase font-bold tracking-widest">Nenhum feriado cadastrado</p>
               )}
            </div>
          </div>
        )}

        {tab === 'ferias' && (
           <div className="space-y-6">
              <button onClick={() => setShowVacationModal(true)} className="w-full bg-white p-6 rounded-[32px] border-2 border-dashed border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                 🏖️ Agendar Novas Férias
              </button>

              <div className="space-y-3">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Férias em Andamento / Planejadas</h3>
                 {vacations.length ? vacations.map(v => (
                   <div key={v.id} className="bg-white p-5 rounded-[32px] border border-slate-100 flex justify-between items-center shadow-sm">
                      <div>
                         <p className="text-[11px] font-bold text-slate-800 uppercase">{v.employeeName}</p>
                         <p className="text-[8px] text-primary font-bold">{new Date(v.startDate).toLocaleDateString()} até {new Date(v.endDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-[8px] px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg font-black uppercase">{v.status}</span>
                   </div>
                 )) : (
                    <p className="text-center text-[10px] text-slate-400 py-10 uppercase font-bold tracking-widest">Nenhuma escala de férias encontrada</p>
                 )}
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

      {/* MODAL ADICIONAR JORNADA */}
      {showJourneyModal && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Nova Escala / Grupo</h3>
            <form onSubmit={handleAddJourney} className="space-y-4">
               <input type="text" placeholder="Nome da Escala (Ex: Turno Noite)" value={newJourney.name} onChange={e => setNewJourney({...newJourney, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" required />
               <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Carga Horária Semanal</label>
                  <input type="number" value={newJourney.weeklyHours} onChange={e => setNewJourney({...newJourney, weeklyHours: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold" />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">% Extra</label>
                    <input type="number" value={newJourney.overtimePercentage} onChange={e => setNewJourney({...newJourney, overtimePercentage: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Tolerância (min)</label>
                    <input type="number" value={newJourney.toleranceMinutes} onChange={e => setNewJourney({...newJourney, toleranceMinutes: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-bold" />
                  </div>
               </div>
               <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Criar Escala</button>
               <button type="button" onClick={() => setShowJourneyModal(false)} className="w-full text-[10px] text-slate-400 uppercase font-bold">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Novo Colaborador</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <input type="text" placeholder="Nome Completo *" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" required />
              <input type="text" placeholder="Matrícula *" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" required />
              <div className="space-y-1">
                 <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Escala / Grupo de Trabalho</label>
                 <select value={newEmpData.scheduleId} onChange={e => setNewEmpData({...newEmpData, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100">
                    <option value="">Nenhuma (Escala Padrão)</option>
                    {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <input type="text" placeholder="Definir Senha de Acesso *" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-primary-light border border-primary/20 rounded-2xl text-[11px] font-bold text-primary" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Salvar Cadastro</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR */}
      {editingEmp && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-white pb-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Editar Colaborador</h3>
              <button onClick={() => setEditingEmp(null)} className="text-slate-300 text-xl">✕</button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <input type="text" placeholder="Nome" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" />
              <input type="text" placeholder="Matrícula" value={editingEmp.matricula} onChange={e => setEditingEmp({...editingEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" />
              
              <div className="space-y-1">
                 <label className="text-[8px] font-bold text-slate-400 uppercase ml-2">Escala / Grupo de Trabalho</label>
                 <select value={editingEmp.scheduleId || ''} onChange={e => setEditingEmp({...editingEmp, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100">
                    <option value="">Nenhuma (Escala Padrão)</option>
                    {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>

              <input type="text" placeholder="Nova Senha" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-primary-light border border-primary/20 rounded-2xl text-[11px] font-bold text-primary" />
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { if(confirm("Deseja mesmo excluir?")) { onDeleteEmployee(editingEmp.id); setEditingEmp(null); } }} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[9px]">Excluir</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black uppercase text-[9px] shadow-lg">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR FÉRIAS */}
      {showVacationModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Agendar Férias</h3>
            <form onSubmit={handleAddVacation} className="space-y-4">
              <select value={newVacation.employeeId} onChange={e => setNewVacation({...newVacation, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100">
                <option value="">Selecione o Colaborador</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.matricula})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                 <input type="date" value={newVacation.startDate} onChange={e => setNewVacation({...newVacation, startDate: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" />
                 <input type="date" value={newVacation.endDate} onChange={e => setNewVacation({...newVacation, endDate: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-semibold border border-slate-100" />
              </div>
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Confirmar Período</button>
              <button type="button" onClick={() => setShowVacationModal(false)} className="w-full text-[10px] text-slate-400 uppercase font-bold">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
