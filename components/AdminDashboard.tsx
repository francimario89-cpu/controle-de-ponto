
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
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
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

  const removeJourney = async (journey: WorkSchedule) => {
    if (!company?.id || !confirm("EXCLUIR ESTA ESCALA?")) return;
    await updateDoc(doc(db, "companies", company.id), {
      schedules: arrayRemove(journey)
    });
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

  const filteredRecords = latestRecords.filter(r => 
    r.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.matricula?.includes(searchTerm)
  );

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  // Lógica de Calendário
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-14"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const holiday = company?.holidays?.find(h => h.date === dateStr);
      days.push(
        <div key={d} className="h-14 flex flex-col items-center justify-center relative border border-slate-50 dark:border-slate-800/50">
          <span className={`text-[10px] font-black ${holiday ? 'text-white bg-primary w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400 dark:text-slate-600'}`}>
            {d}
          </span>
          {holiday && <span className="text-[5px] font-black text-primary uppercase mt-1 truncate w-full text-center px-1">{holiday.description}</span>}
        </div>
      );
    }
    return days;
  };

  const holidaysCurrentMonth = company?.holidays?.filter(h => {
    const d = new Date(h.date + 'T00:00:00');
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }) || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      {/* NAVEGAÇÃO SUPERIOR */}
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
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate w-32">{e.name}</p>
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

        {/* CALENDÁRIO */}
        {tab === 'calendario' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 shadow-xl border dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-2 text-primary font-black text-xl">‹</button>
                <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-2 text-primary font-black text-xl">›</button>
              </div>
              <div className="grid grid-cols-7 gap-0 border-t border-l dark:border-slate-800">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (<div key={i} className="h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r border-b dark:border-slate-800 text-[9px] font-black text-slate-400">{d}</div>))}
                {renderCalendar(viewDate)}
              </div>
            </div>
            <button onClick={() => setShowHolidayModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg">NOVO FERIADO +</button>
          </div>
        )}

        {/* FÉRIAS & FERIADOS DO MÊS */}
        {tab === 'ferias' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[32px] border border-orange-100 dark:border-orange-900/30">
               <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">Feriados do Mês Atual</h4>
               <div className="space-y-2">
                 {holidaysCurrentMonth.map(h => (
                   <div key={h.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex justify-between items-center shadow-sm">
                     <span className="text-[10px] font-black uppercase dark:text-white">{h.description}</span>
                     <span className="text-[9px] font-black text-orange-500">{new Date(h.date + 'T00:00:00').toLocaleDateString()}</span>
                   </div>
                 ))}
                 {holidaysCurrentMonth.length === 0 && <p className="text-[9px] font-black opacity-30 uppercase text-center py-4">Sem feriados este mês</p>}
               </div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border-2 border-dashed border-primary/20 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gestão de Férias</p>
                <button className="text-[11px] font-black text-primary uppercase">Módulo em breve ➔</button>
             </div>
          </div>
        )}

        {/* CONTABILIDADE */}
        {tab === 'contabilidade' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl">
                  <p className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1">Horas Registradas</p>
                  <h4 className="text-2xl font-black">{Math.floor(latestRecords.length * 4)}h*</h4>
                  <p className="text-[7px] font-black text-primary mt-2 uppercase">*Estimado p/ Mês</p>
               </div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Est. RH</p>
                  <h4 className="text-xl font-black text-slate-800 dark:text-white">R$ --,--</h4>
                  <p className="text-[7px] font-black text-emerald-500 mt-2 uppercase">Integrado ao eSocial</p>
               </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 space-y-4">
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resumo Financeiro</h4>
               <p className="text-[9px] text-slate-500 font-black leading-relaxed">
                 O módulo contábil compila as batidas oficiais do mês para gerar a folha de pagamento automaticamente. 
                 Verifique se todas as batidas possuem assinatura digital.
               </p>
               <button onClick={() => handleDownloadCSV(latestRecords, 'Exportacao_Contabil.csv')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">EXPORTAR P/ CONTABILIDADE</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL HISTÓRICO INDIVIDUAL */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[210] bg-slate-950/95 backdrop-blur-md flex flex-col p-6 overflow-hidden">
           <div className="max-w-md mx-auto w-full h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <button onClick={() => setViewingHistory(null)} className="text-white text-xl">✕</button>
                 <h2 className="text-white font-black uppercase text-xs tracking-widest">Histórico: {viewingHistory.name}</h2>
                 <button onClick={() => handleDownloadCSV(latestRecords.filter(r => r.matricula === viewingHistory.matricula), `Historico_${viewingHistory.name}.csv`)} className="bg-primary text-white p-2 rounded-xl text-sm">📥</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                 {latestRecords.filter(r => r.matricula === viewingHistory.matricula).map(rec => (
                   <div key={rec.id} className="bg-white/10 p-4 rounded-3xl flex items-center gap-4">
                      <img src={rec.photo} onClick={() => setSelectedPhoto(rec.photo)} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="text-white font-black text-[10px] uppercase">{rec.timestamp.toLocaleDateString()} - {rec.timestamp.toLocaleTimeString()}</p>
                        <p className="text-primary text-[8px] font-black uppercase">{rec.type}</p>
                        <p className="text-white/40 text-[7px] truncate w-40">{rec.address}</p>
                      </div>
                   </div>
                 ))}
                 {latestRecords.filter(r => r.matricula === viewingHistory.matricula).length === 0 && (
                   <p className="text-center text-white/20 text-[10px] font-black uppercase py-20">Sem batidas registradas</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* MODAIS GLOBAIS (FOTO / EDITAR / NOVO) */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <img src={selectedPhoto} className="max-w-full max-h-[80vh] rounded-[40px] shadow-2xl border-4 border-white/10" />
        </div>
      )}

      {editingEmp && (
        <div className="fixed inset-0 z-[250] bg-slate-900/90 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center mb-4">EDITAR COLABORADOR</h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <input type="text" placeholder="NOME" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" value={editingEmp.matricula} onChange={e => setEditingEmp({...editingEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <select value={editingEmp.scheduleId || ''} onChange={e => setEditingEmp({...editingEmp, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none">
                <option value="">VINCULAR À UMA JORNADA</option>
                {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">VOLTAR</button>
                <button type="submit" className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px]">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center mb-4">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="password" placeholder="SENHA INICIAL" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-900 border border-primary/10 rounded-2xl text-[11px] font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl">CADASTRAR</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </form>
          </div>
        </div>
      )}

      {showJourneyModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center mb-4">CADASTRAR JORNADA</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddJourney(); }} className="space-y-4">
              <input type="text" placeholder="NOME (EX: 12X36, COMERCIAL)" onChange={e => setNewJourney({...newJourney, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="number" placeholder="HORAS SEMANAIS" onChange={e => setNewJourney({...newJourney, weeklyHours: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl">CRIAR JORNADA</button>
              <button type="button" onClick={() => setShowJourneyModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">VOLTAR</button>
            </form>
          </div>
        </div>
      )}

      {showHolidayModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/80 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center mb-4">NOVO FERIADO</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddHoliday(); }} className="space-y-4">
              <input type="date" onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <input type="text" placeholder="NOME DO FERIADO" onChange={e => setNewHoliday({...newHoliday, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl">SALVAR</button>
              <button type="button" onClick={() => setShowHolidayModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
