
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ComplianceAudit from './ComplianceAudit';

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
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [previewFile, setPreviewFile] = useState<AttendanceRequest | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form para novo colaborador
  const [newEmp, setNewEmp] = useState({ name: '', matricula: '', email: '', roleFunction: '', workShift: '08:00h' });

  const now = new Date();
  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: now.getMonth(),
    year: now.getFullYear()
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
          reqs.push({ id: d.id, ...data, createdAt });
        });
        setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeTodayCount = new Set(
      latestRecords.filter(r => r.timestamp.toDateString() === today).map(r => r.matricula)
    ).size;
    return {
      total: employees.length,
      activeToday: activeTodayCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [employees, latestRecords, requests]);

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) { setIsAuthorized(true); setAuthError(false); }
    else { setAuthError(true); setAdminPassAttempt(''); }
  };

  const handleFullBackup = () => {
    const dataToExport = {
      backupDate: new Date().toISOString(),
      company: company,
      employees: employees,
      attendanceRecords: latestRecords,
      rhRequests: requests
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_GERAL_${company?.name || 'PONTOEXATO'}.json`;
    link.click();
    alert("Backup gerado com sucesso!");
  };

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      if (req.type === 'inclusão' && req.times) {
        for (const timeStr of req.times) {
          if (!timeStr) continue;
          const [h, m] = timeStr.split(':');
          const ts = new Date(req.date); ts.setHours(parseInt(h), parseInt(m), 0);
          await addDoc(collection(db, "records"), {
            userName: req.userName, matricula: req.matricula, timestamp: ts,
            address: `AJUSTE RH: ${req.reason.toUpperCase()}`,
            latitude: 0, longitude: 0, photo: "", status: 'synchronized',
            digitalSignature: `RH-ADJ-${Date.now()}`, type: 'entrada',
            companyCode: req.companyCode, isAdjustment: true
          });
        }
      }
      alert("Sucesso!");
    } catch (e) { alert("Erro ao aprovar."); }
  };

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      return (reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula) &&
             date.getMonth() === reportFilter.month &&
             date.getFullYear() === reportFilter.year;
    });
  }, [latestRecords, reportFilter]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase">Gestão RH</h2>
           <input type="password" placeholder="SENHA DE ACESSO" value={adminPassAttempt} onChange={e => setAdminPassAttempt(e.target.value)} className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`} />
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in">
      {/* Menu Superior */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { id: 'dashboard', label: 'Início', icon: '🏠' },
          { id: 'colaboradores', label: 'Equipe', icon: '👥' },
          { id: 'aprovacoes', label: 'Pedidos', icon: '✅' },
          { id: 'saldos', label: 'Livro', icon: '📘' },
          { id: 'audit', label: 'IA Audit', icon: '⚖️' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`p-4 rounded-3xl flex flex-col items-center gap-1 transition-all border ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
            <div className="space-y-1"><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Painel Administrativo</p><h3 className="text-white text-lg font-black uppercase">{company?.name}</h3></div>
            <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700"><span className="text-white font-mono text-2xl font-black">{company?.accessCode || '------'}</span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Equipe</p>
              <p className="text-4xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ativos Hoje</p>
              <p className="text-4xl font-black text-orange-600">{stats.activeToday}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Solicitações</p>
              <p className="text-4xl font-black text-blue-600">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'colaboradores' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase text-slate-900">Gestão de Colaboradores</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">+ Novo Cadastro</button>
          </div>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Nome</th><th className="p-5">Matrícula</th><th className="p-5">Função</th><th className="p-5">Carga</th><th className="p-5 text-center">Ações</th></tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b">
                    <td className="p-5">{emp.name}</td>
                    <td className="p-5 text-slate-400">{emp.matricula}</td>
                    <td className="p-5 text-slate-500">{emp.roleFunction || '-'}</td>
                    <td className="p-5">{emp.workShift || '08h'}</td>
                    <td className="p-5 text-center">
                      <button onClick={() => onDeleteEmployee(emp.id)} className="text-red-500 hover:scale-110 transition-transform">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'saldos' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase">Livro de Ponto / Filtros</h3>
              <button onClick={handleFullBackup} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase">📥 Backup JSON</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5 text-center">Hora</th><th className="p-5">Tipo</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold uppercase">
                {filteredRecords.map(r => (
                  <tr key={r.id} className={`border-b ${r.isAdjustment ? 'bg-orange-50/50' : ''}`}>
                    <td className="p-5">{r.userName}</td>
                    <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                    <td className={`p-5 text-center font-black ${r.isAdjustment ? 'text-orange-600' : ''}`}>
                      {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-5 text-[8px] text-slate-400">{r.isAdjustment ? 'RH (Manual)' : 'Digital'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'aprovacoes' && (
        <div className="space-y-6">
          <div className="flex bg-white p-1 rounded-2xl border">
            {(['pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setRequestFilter(s)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl ${requestFilter === s ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}>
                {s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovadas' : 'Recusadas'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.filter(r => r.status === requestFilter).map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[44px] shadow-2xl border border-slate-100 flex flex-col space-y-4">
                 <div className="flex items-center gap-4 border-b pb-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-xl">📝</div>
                    <div><h4 className="text-[12px] font-black uppercase">{req.userName}</h4><p className="text-[10px] text-slate-400">MAT: {req.matricula}</p></div>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[30px] space-y-3">
                    <p className="text-[10px] font-bold text-slate-700 italic">"{req.reason}"</p>
                 </div>
                 {req.status === 'pending' && (
                   <div className="flex gap-2">
                     <button onClick={() => updateDoc(doc(db, "requests", req.id), { status: 'rejected' })} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase">Recusar</button>
                     <button onClick={() => handleApproveRequest(req)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase">Aprovar</button>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && <ComplianceAudit records={latestRecords} employees={employees} />}

      {/* Modal Cadastro de Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in">
            <h2 className="text-[12px] font-black uppercase text-center mb-8 text-orange-600 tracking-widest">Novo Colaborador</h2>
            <div className="space-y-3">
              <input type="text" placeholder="NOME COMPLETO" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <input type="text" placeholder="MATRÍCULA" value={newEmp.matricula} onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmp.roleFunction} onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <input type="text" placeholder="CARGA (EX: 08:00H)" value={newEmp.workShift} onChange={e => setNewEmp({...newEmp, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <input type="email" placeholder="E-MAIL" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-tighter">Cancelar</button>
                <button onClick={() => { onAddEmployee(newEmp); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl tracking-tighter">Salvar Cadastro</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
