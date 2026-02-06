
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
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  
  // Estados para o Calendário
  const [viewDate, setViewDate] = useState(new Date());
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [newJourney, setNewJourney] = useState<Partial<WorkSchedule>>({ name: '', weeklyHours: 44, toleranceMinutes: 10 });
  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({ name: '', matricula: '', password: '', scheduleId: '' });

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

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name || !company?.id) return;
    const holiday: Holiday = {
      id: Date.now().toString(),
      date: newHoliday.date,
      description: newHoliday.name,
      type: 'feriado'
    };
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayUnion(holiday)
    });
    setShowHolidayModal(false);
    setNewHoliday({ date: '', name: '' });
  };

  const removeHoliday = async (holiday: Holiday) => {
    if (!company?.id) return;
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayRemove(holiday)
    });
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Espaços vazios
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-14"></div>);

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const holiday = company?.holidays?.find(h => h.date === dateStr);
      
      days.push(
        <div key={d} className="h-14 flex flex-col items-center justify-center relative border border-slate-50 dark:border-slate-800/50">
          <span className={`text-[10px] font-black ${holiday ? 'text-white bg-primary w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400 dark:text-slate-600'}`}>
            {d}
          </span>
          {holiday && (
            <span className="text-[6px] font-black text-primary uppercase mt-1 truncate w-full text-center px-1">
              {holiday.description}
            </span>
          )}
        </div>
      );
    }
    return days;
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.matricula.includes(searchTerm));

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      {/* TABS NAVEGAÇÃO */}
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'calendario', 'jornada', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'calendario' ? 'CALENDÁRIO' : t === 'aprovacoes' ? `AJUSTES (${requests.filter(r => r.status === 'pending').length})` : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        
        {/* ABA COLABORADORES */}
        {tab === 'colaboradores' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm space-y-4">
               <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
               <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">NOVO COLABORADOR +</button>
            </div>

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
                  <button onClick={() => setEditingEmp(e)} className="bg-slate-50 dark:bg-slate-900 text-slate-400 p-2.5 rounded-xl">⚙️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA CALENDÁRIO VISUAL */}
        {tab === 'calendario' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 shadow-xl border dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 text-primary font-black text-xl">‹</button>
                <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">
                  {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                </h3>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 text-primary font-black text-xl">›</button>
              </div>

              <div className="grid grid-cols-7 gap-0 border-t border-l dark:border-slate-800">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <div key={i} className="h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r border-b dark:border-slate-800 text-[9px] font-black text-slate-400">{d}</div>
                ))}
                {renderCalendar()}
              </div>
            </div>

            <button onClick={() => setShowHolidayModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg">Cadastrar Feriado +</button>

            <div className="space-y-3">
               <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Lista de Feriados</h4>
               {company?.holidays?.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                 <div key={h.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700 flex justify-between items-center shadow-sm">
                   <div>
                     <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{h.description}</p>
                     <p className="text-[8px] font-black text-primary">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                   </div>
                   <button onClick={() => removeHoliday(h)} className="text-red-400 p-2">✕</button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* OUTRAS ABAS (SIMPLIFICADAS) */}
        {tab === 'jornada' && (
          <div className="space-y-4">
             <button onClick={() => setShowJourneyModal(true)} className="w-full p-8 border-2 border-dashed border-primary/20 rounded-[40px] text-primary text-[10px] font-black uppercase">Nova Escala</button>
             {company?.schedules?.map(s => (
               <div key={s.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl flex justify-between items-center">
                 <p className="text-[10px] font-black uppercase dark:text-white">{s.name}</p>
                 <span className="text-[9px] font-black text-primary">{s.weeklyHours}H</span>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* MODAL NOVO COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">NOVO MEMBRO</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <select onChange={e => setNewEmpData({...newEmpData, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black dark:text-white outline-none">
                <option value="">ESCALA / GRUPO</option>
                {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
              </select>
              <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-2xl text-[11px] font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">SALVAR</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">VOLTAR</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO FERIADO */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">NOVO FERIADO</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddHoliday(); }} className="space-y-4">
              <input type="date" onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <input type="text" placeholder="NOME DO FERIADO" onChange={e => setNewHoliday({...newHoliday, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-black outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">SALVAR FERIADO</button>
              <button type="button" onClick={() => setShowHolidayModal(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
