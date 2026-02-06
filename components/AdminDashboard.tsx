
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, WorkSchedule } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc } from "firebase/firestore";

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
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
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

  const handleDownloadCSV = (recs: PointRecord[], filename = 'Relatorio_Ponto.csv') => {
    if (recs.length === 0) return alert("Sem registros.");
    let csv = "\uFEFF"; 
    csv += "Nome;Matricula;Data;Hora;Tipo;Endereco;Assinatura\n";
    const sorted = [...recs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    sorted.forEach(r => {
      csv += `${r.userName};${r.matricula};${r.timestamp.toLocaleDateString()};${r.timestamp.toLocaleTimeString()};${r.type.toUpperCase()};"${r.address}";${r.digitalSignature}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const calculateDayStats = (dayRecords: PointRecord[]) => {
    const sorted = [...dayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let totalMs = 0;
    for (let i = 0; i < sorted.length; i += 2) {
      const entry = sorted[i];
      const exit = sorted[i + 1];
      if (entry && exit) {
        totalMs += exit.timestamp.getTime() - entry.timestamp.getTime();
      }
    }
    const totalHours = totalMs / (1000 * 60 * 60);
    return totalHours;
  };

  const formatHours = (decimal: number) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  const getIndividualMirror = (empMatricula: string) => {
    const empRecords = latestRecords.filter(r => r.matricula === empMatricula);
    const grouped: { [key: string]: PointRecord[] } = {};
    empRecords.forEach(r => {
      const day = r.timestamp.toLocaleDateString('pt-BR');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(r);
    });
    return Object.entries(grouped).sort((a, b) => {
        const dateA = new Date(a[0].split('/').reverse().join('-'));
        const dateB = new Date(b[0].split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
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
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max">
          {(['relatorio', 'colaboradores', 'jornada', 'calendario', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        {/* BUSCA */}
        {(tab === 'relatorio' || tab === 'colaboradores') && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
             <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
             {tab === 'relatorio' && (
               <button onClick={() => handleDownloadCSV(filteredRecords, 'Relatorio_Geral.csv')} className="bg-slate-900 text-white p-4 rounded-2xl text-lg shadow-lg">📥</button>
             )}
          </div>
        )}

        {/* BATIDAS GERAIS */}
        {tab === 'relatorio' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {filteredRecords.map(record => (
              <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4">
                <img src={record.photo} onClick={() => setSelectedPhoto(record.photo)} className="w-16 h-16 rounded-2xl object-cover cursor-pointer border-2 border-slate-100 dark:border-slate-700" />
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
          </div>
        )}

        {/* EQUIPE */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">NOVO COLABORADOR +</button>
            {filteredEmployees.map(e => (
              <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-11 h-11 rounded-2xl object-cover" />
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate w-32">{e.name}</p>
                    <p className="text-[8px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewingHistory(e)} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm">👁</button>
                  <button onClick={() => setEditingEmp(e)} className="bg-slate-100 dark:bg-slate-900 text-slate-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm">✎</button>
                  <button onClick={() => onDeleteEmployee(e.id)} className="bg-red-50 text-red-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OUTROS TABS SIMPLIFICADOS */}
        {tab === 'jornada' && (
            <div className="space-y-4">
                <button onClick={() => setShowJourneyModal(true)} className="w-full p-8 border-2 border-dashed border-primary/20 rounded-[40px] text-primary text-[10px] font-black uppercase">➕ NOVA JORNADA</button>
                {company?.schedules?.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl flex justify-between items-center border dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase dark:text-white">{s.name}</p>
                        <span className="text-[9px] font-black text-primary">{s.weeklyHours}H SEMANAIS</span>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* MODAL HISTÓRICO INDIVIDUAL (ESPELHO DE PONTO) */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden">
           <header className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <button onClick={() => setViewingHistory(null)} className="text-white text-xl p-2">✕</button>
              <div className="text-center">
                 <h2 className="text-white font-black uppercase text-[10px] tracking-widest">ESPELHO DE PONTO</h2>
                 <p className="text-primary text-[12px] font-black uppercase mt-1">{viewingHistory.name}</p>
              </div>
              <button onClick={() => handleDownloadCSV(latestRecords.filter(r => r.matricula === viewingHistory.matricula), `ESPELHO_${viewingHistory.name}.csv`)} className="bg-primary text-white p-2.5 rounded-xl text-lg">📥</button>
           </header>
           
           <div className="p-4 shrink-0 grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                 <p className="text-[8px] font-black text-white/40 uppercase mb-1">FUNÇÃO</p>
                 <p className="text-[10px] font-black text-white uppercase">{viewingHistory.roleFunction || 'GERAL'}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10">
                 <p className="text-[8px] font-black text-white/40 uppercase mb-1">MATRÍCULA</p>
                 <p className="text-[10px] font-black text-white uppercase">{viewingHistory.matricula}</p>
              </div>
           </div>

           <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar pb-10 px-4">
              <table className="w-full text-left border-separate border-spacing-y-2">
                 <thead>
                    <tr className="text-white/40 text-[8px] font-black uppercase tracking-widest">
                       <th className="pb-2 pl-4">DATA</th>
                       <th className="pb-2">ENTRADAS/SAÍDAS</th>
                       <th className="pb-2 text-right pr-4">TOTAL DIA</th>
                    </tr>
                 </thead>
                 <tbody>
                    {getIndividualMirror(viewingHistory.matricula).map(([date, recs]) => {
                       const dayHours = calculateDayStats(recs);
                       return (
                          <tr key={date} className="bg-white/5 hover:bg-white/10 transition-colors">
                             <td className="py-4 pl-4 rounded-l-3xl">
                                <span className="text-white font-black text-[10px]">{date}</span>
                             </td>
                             <td className="py-4">
                                <div className="flex flex-wrap gap-1">
                                   {recs.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()).map((r, i) => (
                                      <span key={r.id} className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${r.type === 'entrada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                         {r.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                   ))}
                                </div>
                             </td>
                             <td className="py-4 text-right pr-4 rounded-r-3xl">
                                <span className="text-primary font-black text-[10px]">{formatHours(dayHours)}</span>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
              {getIndividualMirror(viewingHistory.matricula).length === 0 && (
                 <div className="text-center py-20">
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Nenhum registro encontrado</p>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* MODAL AMPLIAR FOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <img src={selectedPhoto} className="max-w-full max-h-[80vh] rounded-[40px] shadow-2xl border-4 border-white/10" />
        </div>
      )}

      {/* MODAIS DE CADASTRO (SIMPLIFICADOS) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center mb-4">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-900 border border-primary/10 rounded-2xl text-[11px] font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl">CADASTRAR</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
