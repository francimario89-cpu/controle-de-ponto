
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, data: any) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'dashboard' | 'colaboradores' | 'aprovacoes' | 'saldos' | 'audit';
  onNavigate: (v: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateEmployee, initialTab, onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassAttempt, setAdminPassAttempt] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', roleFunction: '', workShift: '', password: '' });
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const now = new Date();
  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: now.getMonth(),
    year: now.getFullYear()
  });

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 1; i <= currentYear + 4; i++) {
      years.push(i);
    }
    return years;
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(
        collection(db, "requests"), 
        where("companyCode", "==", company.id),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
        setRequests(reqs);
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setAdminPassAttempt('');
    }
  };

  const handleCopyCode = () => {
    if (company?.accessCode) {
      navigator.clipboard.writeText(company.accessCode);
      alert("CÓDIGO COPIADO!");
    }
  };

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      const matchMonth = date.getMonth() === reportFilter.month;
      const matchYear = date.getFullYear() === reportFilter.year;
      const matchEmp = reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula;
      return matchMonth && matchYear && matchEmp;
    });
  }, [latestRecords, reportFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeTodayCount = new Set(
      latestRecords
        .filter(r => r.timestamp.toDateString() === today)
        .map(r => r.matricula)
    ).size;

    return {
      total: employees.length,
      activeToday: activeTodayCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [employees, latestRecords, requests]);

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      
      if (req.type === 'inclusão' && req.times) {
        for (const timeStr of req.times) {
          if (!timeStr) continue;
          const [h, m] = timeStr.split(':');
          const timestamp = new Date(req.date);
          timestamp.setHours(parseInt(h), parseInt(m), 0);
          
          await addDoc(collection(db, "records"), {
            userName: req.userName,
            matricula: req.matricula,
            timestamp: timestamp,
            address: `CORREÇÃO RH: ${req.reason.toUpperCase()}`,
            latitude: 0,
            longitude: 0,
            photo: "",
            status: 'synchronized',
            digitalSignature: `AJUSTE-${req.id}`,
            type: 'entrada',
            companyCode: req.companyCode,
            isAdjustment: true
          });
        }
      }
      alert("SOLICITAÇÃO APROVADA E LANÇADA NO PONTO!");
    } catch (e) {
      alert("ERRO AO PROCESSAR.");
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Recusar esta justificativa?")) return;
    await updateDoc(doc(db, "requests", id), { status: 'rejected' });
  };

  const handleViewFile = (req: AttendanceRequest) => {
    if (!req.attachmentName) return;
    alert(`Visualizando anexo enviado por ${req.userName}:\n${req.attachmentName}\n(Em produção o arquivo abriria aqui)`);
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase">Acesso Administrativo</h2>
           <input 
             type="password" 
             placeholder="SENHA DO GESTOR" 
             value={adminPassAttempt}
             onChange={e => setAdminPassAttempt(e.target.value)}
             className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`}
           />
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Liberar Gestão</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Livro de Ponto Mensal</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                <option value="todos">COLABORADOR: TODOS</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
           </div>
           <button className="w-full bg-orange-600 text-white py-6 rounded-[28px] font-black uppercase text-xs shadow-xl">
             📥 Exportar Espelho de Ponto (PDF)
           </button>
        </div>
        <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                 <tr><th className="p-5">Colaborador</th><th className="p-5">Data</th><th className="p-5 text-center">Horário</th><th className="p-5">Tipo</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold text-slate-800">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                       <td className="p-5">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className={`p-5 text-center font-black ${r.isAdjustment ? 'text-orange-600' : 'text-slate-800'}`}>
                         <div className="flex flex-col items-center">
                            <span>{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {r.isAdjustment && <span className="text-[6px] bg-orange-500 text-white px-2 rounded-full mt-1 uppercase">Corrigido</span>}
                         </div>
                       </td>
                       <td className="p-5 uppercase">{r.type}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'aprovacoes') {
    const filteredRequests = requests.filter(r => r.status === requestFilter);
    return (
      <div className="space-y-6 animate-in fade-in">
         <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase text-slate-900 px-2">Gestão de Justificativas</h3>
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
               {(['pending', 'approved', 'rejected'] as const).map(status => (
                 <button 
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${requestFilter === status ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}
                 >
                   {status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Histórico OK' : 'Recusadas'}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[40px] border shadow-sm space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">
                      {req.type === 'atestado' ? '🏥' : '📝'}
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase text-slate-900 leading-none">{req.userName}</p>
                       <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">MAT: {req.matricula}</p>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase">
                       <span className="text-slate-400">Tipo:</span>
                       <span className="text-slate-800">{req.type === 'atestado' ? 'Atestado' : 'Esquecimento'}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase border-t pt-2">
                       <span className="text-slate-400">Motivo:</span>
                       <span className="text-slate-600 italic">"{req.reason}"</span>
                    </div>
                    {req.attachmentName && (
                      <button 
                        onClick={() => handleViewFile(req)}
                        className="w-full mt-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase border border-blue-100 flex items-center justify-center gap-2"
                      >
                        📎 Baixar Anexo: {req.attachmentName}
                      </button>
                    )}
                 </div>

                 {req.status === 'pending' ? (
                   <div className="flex gap-2">
                      <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-2xl text-[9px] font-black uppercase">Recusar</button>
                      <button onClick={() => handleApproveRequest(req)} className="flex-[2] py-3 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Aprovar Ajuste</button>
                   </div>
                 ) : (
                   <div className={`py-3 rounded-2xl text-[9px] font-black uppercase text-center ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                     Solicitação {req.status === 'approved' ? 'Aprovada' : 'Recusada'} em {new Date().toLocaleDateString()}
                   </div>
                 )}
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                 <span className="text-6xl mb-4">📂</span>
                 <p className="text-xs font-black uppercase tracking-widest">Nenhum registro nesta pasta.</p>
              </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
       <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1 text-center md:text-left">
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Gestão Corporativa</p>
             <h3 className="text-white text-lg font-black uppercase tracking-tight">{company?.name}</h3>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700">
                <span className="text-white font-mono text-2xl font-black tracking-[0.2em]">{company?.accessCode || '------'}</span>
             </div>
             <button onClick={handleCopyCode} className="p-5 bg-orange-600 text-white rounded-3xl hover:bg-orange-700 active:scale-90 transition-all">
                📋
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipe Total</p>
             <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ativos Hoje</p>
             <h3 className="text-3xl font-black text-emerald-500">{stats.activeToday}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Pendentes RH</p>
             <h3 className={`text-3xl font-black ${stats.pendingRequests > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{stats.pendingRequests}</h3>
          </div>
       </div>

       <div className="bg-white p-8 rounded-[44px] border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <button onClick={() => setActiveTab('colaboradores')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'colaboradores' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">👥</span>
                <span className="font-black uppercase text-[10px]">Funcionários</span>
             </button>
             <button onClick={() => setActiveTab('aprovacoes')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 relative ${activeTab === 'aprovacoes' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">✅</span>
                <span className="font-black uppercase text-[10px]">Aprovações</span>
                {stats.pendingRequests > 0 && <span className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">{stats.pendingRequests}</span>}
             </button>
             <button onClick={() => setActiveTab('saldos')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'saldos' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">📗</span>
                <span className="font-black uppercase text-[10px]">Livro de Ponto</span>
             </button>
          </div>
       </div>
    </div>
  );
};

export default AdminDashboard;
