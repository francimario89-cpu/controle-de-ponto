
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
    alert("FERIADO ADICIONADO!");
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
    return totalMs / (1000 * 60 * 60);
  };

  const formatHours = (decimal: number) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  // Lógica de Calendário
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    
    // Dias vazios do mês anterior
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-12 md:h-20 bg-slate-50/50 dark:bg-slate-900/20"></div>);
    
    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const holiday = company?.holidays?.find(h => h.date === dateStr);
      days.push(
        <div key={d} className="h-12 md:h-20 flex flex-col items-center justify-center relative border border-slate-50 dark:border-slate-800/30">
          <span className={`text-[10px] md:text-xs font-black ${holiday ? 'text-white bg-primary w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}>
            {d}
          </span>
          {holiday && (
            <span className="hidden md:block text-[7px] font-black text-primary uppercase mt-1 truncate w-full text-center px-1">
              {holiday.description}
            </span>
          )}
        </div>
      );
    }
    return days;
  };

  const getHolidaysByMonth = (date: Date) => {
    return company?.holidays?.filter(h => {
      const hDate = new Date(h.date + 'T00:00:00');
      return hDate.getMonth() === date.getMonth() && hDate.getFullYear() === date.getFullYear();
    }) || [];
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

  // Estatísticas de Contabilidade
  const totalHoursAll = latestRecords.reduce((acc, rec) => {
    // Cálculo simplificado de horas totais registradas na empresa
    return acc + 1; // apenas contagem de batidas para exemplo
  }, 0);

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
      {/* BARRA DE TABS SUPERIOR */}
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20 transition-all">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max shadow-inner">
          {(['relatorio', 'colaboradores', 'jornada', 'calendario', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] md:text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 space-y-6">
        
        {/* BUSCA */}
        {(tab === 'relatorio' || tab === 'colaboradores') && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
             <input type="text" placeholder="BUSCAR POR NOME OU MATRÍCULA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none focus:border-primary transition-all" />
             {tab === 'relatorio' && (
               <button onClick={() => handleDownloadCSV(filteredRecords, 'Relatorio_Completo.csv')} className="bg-slate-900 text-white p-4 rounded-2xl text-lg shadow-lg active:scale-90 transition-all">📥</button>
             )}
          </div>
        )}

        {/* RELATÓRIO GERAL DE BATIDAS */}
        {tab === 'relatorio' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {filteredRecords.map(record => (
              <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                <img src={record.photo} onClick={() => setSelectedPhoto(record.photo)} className="w-16 h-16 rounded-2xl object-cover cursor-pointer border-2 border-slate-100 dark:border-slate-700 shadow-sm" />
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

        {/* EQUIPE / GESTÃO */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all">CADASTRAR NOVO COLABORADOR +</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate w-32 md:w-48">{e.name}</p>
                      <p className="text-[8px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewingHistory(e)} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 w-10 h-10 flex items-center justify-center rounded-xl text-lg hover:bg-indigo-500 hover:text-white transition-all">👁</button>
                    <button onClick={() => setEditingEmp(e)} className="bg-slate-100 dark:bg-slate-900 text-slate-500 w-10 h-10 flex items-center justify-center rounded-xl text-sm hover:bg-slate-700 hover:text-white transition-all">✎</button>
                    <button onClick={() => onDeleteEmployee(e.id)} className="bg-red-50 text-red-500 w-10 h-10 flex items-center justify-center rounded-xl text-sm hover:bg-red-500 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDÁRIO ATUALIZADO */}
        {tab === 'calendario' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[44px] p-6 md:p-10 shadow-2xl border dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary font-black text-xl hover:bg-primary hover:text-white transition-all">‹</button>
                <div className="text-center">
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] dark:text-white">{viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">{getHolidaysByMonth(viewDate).length} FERIADOS NESTE MÊS</p>
                </div>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary font-black text-xl hover:bg-primary hover:text-white transition-all">›</button>
              </div>
              <div className="grid grid-cols-7 gap-0 border-t border-l dark:border-slate-800/50">
                {['DOM','SEG','TER','QUA','QUI','SEX','SAB'].map((d, i) => (
                  <div key={i} className="h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r border-b dark:border-slate-800/50 text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                ))}
                {renderCalendar(viewDate)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Feriados no Mês</h4>
               <div className="space-y-2">
                 {getHolidaysByMonth(viewDate).map(h => (
                   <div key={h.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                     <span className="text-[10px] font-black uppercase dark:text-white">{h.description}</span>
                     <span className="text-[10px] font-black text-primary">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                   </div>
                 ))}
                 {getHolidaysByMonth(viewDate).length === 0 && <p className="text-[9px] font-black opacity-30 text-center py-4 uppercase">Sem feriados registrados</p>}
               </div>
               <button onClick={() => setShowHolidayModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">ADICIONAR FERIADO +</button>
            </div>
          </div>
        )}

        {/* ABA FÉRIAS (FERIADOS DO MÊS ATUAL) */}
        {tab === 'ferias' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-orange-50 dark:bg-orange-950/20 p-8 rounded-[44px] border border-orange-100 dark:border-orange-900/30 text-center">
               <span className="text-4xl mb-4 block">🏖️</span>
               <h4 className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">Feriados Ativos de {new Date().toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</h4>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Consulte folgas programadas</p>
               <div className="space-y-3 max-w-sm mx-auto">
                 {getHolidaysByMonth(new Date()).map(h => (
                   <div key={h.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex justify-between items-center shadow-sm border dark:border-slate-700">
                     <div className="text-left">
                        <p className="text-[10px] font-black uppercase dark:text-white">{h.description}</p>
                        <p className="text-[8px] font-black text-primary mt-0.5">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                     </div>
                     <span className="text-xl">📅</span>
                   </div>
                 ))}
                 {getHolidaysByMonth(new Date()).length === 0 && (
                   <div className="py-10 opacity-20 text-[10px] font-black uppercase tracking-widest">Nenhum feriado este mês</div>
                 )}
               </div>
             </div>
             
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border-2 border-dashed border-primary/20 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Escala de Férias 2024/2025</p>
                <p className="text-[9px] text-slate-500 mb-6 max-w-[200px]">Acompanhe o planejamento anual de descanso da sua equipe.</p>
                <button className="bg-slate-100 dark:bg-slate-900 text-slate-400 px-6 py-3 rounded-2xl text-[9px] font-black uppercase cursor-not-allowed">Módulo em Atualização</button>
             </div>
          </div>
        )}

        {/* CONTABILIDADE / FINANCEIRO */}
        {tab === 'contabilidade' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-slate-900 text-white p-8 rounded-[44px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/40 transition-all"></div>
                  <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em] mb-2">Total de Batidas</p>
                  <h4 className="text-5xl font-black tracking-tighter mb-2">{latestRecords.length}</h4>
                  <p className="text-[8px] font-black text-primary uppercase">Registros no ciclo atual</p>
               </div>
               <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border dark:border-slate-700 shadow-xl flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Custo RH Estimado</p>
                  <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">R$ {(latestRecords.length * 15.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                  <p className="text-[8px] font-black text-emerald-500 mt-2 uppercase">● Projeção Financeira Ativa</p>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border dark:border-slate-700 shadow-sm space-y-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">📑</div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest dark:text-white">Relatórios Contábeis</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Arquivos prontos para importação</p>
                  </div>
               </div>
               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                 O ForTime PRO gera arquivos compatíveis com os principais softwares de contabilidade e folha de pagamento. 
                 Todos os registros possuem assinatura digital única garantindo a integridade dos dados para o Ministério do Trabalho.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => handleDownloadCSV(latestRecords, 'Exportacao_Folha_Pagamento.csv')} className="bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-lg hover:bg-black transition-all">Folha de Pagamento (.csv)</button>
                  <button className="bg-slate-100 dark:bg-slate-900 text-slate-400 py-5 rounded-3xl font-black uppercase text-[10px] cursor-not-allowed">Integração ERP (.json)</button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ESPELHO DE PONTO INDIVIDUAL (DETALHADO EM TABELA) */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in duration-300">
           <header className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center shrink-0">
              <button onClick={() => setViewingHistory(null)} className="text-white text-2xl p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">✕</button>
              <div className="text-center">
                 <h2 className="text-white font-black uppercase text-[10px] md:text-xs tracking-[0.4em] opacity-40 mb-1">ESPELHO DE PONTO OFICIAL</h2>
                 <p className="text-primary text-xl md:text-3xl font-black uppercase tracking-tight">{viewingHistory.name}</p>
              </div>
              <button onClick={() => handleDownloadCSV(latestRecords.filter(r => r.matricula === viewingHistory.matricula), `ESPELHO_${viewingHistory.name}.csv`)} className="bg-primary text-white p-4 rounded-2xl text-xl shadow-2xl active:scale-90 transition-all">📥</button>
           </header>
           
           <div className="p-6 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto w-full">
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                 <p className="text-[9px] font-black text-white/30 uppercase mb-1">FUNÇÃO / CARGO</p>
                 <p className="text-[11px] font-black text-white uppercase">{viewingHistory.roleFunction || 'COLABORADOR GERAL'}</p>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                 <p className="text-[9px] font-black text-white/30 uppercase mb-1">MATRÍCULA</p>
                 <p className="text-[11px] font-black text-white uppercase">{viewingHistory.matricula}</p>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                 <p className="text-[9px] font-black text-white/30 uppercase mb-1">ADMISSÃO</p>
                 <p className="text-[11px] font-black text-white uppercase">{viewingHistory.admissionDate || '--/--/----'}</p>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                 <p className="text-[9px] font-black text-white/30 uppercase mb-1">DEPTO</p>
                 <p className="text-[11px] font-black text-white uppercase">{viewingHistory.department || 'PADRÃO'}</p>
              </div>
           </div>

           <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar pb-20 px-6 max-w-6xl mx-auto w-full">
              <div className="min-w-[600px]">
                <table className="w-full text-left border-separate border-spacing-y-3">
                   <thead>
                      <tr className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em]">
                         <th className="pb-4 pl-6">DATA</th>
                         <th className="pb-4">HISTÓRICO DE BATIDAS (ORDEM CRONOLÓGICA)</th>
                         <th className="pb-4 text-center">TOTAL HRs</th>
                         <th className="pb-4 text-right pr-6">STATUS</th>
                      </tr>
                   </thead>
                   <tbody>
                      {getIndividualMirror(viewingHistory.matricula).map(([date, recs]) => {
                         const dayHours = calculateDayStats(recs);
                         return (
                            <tr key={date} className="bg-white/5 hover:bg-white/10 transition-all group">
                               <td className="py-6 pl-6 rounded-l-[32px] border-l border-t border-b border-white/5">
                                  <div className="flex flex-col">
                                    <span className="text-white font-black text-[12px]">{date}</span>
                                    <span className="text-[8px] font-black text-white/20 uppercase mt-1">
                                      {new Date(date.split('/').reverse().join('-')).toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0]}
                                    </span>
                                  </div>
                               </td>
                               <td className="py-6 border-t border-b border-white/5">
                                  <div className="flex flex-wrap gap-2">
                                     {recs.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()).map((r) => (
                                        <div key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${r.type === 'entrada' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                           <span className="text-[11px] font-black">{r.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                           <span className="text-[7px] font-black uppercase opacity-60">{r.type === 'entrada' ? 'ENT' : 'SAI'}</span>
                                        </div>
                                     ))}
                                  </div>
                               </td>
                               <td className="py-6 text-center border-t border-b border-white/5">
                                  <span className={`font-black text-[13px] ${dayHours > 8 ? 'text-orange-500' : 'text-primary'}`}>
                                    {formatHours(dayHours)}
                                  </span>
                               </td>
                               <td className="py-6 text-right pr-6 rounded-r-[32px] border-r border-t border-b border-white/5">
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full uppercase">Sincronizado</span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
                {getIndividualMirror(viewingHistory.matricula).length === 0 && (
                   <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-[44px]">
                      <span className="text-5xl mb-4 block">🔍</span>
                      <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.5em]">Nenhum registro encontrado para este período</p>
                   </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* MODAL AMPLIAR FOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <div className="relative animate-in zoom-in duration-300">
             <img src={selectedPhoto} className="max-w-full max-h-[85vh] rounded-[50px] shadow-2xl border-8 border-white/10" />
             <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-3 rounded-full text-white">✕</div>
           </div>
           <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-8 animate-pulse">Toque para fechar a imagem</p>
        </div>
      )}

      {/* MODAIS DE CADASTRO */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase text-center mb-6 tracking-widest">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border border-transparent focus:border-primary transition-all dark:text-white" required />
              <input type="text" placeholder="MATRÍCULA / ID" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border border-transparent focus:border-primary transition-all dark:text-white" required />
              <input type="password" placeholder="SENHA DE ACESSO" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-5 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-3xl text-[12px] font-black text-primary outline-none" required />
              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 transition-all">SALVAR REGISTRO</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">VOLTAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHolidayModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase text-center mb-6 tracking-widest">NOVO FERIADO</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddHoliday(); }} className="space-y-4">
              <input type="date" onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="text" placeholder="DESCRIÇÃO DO FERIADO" onChange={e => setNewHoliday({...newHoliday, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">SALVAR FERIADO</button>
              <button type="button" onClick={() => setShowHolidayModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
