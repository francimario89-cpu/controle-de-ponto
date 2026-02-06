
import React, { useState, useEffect, useRef } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, Vacation, WorkSchedule } from '../types';
import { db } from '../firebase';
import { generateDailyBriefingAudio, decodeBase64, decodeAudioData } from '../geminiService';
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
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const stats = {
    present: latestRecords.filter(r => r.timestamp.toLocaleDateString() === new Date().toLocaleDateString() && r.type === 'entrada').length,
    pending: requests.filter(r => r.status === 'pending').length
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.matricula.includes(searchTerm));

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20 transition-colors">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'calendario', 'jornada', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-semibold uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `AJUSTES (${stats.pending})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-md overflow-y-auto p-4 no-scrollbar pb-24 space-y-6">
        
        {tab === 'colaboradores' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-primary p-6 rounded-[32px] text-white shadow-xl">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Presentes</p>
                  <h4 className="text-3xl font-black mt-1">{stats.present}</h4>
               </div>
               <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando</p>
                  <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.pending}</h4>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm space-y-4">
               <input type="text" placeholder="BUSCAR NOME OU MATRÍCULA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-bold border dark:border-slate-700 dark:text-white outline-none" />
               <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Novo Colaborador +</button>
            </div>

            <div className="space-y-3">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-11 h-11 rounded-2xl object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate w-32">{e.name}</p>
                      <p className="text-[8px] font-bold text-primary uppercase">MAT: {e.matricula} • {e.roleFunction || 'Geral'}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingEmp(e)} className="bg-slate-50 dark:bg-slate-900 text-slate-400 p-2.5 rounded-xl">⚙️</button>
                </div>
              ))}
              {filteredEmployees.length === 0 && <p className="text-center py-10 opacity-30 text-[10px] font-bold uppercase tracking-widest">Vazio</p>}
            </div>
          </div>
        )}

        {tab === 'jornada' && (
          <div className="space-y-6">
            <button onClick={() => setShowJourneyModal(true)} className="w-full bg-white dark:bg-slate-800 p-8 rounded-[40px] border-2 border-dashed border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">➕ Nova Escala / Grupo</button>
            {company?.schedules?.map(j => (
               <div key={j.id} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 flex justify-between items-center">
                  <div>
                     <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase">{j.name}</h4>
                     <p className="text-[9px] text-primary font-black uppercase mt-1">{j.weeklyHours}h Semanais</p>
                  </div>
                  <button className="text-red-400">✕</button>
               </div>
            ))}
          </div>
        )}

        {tab === 'aprovacoes' && (
          <div className="space-y-4">
             {requests.filter(r => r.status === 'pending').map(req => (
               <div key={req.id} className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border dark:border-slate-700 space-y-4 shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase">{req.userName}</p>
                    <p className="text-[8px] text-primary font-bold">{req.type.toUpperCase()} - {req.date}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">"{req.reason}"</p>
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl text-[9px] font-bold uppercase">Recusar</button>
                    <button className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-bold uppercase">Aprovar</button>
                  </div>
               </div>
             ))}
             {requests.filter(r => r.status === 'pending').length === 0 && <p className="text-center py-10 opacity-30 text-[10px] font-bold uppercase tracking-widest">Nada pendente</p>}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-8 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Cadastro</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME *" onChange={e => setNewEmpData({...newEmpData, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-bold outline-none" required />
              <input type="text" placeholder="MATRÍCULA *" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] dark:text-white font-bold outline-none" required />
              <select onChange={e => setNewEmpData({...newEmpData, scheduleId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-bold dark:text-white outline-none">
                <option value="">GRUPO / ESCALA</option>
                {company?.schedules?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="password" placeholder="SENHA *" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-2xl text-xs font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[10px] shadow-xl">Salvar</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full text-slate-400 text-[10px] font-black uppercase">Voltar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
