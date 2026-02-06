
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, WorkSchedule } from '../types';
import { db } from '../firebase';
import { getGeminiResponse } from '../geminiService';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [iaSummary, setIaSummary] = useState<string | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', password: '' });

  // Password Reset States
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean, empId: string, empName: string }>({ isOpen: false, empId: '', empName: '' });
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Config States
  const [configData, setConfigData] = useState({
    radius: company?.geofence?.radius || 100,
    lat: company?.geofence?.lat || 0,
    lng: company?.geofence?.lng || 0,
    tolerance: company?.config?.toleranceMinutes || 10
  });

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

  const handleUpdatePassword = async () => {
    if (!newPasswordValue) return alert("Digite a nova senha.");
    try {
      const empRef = doc(db, "employees", resetPasswordModal.empId);
      await updateDoc(empRef, { password: newPasswordValue });
      alert("SENHA ATUALIZADA COM SUCESSO!");
      setResetPasswordModal({ isOpen: false, empId: '', empName: '' });
      setNewPasswordValue('');
    } catch (err) {
      alert("ERRO AO ATUALIZAR SENHA");
    }
  };

  const handleIAAnalysis = async () => {
    setIsGeneratingIA(true);
    const dataString = employees.map(e => {
      const recs = latestRecords.filter(r => r.matricula === e.matricula).length;
      return `${e.name}: ${recs} batidas.`;
    }).join(' | ');
    
    const prompt = `Analise os dados da equipe e dê um feedback rápido de RH: ${dataString}`;
    const result = await getGeminiResponse(prompt, []);
    setIaSummary(result);
    setIsGeneratingIA(false);
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status });
      alert(`SOLICITAÇÃO ${status === 'approved' ? 'APROVADA' : 'REPROVADA'} COM SUCESSO!`);
    } catch (err) {
      alert("ERRO AO PROCESSAR");
    }
  };

  const handleSaveConfig = async () => {
    if (!company?.id) return;
    try {
      await updateDoc(doc(db, "companies", company.id), {
        geofence: { enabled: true, lat: configData.lat, lng: configData.lng, radius: configData.radius },
        "config.toleranceMinutes": configData.tolerance
      });
      alert("CONFIGURAÇÕES SALVAS!");
    } catch (err) {
      alert("ERRO AO SALVAR");
    }
  };

  const calculateWorkedHours = (empRecords: PointRecord[]) => {
    const grouped: { [key: string]: PointRecord[] } = {};
    empRecords.forEach(r => {
      const day = r.timestamp.toLocaleDateString('pt-BR');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(r);
    });
    let totalMs = 0;
    Object.values(grouped).forEach(dayRecs => {
      const sorted = [...dayRecs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      for (let i = 0; i < sorted.length; i += 2) {
        const entry = sorted[i];
        const exit = sorted[i + 1];
        if (entry && exit) totalMs += exit.timestamp.getTime() - entry.timestamp.getTime();
      }
    });
    return totalMs / (1000 * 60 * 60);
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max shadow-inner">
          {(['relatorio', 'colaboradores', 'saldos', 'aprovacoes', 'config', 'calendario', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t === 'aprovacoes' ? 'PEDIDOS' : t === 'config' ? 'REGRAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 space-y-6">
        {/* COLABORADORES */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
              <input type="text" placeholder="BUSCAR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none focus:border-primary" />
            </div>
            
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all">CADASTRAR NOVO COLABORADOR +</button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-12 h-12 rounded-2xl object-cover border dark:border-slate-600" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate w-24 md:w-32">{e.name}</p>
                      <p className="text-[8px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setResetPasswordModal({ isOpen: true, empId: e.id, empName: e.name })} title="Alterar Senha" className="bg-slate-50 dark:bg-slate-900 text-slate-400 w-8 h-8 flex items-center justify-center rounded-xl text-sm hover:text-primary transition-all">🔑</button>
                    <button onClick={() => setViewingHistory(e)} title="Ver Espelho" className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 w-8 h-8 flex items-center justify-center rounded-xl text-sm hover:bg-indigo-500 hover:text-white transition-all">👁</button>
                    <button onClick={() => onDeleteEmployee(e.id)} title="Excluir" className="bg-red-50 text-red-500 w-8 h-8 flex items-center justify-center rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTROS TABS MANTIDOS */}
        {tab === 'aprovacoes' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Pendências da Equipe</h2>
                <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full">{requests.filter(r => r.status === 'pending').length} AGUARDANDO</span>
             </div>
             <div className="grid grid-cols-1 gap-4">
                {requests.map(req => (
                  <div key={req.id} className={`bg-white dark:bg-slate-800 p-6 rounded-[36px] border dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-center ${req.status !== 'pending' ? 'opacity-50' : ''}`}>
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-2xl shrink-0">
                      {req.type === 'atestado' ? '🏥' : '✏️'}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[11px] font-black text-primary uppercase mb-1">{req.type.toUpperCase()}</p>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate">{req.userName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">DATA: {new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-500 mt-2 italic">"{req.reason}"</p>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleRequestAction(req.id, 'approved')} className="bg-emerald-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">Aprovar</button>
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} className="bg-red-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">Negar</button>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}

        {tab === 'relatorio' && (
          <div className="space-y-4">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
               <input type="text" placeholder="FILTRAR BATIDAS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
                 <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.01]">
                   <img src={record.photo} className="w-16 h-16 rounded-2xl object-cover cursor-pointer border-2 border-slate-100" onClick={() => setSelectedPhoto(record.photo)} />
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{record.userName}</p>
                     <p className="text-[9px] font-black text-primary mt-0.5">{record.timestamp.toLocaleDateString()} - {record.timestamp.toLocaleTimeString()}</p>
                     <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${record.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{record.type.toUpperCase()}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* MODAL RESET SENHA */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[450] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[44px] p-10 space-y-6 shadow-2xl animate-in zoom-in">
              <div className="text-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
                 <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ALTERAR SENHA</h3>
                 <p className="text-[14px] font-black text-slate-800 dark:text-white uppercase mt-2">{resetPasswordModal.empName}</p>
              </div>
              <input 
                type="text" 
                placeholder="NOVA SENHA" 
                value={newPasswordValue} 
                onChange={e => setNewPasswordValue(e.target.value)} 
                className="w-full p-5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-3xl text-[12px] font-black text-center dark:text-white outline-none focus:border-primary" 
              />
              <div className="flex flex-col gap-2">
                 <button onClick={handleUpdatePassword} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">ATUALIZAR SENHA</button>
                 <button onClick={() => setResetPasswordModal({ isOpen: false, empId: '', empName: '' })} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAIS GERAIS MANTIDOS */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <img src={selectedPhoto} className="max-w-full max-h-[85vh] rounded-[50px] shadow-2xl border-4 border-white/10" />
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-4 shadow-2xl">
            <h3 className="text-[12px] font-black text-slate-400 uppercase text-center mb-6 tracking-widest">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="password" placeholder="SENHA INICIAL" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-5 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-3xl text-[12px] font-black text-primary outline-none" required />
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">SALVAR REGISTRO</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
