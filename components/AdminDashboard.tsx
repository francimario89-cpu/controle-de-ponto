
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, WorkSchedule } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc, getDocs } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Calendário & Jornada
  const [viewDate, setViewDate] = useState(new Date());
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [newJourney, setNewJourney] = useState<Partial<WorkSchedule>>({ name: '', weeklyHours: 44, toleranceMinutes: 10 });
  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({ name: '', matricula: '', password: '', scheduleId: '', roleFunction: '', department: '' });

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const unsubReq = onSnapshot(query(collection(db, "requests"), where("companyCode", "==", company.id)), (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
    return () => unsubReq();
  }, [company?.id]);

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      const empRef = doc(db, "employees", editingEmp.id);
      await updateDoc(empRef, { ...editingEmp });
      setEditingEmp(null);
      alert("COLABORADOR ATUALIZADO!");
    } catch (err) {
      alert("ERRO AO ATUALIZAR");
    }
  };

  const handleAddJourney = async () => {
    if (!newJourney.name || !company?.id) return;
    const journey: WorkSchedule = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: newJourney.name.toUpperCase(),
      weeklyHours: Number(newJourney.weeklyHours) || 44,
      toleranceMinutes: Number(newJourney.toleranceMinutes) || 10,
      overtimePercentage: 50,
      nightShiftPercentage: 20
    };
    await updateDoc(doc(db, "companies", company.id), {
      schedules: arrayUnion(journey)
    });
    setShowJourneyModal(false);
    setNewJourney({ name: '', weeklyHours: 44, toleranceMinutes: 10 });
    alert("JORNADA CRIADA!");
  };

  const removeJourney = async (journey: WorkSchedule) => {
    if (!company?.id || !confirm("EXCLUIR ESTA ESCALA?")) return;
    await updateDoc(doc(db, "companies", company.id), {
      schedules: arrayRemove(journey)
    });
  };

  const filteredRecords = latestRecords.filter(r => 
    r.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.matricula?.includes(searchTerm)
  );

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      {/* TABS NAVEGAÇÃO */}
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20 transition-colors">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max">
          {(['relatorio', 'colaboradores', 'aprovacoes', 'jornada', 'calendario'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t === 'aprovacoes' ? `PEDIDOS (${requests.length})` : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        
        {/* BUSCA GLOBAL */}
        {(tab === 'relatorio' || tab === 'colaboradores') && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm">
             <input type="text" placeholder="BUSCAR POR NOME OU MATRÍCULA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
          </div>
        )}

        {/* ABA RELATÓRIO (LOG DE BATIDAS COM FOTO) */}
        {tab === 'relatorio' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {filteredRecords.map(record => (
              <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="relative group cursor-pointer shrink-0" onClick={() => setSelectedPhoto(record.photo)}>
                   <img src={record.photo} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-700" />
                   <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[8px] font-black">VER</span>
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{record.userName}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${record.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {record.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[9px] font-black text-primary mt-0.5">{record.timestamp.toLocaleDateString()} - {record.timestamp.toLocaleTimeString()}</p>
                  <p className="text-[8px] text-slate-400 mt-1 truncate uppercase">📍 {record.address}</p>
                </div>
              </div>
            ))}
            {filteredRecords.length === 0 && <p className="text-center py-20 opacity-30 text-[10px] font-black uppercase tracking-widest">Nenhuma batida encontrada</p>}
          </div>
        )}

        {/* ABA EQUIPE (EDITAR/EXCLUIR) */}
        {tab === 'colaboradores' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">NOVO COLABORADOR +</button>
            <div className="space-y-3">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-11 h-11 rounded-2xl object-cover" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate w-32 uppercase">{e.name}</p>
                      <p className="text-[8px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingEmp(e)} className="bg-slate-100 dark:bg-slate-900 text-slate-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm">✎</button>
                    <button onClick={() => onDeleteEmployee(e.id)} className="bg-red-50 text-red-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA JORNADA */}
        {tab === 'jornada' && (
          <div className="space-y-4 animate-in fade-in duration-300">
             <button onClick={() => setShowJourneyModal(true)} className="w-full p-8 border-2 border-dashed border-primary/20 rounded-[40px] text-primary text-[10px] font-black uppercase">➕ NOVA ESCALA / JORNADA</button>
             <div className="space-y-3">
               {company?.schedules?.map(s => (
                 <div key={s.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 flex justify-between items-center shadow-sm">
                   <div>
                     <p className="text-[10px] font-black uppercase dark:text-white">{s.name}</p>
                     <p className="text-[8px] font-black text-primary mt-1">{s.weeklyHours}H SEMANAIS • TOLERÂNCIA {s.toleranceMinutes}M</p>
                   </div>
                   <button onClick={() => removeJourney(s)} className="text-red-400 font-black p-2">✕</button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* MODAL AMPLIAR FOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 flex items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <div className="relative max-w-sm w-full animate-in zoom-in duration-300">
              <img src={selectedPhoto} className="w-full rounded-[60px] border-8 border-white/10 shadow-2xl" />
              <p className="text-center text-white/40 text-[10px] font-black uppercase tracking-widest mt-6">CLIQUE PARA FECHAR</p>
           </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR */}
      {editingEmp && (
        <div className="fixed inset-0 z-[160] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">EDITAR COLABORADOR</h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <input type="text" placeholder="NOME" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" value={editingEmp.matricula} onChange={e => setEditingEmp({...editingEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <select value={editingEmp.scheduleId || ''} onChange={e => setEditingEmp({...editingEmp, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black dark:text-white outline-none">
                <option value="">VINCULAR À UMA JORNADA</option>
                {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
                <button type="submit" className="flex-2 bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">NOVO MEMBRO</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-2xl text-[11px] font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">SALVAR</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">VOLTAR</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA JORNADA */}
      {showJourneyModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">CADASTRAR JORNADA</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddJourney(); }} className="space-y-4">
              <input type="text" placeholder="NOME (EX: 12X36, 08:00 ÀS 18:00)" onChange={e => setNewJourney({...newJourney, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="number" placeholder="HORAS SEMANAIS" onChange={e => setNewJourney({...newJourney, weeklyHours: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="number" placeholder="TOLERÂNCIA (MINUTOS)" onChange={e => setNewJourney({...newJourney, toleranceMinutes: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">CRIAR JORNADA</button>
              <button type="button" onClick={() => setShowJourneyModal(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
