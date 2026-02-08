
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auditCompliance } from '../geminiService';

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
  
  // Auditoria IA State
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [selectedAuditEmp, setSelectedAuditEmp] = useState('');

  // Solicitações State
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);

  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  // Sincroniza a aba interna com a navegação da Sidebar
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Carrega solicitações pendentes para a aba de aprovações
  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
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

  const handleActionRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status });
      alert(`SOLICITAÇÃO ${status === 'approved' ? 'APROVADA' : 'RECUSADA'}!`);
    } catch (e) {
      alert("ERRO AO PROCESSAR.");
    }
  };

  const handleRunAudit = async () => {
    if (!selectedAuditEmp) return alert("Selecione um funcionário.");
    setAuditLoading(true);
    try {
      const emp = employees.find(e => e.id === selectedAuditEmp);
      const empRecs = latestRecords
        .filter(r => r.matricula === emp?.matricula)
        .map(r => `${r.timestamp.toLocaleString()} - ${r.type}`);
      const result = await auditCompliance(emp?.name || 'Funcionário', empRecs);
      setAuditResult(result);
    } catch (e) {
      alert("Erro na auditoria inteligente.");
    }
    setAuditLoading(false);
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

  const handleDownloadReport = () => {
    if (filteredRecords.length === 0) {
      alert("Nenhum registro para este período.");
      return;
    }
    const empName = reportFilter.matricula === 'todos' ? 'TODOS' : employees.find(e => e.matricula === reportFilter.matricula)?.name || 'COLABORADOR';
    const monthName = new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    let content = `LIVRO DE PONTO MENSAL - ${company?.name}\nPERÍODO: ${monthName} / ${reportFilter.year}\nEMPREGADO: ${empName}\n\n`;
    content += `DATA       | HORA  | TIPO    | LOCALIZAÇÃO\n------------------------------------------------\n`;
    filteredRecords.forEach(r => {
      const date = new Date(r.timestamp).toLocaleDateString('pt-BR');
      const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      content += `${date} | ${time} | ${r.type.toUpperCase().padEnd(8)} | ${r.address}\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Livro_Ponto_${empName.replace(/ /g, '_')}_${monthName}.txt`;
    link.click();
  };

  const startEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setNewEmpData({
      name: emp.name,
      matricula: emp.matricula,
      roleFunction: emp.roleFunction || '',
      workShift: emp.workShift || '',
      password: emp.password || ''
    });
    setShowAddModal(true);
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

  // View: Livro de Ponto
  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Geração de Livro de Ponto</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                <option value="todos">TODA A EQUIPE</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                <option value={2024}>2024</option><option value={2025}>2025</option>
              </select>
           </div>
           <button onClick={handleDownloadReport} className="w-full bg-orange-600 text-white py-6 rounded-[28px] font-black uppercase text-xs shadow-xl hover:bg-orange-700 transition-all">
             📥 Baixar Livro de Ponto (Portaria 671)
           </button>
        </div>
        <div className="bg-white rounded-[40px] border overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                 <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5">Hora</th><th className="p-5">Tipo</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold text-slate-800">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                       <td className="p-5">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className="p-5 text-orange-600 font-black">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                       <td className="p-5 uppercase">{r.type}</td>
                    </tr>
                 ))}
                 {filteredRecords.length === 0 && (
                   <tr><td colSpan={4} className="p-10 text-center text-slate-400 uppercase text-[9px] font-black">Nenhum registro encontrado</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  // View: Aprovações RH
  if (activeTab === 'aprovacoes') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest px-2">Solicitações de Ajuste</h3>
        <div className="grid grid-cols-1 gap-4">
          {requests.filter(r => r.status === 'pending').map(req => (
            <div key={req.id} className="bg-white p-6 rounded-[35px] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-xl">⏳</div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase">{req.userName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{req.type} em {new Date(req.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] italic text-slate-500 mt-1">Motivo: {req.reason}</p>
                  </div>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleActionRequest(req.id, 'rejected')} className="flex-1 md:flex-none px-6 py-3 border border-red-200 text-red-600 rounded-xl font-black text-[9px] uppercase">Recusar</button>
                  <button onClick={() => handleActionRequest(req.id, 'approved')} className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase">Aprovar</button>
               </div>
            </div>
          ))}
          {requests.filter(r => r.status === 'pending').length === 0 && (
            <div className="p-20 text-center bg-white rounded-[40px] border border-dashed text-slate-300 font-black uppercase text-[10px]">Tudo em dia! Nenhuma solicitação pendente.</div>
          )}
        </div>
      </div>
    );
  }

  // View: Auditoria IA
  if (activeTab === 'audit') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <div className="text-center space-y-2">
              <span className="text-3xl">🤖</span>
              <h3 className="text-sm font-black text-slate-900 uppercase">Auditoria de Risco CLT</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Inteligência Artificial analisando irregularidades</p>
           </div>
           
           <div className="space-y-4">
              <select value={selectedAuditEmp} onChange={e => setSelectedAuditEmp(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black border border-slate-200 outline-none">
                 <option value="">SELECIONE O COLABORADOR</option>
                 {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={handleRunAudit} disabled={auditLoading} className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black uppercase text-xs flex items-center justify-center gap-3">
                 {auditLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Rodar Auditoria IA'}
              </button>
           </div>
        </div>

        {auditResult && (
          <div className="animate-in slide-in-from-bottom-4 space-y-4">
             <div className={`p-8 rounded-[40px] border ${auditResult.riskLevel === 'Alto' ? 'bg-red-50 border-red-100' : auditResult.riskLevel === 'Médio' ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Resultado da IA</p>
                <h4 className={`text-2xl font-black uppercase ${auditResult.riskLevel === 'Alto' ? 'text-red-600' : auditResult.riskLevel === 'Médio' ? 'text-orange-600' : 'text-emerald-600'}`}>RISCO {auditResult.riskLevel}</h4>
                <p className="text-xs font-bold text-slate-700 mt-4 leading-relaxed">{auditResult.summary}</p>
             </div>
             <div className="bg-white p-8 rounded-[40px] border space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase">Pontos de Atenção</p>
                {auditResult.alerts.map((a: string, i: number) => (
                  <div key={i} className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <span className="text-orange-500">⚠️</span>
                     <p className="text-[10px] font-bold text-slate-600 uppercase leading-tight">{a}</p>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'colaboradores') {
     return (
        <div className="space-y-6">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-black uppercase text-slate-900">Quadro de Funcionários</h3>
              <button onClick={() => { setEditingEmpId(null); setNewEmpData({name:'', matricula:'', roleFunction:'', workShift:'', password:''}); setShowAddModal(true); }} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">+ Novo</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                 <div key={emp.id} className="bg-white p-6 rounded-[35px] border flex items-center gap-4 shadow-sm group hover:border-orange-200 transition-all">
                    <img src={emp.photo} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" />
                    <div className="flex-1">
                       <p className="text-xs font-black uppercase text-slate-900">{emp.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">MAT: {emp.matricula}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => startEdit(emp)} className="p-2 bg-slate-50 rounded-lg text-slate-600 hover:text-orange-600 transition-colors">✏️</button>
                      <button onClick={() => onDeleteEmployee(emp.id)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                    </div>
                 </div>
              ))}
           </div>
           {showAddModal && (
             <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4 animate-in zoom-in duration-300">
                   <h2 className="text-sm font-black text-orange-600 text-center uppercase tracking-widest">{editingEmpId ? 'Editar Colaborador' : 'Novo Cadastro'}</h2>
                   <div className="space-y-3">
                      <input type="text" placeholder="NOME COMPLETO" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center border border-slate-100" />
                      <input type="text" placeholder="MATRÍCULA" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center border border-slate-100" />
                      <input type="text" placeholder="FUNÇÃO / CARGO" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center border border-slate-100" />
                      <input type="text" placeholder="JORNADA (EX: 08:00 - 18:00)" value={newEmpData.workShift} onChange={e => setNewEmpData({...newEmpData, workShift: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center border border-slate-100" />
                      <input type="password" placeholder="SENHA DE ACESSO" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center border border-slate-100" />
                   </div>
                   <div className="flex gap-3 pt-4">
                      <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                      <button onClick={() => { editingEmpId ? onUpdateEmployee(editingEmpId, newEmpData) : onAddEmployee(newEmpData); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar</button>
                   </div>
                </div>
             </div>
           )}
        </div>
     );
  }

  // Dashboard View (Padrão)
  return (
    <div className="space-y-8 animate-in fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipe Total</p>
             <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos Hoje</p>
             <h3 className="text-3xl font-black text-emerald-500">{stats.activeToday}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendentes RH</p>
             <h3 className="text-3xl font-black text-orange-500">{stats.pendingRequests}</h3>
          </div>
       </div>
       <div className="bg-white p-8 rounded-[44px] border shadow-sm space-y-6">
          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest px-2">Navegação Rápida</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <button onClick={() => setActiveTab('colaboradores')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all flex flex-col gap-2">
                <span className="text-2xl">👥</span>
                <span className="font-black uppercase text-[10px]">Funcionários</span>
             </button>
             <button onClick={() => setActiveTab('aprovacoes')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all flex flex-col gap-2">
                <span className="text-2xl">✅</span>
                <span className="font-black uppercase text-[10px]">Aprovações</span>
             </button>
             <button onClick={() => setActiveTab('saldos')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all flex flex-col gap-2">
                <span className="text-2xl">📘</span>
                <span className="font-black uppercase text-[10px]">Livro de Ponto</span>
             </button>
             <button onClick={() => setActiveTab('audit')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all flex flex-col gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="font-black uppercase text-[10px]">Auditoria IA</span>
             </button>
          </div>
       </div>
    </div>
  );
};

export default AdminDashboard;
