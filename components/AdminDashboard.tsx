
import React, { useState, useEffect, useRef } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, Vacation, WorkSchedule } from '../types';
import { db } from '../firebase';
import { auditCompliance, generateDailyBriefingAudio, decodeBase64, decodeAudioData } from '../geminiService';
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
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [newVacation, setNewVacation] = useState({ employeeId: '', startDate: '', endDate: '' });
  const [newHoliday, setNewHoliday] = useState<Partial<Holiday>>({ date: '', description: '', type: 'feriado' });
  const [newJourney, setNewJourney] = useState<Partial<WorkSchedule>>({ name: '', weeklyHours: 44, toleranceMinutes: 10, overtimePercentage: 50, nightShiftPercentage: 20 });
  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({ name: '', email: '', matricula: '', password: '', cpf: '', phone: '', department: '', roleFunction: '', workShift: '', scheduleId: '', photo: '' });

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

  const stats = {
    present: latestRecords.filter(r => r.timestamp.toLocaleDateString() === new Date().toLocaleDateString() && r.type === 'entrada').length,
    absent: employees.length - latestRecords.filter(r => r.timestamp.toLocaleDateString() === new Date().toLocaleDateString() && r.type === 'entrada').length,
    pendingAjustes: requests.filter(r => r.status === 'pending').length
  };

  const playBriefing = async () => {
    setIsPlayingVoice(true);
    const text = `Bom dia gestor. Atualmente temos ${stats.present} colaboradores presentes e ${stats.absent} ausentes. Existem ${stats.pendingAjustes} solicitações de ajuste aguardando sua aprovação.`;
    try {
      const base64 = await generateDailyBriefingAudio(text);
      if (base64) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlayingVoice(false);
        source.start();
      }
    } catch (e) {
      console.error(e);
      setIsPlayingVoice(false);
    }
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.matricula.includes(searchTerm));

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newHoliday.date || !newHoliday.description) return;
    await updateDoc(doc(db, "companies", company.id), { holidays: arrayUnion({ ...newHoliday, id: Date.now().toString() }) });
    setNewHoliday({ date: '', description: '', type: 'feriado' });
  };

  const handleAddJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newJourney.name) return;
    await updateDoc(doc(db, "companies", company.id), { schedules: arrayUnion({ ...newJourney, id: Date.now().toString() }) });
    setNewJourney({ name: '', weeklyHours: 44, toleranceMinutes: 10, overtimePercentage: 50, nightShiftPercentage: 20 });
    setShowJourneyModal(false);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    const { id, ...data } = editingEmp;
    await updateDoc(doc(db, "employees", id), data);
    setEditingEmp(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 items-center">
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max">
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
            {/* KPI CENTER */}
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-gradient-to-br from-primary to-orange-600 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-20 text-4xl group-hover:scale-125 transition-transform">✅</div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Presentes Hoje</p>
                  <h4 className="text-3xl font-black mt-1">{stats.present}</h4>
               </div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ajustes Pendentes</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.pendingAjustes}</h4>
                  </div>
                  <button onClick={() => setTab('aprovacoes')} className="text-primary text-[8px] font-black uppercase mt-2 text-left">Ver Tudo ➔</button>
               </div>
            </div>

            {/* VOICE ASSISTANT */}
            <button onClick={playBriefing} disabled={isPlayingVoice} className={`w-full p-5 rounded-[28px] flex items-center justify-between transition-all ${isPlayingVoice ? 'bg-indigo-600 shadow-indigo-200' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm'}`}>
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isPlayingVoice ? 'bg-white text-indigo-600 animate-pulse' : 'bg-indigo-50 text-indigo-500'}`}>
                    {isPlayingVoice ? '🔊' : '🎙️'}
                  </div>
                  <div className="text-left">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isPlayingVoice ? 'text-white/70' : 'text-indigo-500'}`}>Resumo Diário por Voz</p>
                    <p className={`text-[10px] font-bold ${isPlayingVoice ? 'text-white' : 'text-slate-400'}`}>{isPlayingVoice ? 'Ouvindo boletim de RH...' : 'Ouvir status da empresa'}</p>
                  </div>
               </div>
               {isPlayingVoice && <div className="flex gap-1"><div className="w-1 h-3 bg-white rounded-full animate-bounce"></div><div className="w-1 h-4 bg-white rounded-full animate-bounce delay-75"></div><div className="w-1 h-2 bg-white rounded-full animate-bounce delay-150"></div></div>}
            </button>

            {/* SEARCH & ADD */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
               <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                  <input 
                    type="text" placeholder="Buscar por Nome ou Matrícula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-semibold border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                  />
               </div>
               <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2">
                 Novo Colaborador +
               </button>
            </div>

            {/* LIST */}
            <div className="space-y-3">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] px-2">Lista de Funcionários</h3>
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-11 h-11 rounded-2xl object-cover border border-slate-100 dark:border-slate-700" />
                       <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${e.hasFacialRecord ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate w-32">{e.name}</p>
                      <p className="text-[8px] font-semibold text-primary uppercase tracking-tighter">MAT: {e.matricula} • {e.roleFunction || 'S/ Cargo'}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingEmp(e)} className="bg-slate-50 dark:bg-slate-900 text-slate-400 p-2.5 rounded-xl transition-all">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                </div>
              ))}
            </div>

            {/* ACTIVITY FEED */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
               <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Atividade em Tempo Real</h3>
               <div className="space-y-4">
                  {latestRecords.slice(0, 5).map(r => (
                    <div key={r.id} className="flex gap-3 items-start">
                       <div className={`w-2 h-2 rounded-full mt-1.5 ${r.type === 'entrada' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-orange-500'}`}></div>
                       <div>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300"><strong>{r.userName}</strong> registrou {r.type}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{r.timestamp.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} • {r.address}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* OUTRAS ABAS MANTIDAS E AJUSTADAS PARA DARK MODE */}
        {tab === 'jornada' && (
          <div className="space-y-6">
            <button onClick={() => setShowJourneyModal(true)} className="w-full bg-white dark:bg-slate-800 p-6 rounded-[32px] border-2 border-dashed border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
               ➕ Criar Nova Escala / Grupo
            </button>
            <div className="space-y-4">
               {company?.schedules?.map(j => (
                 <div key={j.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{j.name}</h4>
                          <p className="text-[9px] text-primary font-bold uppercase tracking-wider">{j.weeklyHours}h Semanais</p>
                       </div>
                       <button onClick={() => {}} className="text-red-400 text-xs">✕</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Adicionar Feriado</h3>
               <form onSubmit={handleAddHoliday} className="space-y-3">
                  <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-semibold border border-slate-100 dark:border-slate-700 dark:text-white" />
                  <input type="text" placeholder="Descrição" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-semibold border border-slate-100 dark:border-slate-700 dark:text-white" />
                  <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px]">Salvar</button>
               </form>
            </div>
            {company?.holidays?.map(h => (
               <div key={h.id} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase">{h.description} <span className="text-[8px] block text-primary">{h.date}</span></p>
                  <button className="text-red-400">✕</button>
               </div>
            ))}
          </div>
        )}

        {tab === 'aprovacoes' && (
          <div className="space-y-4">
             {requests.filter(r => r.status === 'pending').map(req => (
               <div key={req.id} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase">{req.userName}</p>
                      <p className="text-[8px] text-primary font-bold">{req.type.toUpperCase()} - {req.date}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-[10px] text-slate-600 dark:text-slate-400 italic">"{req.reason}"</div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl text-[9px] font-bold uppercase">Rejeitar</button>
                    <button className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase shadow-lg shadow-emerald-100">Aprovar</button>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Novo Colaborador</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="Nome Completo *" onChange={e => setNewEmpData({...newEmpData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white" required />
              <input type="text" placeholder="Matrícula *" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white" required />
              <input type="password" placeholder="Senha *" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px]">Salvar Cadastro</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full text-slate-400 text-[10px] font-bold uppercase">Voltar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR */}
      {editingEmp && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 shadow-2xl space-y-6">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Editar Colaborador</h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white" />
              <input type="text" value={editingEmp.matricula} onChange={e => setEditingEmp({...editingEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white" />
              <div className="flex gap-2">
                <button type="button" onClick={() => { onDeleteEmployee(editingEmp.id); setEditingEmp(null); }} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[9px] font-black uppercase">Excluir</button>
                <button type="submit" className="flex-[2] bg-primary text-white py-4 rounded-2xl text-[9px] font-black uppercase">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
