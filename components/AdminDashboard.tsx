
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  
  // Form para novo colaborador (Com campo de senha)
  const [newEmp, setNewEmp] = useState({ 
    name: '', 
    matricula: '', 
    email: '', 
    roleFunction: '', 
    workShift: '08:00h',
    password: '' 
  });

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

  const handleUpdatePassword = async () => {
    if (!editingPasswordId || !newPasswordValue) return;
    try {
      await updateDoc(doc(db, "employees", editingPasswordId), { password: newPasswordValue });
      alert("SENHA ATUALIZADA COM SUCESSO!");
      setEditingPasswordId(null);
      setNewPasswordValue('');
    } catch (e) { alert("ERRO AO ATUALIZAR SENHA NO BANCO."); }
  };

  const handleBackupGeral = () => {
    const data = {
      empresa: company,
      colaboradores: employees,
      registros: latestRecords,
      solicitacoes: requests,
      data_backup: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_PONTOEXATO_${company?.name?.replace(/\s/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
    link.click();
    alert("Backup completo gerado com sucesso!");
  };

  const handleExportFechamento = () => {
    const records = filteredRecords;
    if (records.length === 0) {
      alert("Nenhum registro encontrado para os filtros selecionados.");
      return;
    }

    let report = `RELATÓRIO DE FECHAMENTO - ${company?.name}\n`;
    report += `PERÍODO: ${reportFilter.month + 1}/${reportFilter.year}\n`;
    report += `FILTRO: ${reportFilter.matricula === 'todos' ? 'TODOS OS FUNCIONÁRIOS' : 'MATRÍCULA: ' + reportFilter.matricula}\n`;
    report += `------------------------------------------------------------\n\n`;

    // Agrupar por funcionário se for "todos"
    const grouped = records.reduce((acc: any, r) => {
      if (!acc[r.userName]) acc[r.userName] = [];
      acc[r.userName].push(r);
      return acc;
    }, {});

    Object.keys(grouped).forEach(name => {
      report += `FUNCIONÁRIO: ${name.toUpperCase()}\n`;
      const empRecords = grouped[name].sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());
      empRecords.forEach((r: any) => {
        report += `${new Date(r.timestamp).toLocaleString('pt-BR')} | ${r.type.toUpperCase()} | ${r.address} ${r.isAdjustment ? '(AJUSTADO)' : ''}\n`;
      });
      report += `------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fechamento_${reportFilter.matricula}_${reportFilter.month + 1}_${reportFilter.year}.txt`;
    link.click();
  };

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      alert("SOLICITAÇÃO APROVADA!");
    } catch (e) { alert("ERRO AO APROVAR."); }
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
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Acessar Painel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8 animate-in fade-in">
      {/* Menu Superior Estilizado */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'dashboard', label: 'Início', icon: '🏠' },
          { id: 'colaboradores', label: 'Colaboradores', icon: '👥' },
          { id: 'aprovacoes', label: 'Solicitações', icon: '✅' },
          { id: 'saldos', label: 'Livro de Ponto', icon: '📘' },
          { id: 'audit', label: 'Auditoria IA', icon: '⚖️' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-w-[100px] p-4 rounded-3xl flex flex-col items-center gap-1 transition-all border ${activeTab === tab.id ? 'bg-orange-600 text-white border-orange-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
            <div className="space-y-1"><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Painel Administrativo</p><h3 className="text-white text-lg font-black uppercase">{company?.name}</h3></div>
            <button onClick={handleBackupGeral} className="bg-orange-600 text-white px-6 py-4 rounded-3xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2">
               📥 Fazer Backup Geral
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total na Equipe</p>
              <p className="text-4xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ativos Hoje</p>
              <p className="text-4xl font-black text-orange-600">{stats.activeToday}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pedidos Pendentes</p>
              <p className="text-4xl font-black text-blue-600">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'colaboradores' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase text-slate-900">Gestão de Equipe</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">+ Novo Colaborador</button>
          </div>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Nome</th><th className="p-5">Matrícula</th><th className="p-5">Função</th><th className="p-5">Senha</th><th className="p-5">Ações</th></tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-5">{emp.name}</td>
                    <td className="p-5 text-slate-400">{emp.matricula}</td>
                    <td className="p-5 text-slate-500">{emp.roleFunction || '-'}</td>
                    <td className="p-5 font-mono text-[10px] text-blue-500">****</td>
                    <td className="p-5 flex gap-2">
                      <button onClick={() => { setEditingPasswordId(emp.id); setNewPasswordValue(''); }} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Redefinir</button>
                      <button onClick={() => onDeleteEmployee(emp.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Excluir</button>
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
               <h3 className="text-sm font-black uppercase">Livro de Ponto / Fechamento</h3>
               <button onClick={handleExportFechamento} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                  📊 Exportar Fechamento
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos Funcionários</option>
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
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Colaborador</th><th className="p-5">Data</th><th className="p-5">Batida</th><th className="p-5">Tipo</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold uppercase">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-5">{r.userName}</td>
                    <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                    <td className="p-5 font-black">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-5">{r.isAdjustment ? <span className="text-orange-600">RH (MANUAL)</span> : 'DIGITAL'}</td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase">Sem registros para o período</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && <ComplianceAudit records={latestRecords} employees={employees} />}

      {/* MODAL: CADASTRO COMPLETO (COM SENHA) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in space-y-4">
            <h2 className="text-[14px] font-black uppercase text-center mb-6 text-orange-600 tracking-widest">Cadastrar Colaborador</h2>
            <input type="text" placeholder="NOME COMPLETO" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="MATRÍCULA" value={newEmp.matricula} onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmp.roleFunction} onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="CARGA HORÁRIA (Ex: 08:00h)" value={newEmp.workShift} onChange={e => setNewEmp({...newEmp, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="password" placeholder="SENHA DE ACESSO" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-[10px] font-black outline-none border border-orange-100" />
            
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button onClick={() => { onAddEmployee(newEmp); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar Dados</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REDEFINIR SENHA */}
      {editingPasswordId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
             <h2 className="text-sm font-black text-center uppercase mb-4 text-blue-600">Redefinir Senha</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase text-center mb-2">Digite a nova senha para o colaborador</p>
             <input type="password" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} placeholder="NOVA SENHA" className="w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border" />
             <div className="flex gap-3 pt-4">
                <button onClick={() => setEditingPasswordId(null)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button onClick={handleUpdatePassword} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Confirmar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
