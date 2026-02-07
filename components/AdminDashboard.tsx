
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, Holiday, AttendanceRequest } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, deleteDoc, orderBy } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', department: '' });

  // Fix for missing newHoliday state in the calendar section
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  // Password reset logic
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean, empId: string, empName: string }>({ isOpen: false, empId: '', empName: '' });
  const [newPasswordValue, setNewPasswordValue] = useState('');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, "requests"), where("companyCode", "==", company.id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
    return () => unsub();
  }, [company?.id]);

  // Fix: Implemented handleUpdatePassword to handle employee password reset functionality
  const handleUpdatePassword = async () => {
    if (!resetPasswordModal.empId || !newPasswordValue) {
      alert("POR FAVOR, DIGITE A NOVA SENHA");
      return;
    }
    try {
      await updateDoc(doc(db, "employees", resetPasswordModal.empId), {
        password: newPasswordValue
      });
      alert("SENHA ATUALIZADA COM SUCESSO!");
      setResetPasswordModal({ isOpen: false, empId: '', empName: '' });
      setNewPasswordValue('');
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      alert("ERRO AO ATUALIZAR SENHA NO BANCO DE DADOS");
    }
  };

  const handleApproveRequest = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, "requests", id), { status });
  };

  const handleUpdateGeofence = async (data: any) => {
    if(!company?.id) return;
    await updateDoc(doc(db, "companies", company.id), { geofence: { ...company.geofence, ...data } });
    alert("CONFIGURAÇÕES SALVAS!");
  };

  const calculateHours = (matricula: string) => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const recs = latestRecords.filter(r => r.matricula === matricula && r.timestamp.getMonth() === month && r.timestamp.getFullYear() === year);
    if (recs.length < 2) return "0.00";
    const sorted = [...recs].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
    let ms = 0;
    for(let i=0; i<sorted.length; i+=2) {
      if(sorted[i] && sorted[i+1]) ms += sorted[i+1].timestamp.getTime() - sorted[i].timestamp.getTime();
    }
    return (ms / (1000 * 60 * 60)).toFixed(2);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      {/* SELETOR DE MÊS GLOBAL */}
      <div className="w-full bg-primary/5 p-2 flex justify-center gap-4 items-center border-b dark:border-slate-800">
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg">◀</button>
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
           {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
         </span>
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg">▶</button>
      </div>

      {/* MENU NAVEGAÇÃO ADMIN */}
      <div className="w-full p-2 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-center sticky top-0 z-20 overflow-x-auto no-scrollbar">
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['relatorio', 'colaboradores', 'aprovacoes', 'saldos', 'calendario', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-3 no-scrollbar pb-24 space-y-3">
        
        {/* ABA: BATIDAS (RELATÓRIO EM TEMPO REAL) */}
        {tab === 'relatorio' && (
           <div className="space-y-2">
             <input type="text" placeholder="BUSCAR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black border dark:border-slate-700 outline-none mb-2" />
             {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
               <div key={record.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <img src={record.photo} className="w-10 h-10 rounded-lg object-cover" />
                 <div>
                   <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1">{record.userName}</p>
                   <p className="text-[8px] font-black text-primary uppercase">{record.timestamp.toLocaleDateString()} • {record.timestamp.toLocaleTimeString()} ({record.type})</p>
                 </div>
               </div>
             ))}
           </div>
        )}

        {/* ABA: COLABORADORES */}
        {tab === 'colaboradores' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder="NOME OU MATRÍCULA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black border dark:border-slate-700 outline-none" />
              <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-white px-4 rounded-2xl font-black text-[10px] shadow-sm">+</button>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border dark:border-slate-700 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate">{e.name}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setResetPasswordModal({ isOpen: true, empId: e.id, empName: e.name })} className="w-7 h-7 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-lg flex items-center justify-center text-[10px]">🔑</button>
                    <button onClick={() => onDeleteEmployee(e.id)} className="w-7 h-7 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg flex items-center justify-center text-[10px]">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: APROVAÇÕES */}
        {tab === 'aprovacoes' && (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700 shadow-sm space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                       <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{req.userName}</p>
                       <p className="text-[8px] font-bold text-primary uppercase">{req.type} • Data: {req.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${req.status === 'pending' ? 'bg-orange-50 text-orange-500' : req.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                      {req.status === 'pending' ? 'PENDENTE' : req.status.toUpperCase()}
                    </span>
                 </div>
                 <p className="text-[9px] text-slate-500 font-bold uppercase">{req.reason}</p>
                 {req.attachment && <img src={req.attachment} className="w-full h-32 object-cover rounded-xl" />}
                 {req.status === 'pending' && (
                   <div className="flex gap-2">
                      <button onClick={() => handleApproveRequest(req.id, 'approved')} className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-[8px] font-black uppercase">APROVAR</button>
                      <button onClick={() => handleApproveRequest(req.id, 'rejected')} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-[8px] font-black uppercase">RECUSAR</button>
                   </div>
                 )}
              </div>
            ))}
          </div>
        )}

        {/* ABA: SALDOS (BANCO DE HORAS) */}
        {tab === 'saldos' && (
          <div className="space-y-2">
             <div className="bg-primary/10 p-4 rounded-3xl text-center">
                <p className="text-[10px] font-black text-primary uppercase">Total Horas Trabalhadas no Mês</p>
             </div>
             {employees.map(e => (
               <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{e.name}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Matrícula: {e.matricula}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{calculateHours(e.matricula)}h</p>
                    <p className="text-[7px] font-black text-slate-300 uppercase">Acumulado</p>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* ABA: CALENDÁRIO (GESTÃO DE FERIADOS) */}
        {tab === 'calendario' && (
           <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 space-y-3">
                <h3 className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Novo Feriado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                   <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold dark:text-white outline-none" />
                   <input type="text" placeholder="NOME DO FERIADO" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value.toUpperCase()})} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold dark:text-white outline-none" />
                   <button onClick={async () => {
                      if (!newHoliday.date || !newHoliday.description || !company?.id) return;
                      await updateDoc(doc(db, "companies", company.id), { holidays: arrayUnion({ id: Date.now().toString(), date: newHoliday.date, description: newHoliday.description, type: 'feriado' }) });
                      setNewHoliday({ date: '', description: '' });
                      alert("FERIADO SALVO!");
                   }} className="bg-primary text-white p-3 rounded-xl font-black text-[10px] uppercase shadow-lg">ADICIONAR</button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700">
                <h3 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Lista de Eventos Cadastrados</h3>
                <div className="space-y-2">
                  {company?.holidays?.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                    <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">{h.date.split('-').reverse().join('/')}</span>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{h.description}</span>
                       </div>
                       <button onClick={async () => { if(confirm("REMOVER?")) await updateDoc(doc(db, "companies", company.id), { holidays: arrayRemove(h) }); }} className="text-red-400 p-2">✕</button>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        )}

        {/* ABA: CONFIG (GEOFENCE E REGRAS) */}
        {tab === 'config' && (
          <div className="space-y-4">
             <div className="p-6 bg-white dark:bg-slate-800 rounded-[40px] border dark:border-slate-700 space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Trava de Localização (Geofence)</h3>
                   <button 
                     onClick={() => handleUpdateGeofence({ enabled: !company?.geofence?.enabled })}
                     className={`w-12 h-6 rounded-full relative transition-all ${company?.geofence?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${company?.geofence?.enabled ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Latitude</p>
                      <input type="number" step="any" placeholder="Latitude" defaultValue={company?.geofence?.lat} onBlur={e => handleUpdateGeofence({ lat: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black outline-none" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Longitude</p>
                      <input type="number" step="any" placeholder="Longitude" defaultValue={company?.geofence?.lng} onBlur={e => handleUpdateGeofence({ lng: parseFloat(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black outline-none" />
                   </div>
                </div>

                <div className="space-y-2">
                   <p className="text-[8px] font-black text-slate-400 uppercase">Raio Permitido (Metros)</p>
                   <input type="number" placeholder="Ex: 100" defaultValue={company?.geofence?.radius} onBlur={e => handleUpdateGeofence({ radius: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[10px] font-black outline-none" />
                </div>

                <button onClick={() => {
                   navigator.geolocation.getCurrentPosition(p => {
                      handleUpdateGeofence({ lat: p.coords.latitude, lng: p.coords.longitude });
                   });
                }} className="w-full py-4 border-2 border-primary border-dashed rounded-3xl text-[9px] font-black text-primary uppercase">Capturar Minha Posição Atual</button>
             </div>
          </div>
        )}
      </div>

      {/* MODAL RESET SENHA */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[450] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Alterar Senha de {resetPasswordModal.empName}</h3>
              <input type="text" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl text-center font-black dark:text-white outline-none" placeholder="SENHA" />
              <div className="flex gap-2">
                <button onClick={() => setResetPasswordModal({ isOpen: false, empId: '', empName: '' })} className="flex-1 py-3 text-slate-400 font-black text-[9px] uppercase">Sair</button>
                <button onClick={handleUpdatePassword} className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL ADD COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Novo Colaborador</h3>
            <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none dark:text-white" required />
            <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none dark:text-white" required />
            <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-3 bg-orange-50 dark:bg-slate-900 border-2 border-primary/20 rounded-xl text-[10px] font-bold dark:text-white outline-none" required />
            <button onClick={() => { onAddEmployee(newEmpData); setShowAddModal(false); }} className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg mt-2">Finalizar</button>
            <button onClick={() => setShowAddModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
