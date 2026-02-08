
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ComplianceAudit from './ComplianceAudit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Estendendo o tipo jsPDF para reconhecer o plugin autotable e propriedades internas dinâmicas
// O uso de [key: string]: any permite acessar propriedades como .internal e .lastAutoTable que podem não estar expostas nos tipos base
interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable?: { finalY: number };
  [key: string]: any;
}

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
    } catch (e) { alert("ERRO AO ATUALIZAR SENHA."); }
  };

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      return (reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula) &&
             date.getMonth() === reportFilter.month &&
             date.getFullYear() === reportFilter.year;
    });
  }, [latestRecords, reportFilter]);

  const handleExportPDF = () => {
    const records = filteredRecords;
    if (records.length === 0) {
      alert("Nenhum registro encontrado para exportar.");
      return;
    }

    // Usando o tipo estendido jsPDFWithPlugin para satisfazer o compilador TS sobre propriedades como .internal e .autoTable
    const doc = new jsPDF() as jsPDFWithPlugin;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Agrupar registros por funcionário
    const grouped = records.reduce((acc: any, r) => {
      if (!acc[r.userName]) acc[r.userName] = { matricula: r.matricula, data: [] };
      acc[r.userName].data.push(r);
      return acc;
    }, {});

    Object.keys(grouped).forEach((name, index) => {
      if (index > 0) doc.addPage();

      // Cabeçalho da Empresa
      doc.setFontSize(18);
      doc.setTextColor(249, 115, 22); // Cor Laranja
      doc.text("PontoExato", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Empresa: ${company?.name || 'Não informada'}`, 14, 28);
      doc.text(`CNPJ: ${company?.cnpj || 'N/A'}`, 14, 33);
      doc.text(`Período: ${reportFilter.month + 1}/${reportFilter.year}`, pageWidth - 14, 20, { align: 'right' });

      // Dados do Colaborador
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`ESPELHO DE PONTO: ${name.toUpperCase()}`, 14, 45);
      doc.setFontSize(9);
      doc.text(`Matrícula: ${grouped[name].matricula || 'N/A'}`, 14, 50);

      const tableData = grouped[name].data
        .sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())
        .map((r: any) => [
          new Date(r.timestamp).toLocaleDateString('pt-BR'),
          new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          r.type.toUpperCase(),
          r.isAdjustment ? "SIM (AJUSTE)" : "NÃO",
          r.address.substring(0, 40) + (r.address.length > 40 ? "..." : "")
        ]);

      doc.autoTable({
        startY: 55,
        head: [['Data', 'Hora', 'Tipo', 'Ajustado', 'Localização']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });

      // Rodapé de Assinatura
      // Usamos a propriedade lastAutoTable agora reconhecida pelo tipo estendido
      const finalY = (doc.lastAutoTable?.finalY || 0) + 30;
      doc.line(14, finalY, 90, finalY);
      doc.text("Assinatura do Colaborador", 14, finalY + 5);
      doc.line(pageWidth - 90, finalY, pageWidth - 14, finalY);
      doc.text("Assinatura do Gestor (RH)", pageWidth - 90, finalY + 5);
      
      doc.setFontSize(7);
      doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')} via PontoExato v4.8`, 14, doc.internal.pageSize.getHeight() - 10);
    });

    const fileName = `Fechamento_${company?.name}_${reportFilter.month + 1}_${reportFilter.year}.pdf`;
    doc.save(fileName);
  };

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      alert("APROVADO!");
    } catch (e) { alert("ERRO."); }
  };

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
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'dashboard', label: 'Início', icon: '🏠' },
          { id: 'colaboradores', label: 'Equipe', icon: '👥' },
          { id: 'aprovacoes', label: 'Solicitações', icon: '✅' },
          { id: 'saldos', label: 'Fechamento', icon: '📘' },
          { id: 'audit', label: 'IA Audit', icon: '⚖️' }
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
            <div className="space-y-1"><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Gestão Administrativa</p><h3 className="text-white text-lg font-black uppercase">{company?.name}</h3></div>
            <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700 text-center">
              <p className="text-[8px] text-slate-400 font-black uppercase mb-1">CÓDIGO EMPRESA</p>
              <span className="text-white font-mono text-xl font-black">{company?.accessCode || '------'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Colaboradores</p>
              <p className="text-4xl font-black text-slate-800">{stats.total}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Presentes Hoje</p>
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
            <h3 className="text-sm font-black uppercase text-slate-900">Listagem de Equipe</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">+ Novo Cadastro</button>
          </div>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Nome</th><th className="p-5">Matrícula</th><th className="p-5">Senha</th><th className="p-5 text-center">Ações</th></tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b">
                    <td className="p-5">{emp.name}</td>
                    <td className="p-5 text-slate-400">{emp.matricula}</td>
                    <td className="p-5 font-mono text-blue-500 text-[10px]">****</td>
                    <td className="p-5 text-center flex justify-center gap-2">
                      <button onClick={() => { setEditingPasswordId(emp.id); setNewPasswordValue(''); }} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Senha</button>
                      <button onClick={() => onDeleteEmployee(emp.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Excluir</button>
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
              <h3 className="text-sm font-black uppercase">Livro de Ponto / Fechamento A4</h3>
              <button onClick={handleExportPDF} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                📥 Baixar PDF Organizado
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
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Colaborador</th><th className="p-5">Data</th><th className="p-5">Hora</th><th className="p-5">Tipo</th></tr>
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
                {filteredRecords.length === 0 && <tr><td colSpan={4} className="p-16 text-center text-slate-300 font-black uppercase">Nenhum registro para o filtro selecionado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && <ComplianceAudit records={latestRecords} employees={employees} />}

      {/* Modal Cadastro Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in space-y-4">
            <h2 className="text-[14px] font-black uppercase text-center mb-6 text-orange-600 tracking-widest">Novo Colaborador</h2>
            <input type="text" placeholder="NOME COMPLETO" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="MATRÍCULA" value={newEmp.matricula} onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmp.roleFunction} onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="text" placeholder="CARGA (EX: 08:00H)" value={newEmp.workShift} onChange={e => setNewEmp({...newEmp, workShift: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
            <input type="password" placeholder="SENHA INICIAL" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-[10px] font-black border border-orange-100 outline-none" />
            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={() => { onAddEmployee(newEmp); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Redefinir Senha */}
      {editingPasswordId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
             <h2 className="text-sm font-black text-center uppercase mb-4 text-blue-600">Redefinir Senha</h2>
             <input type="password" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} placeholder="NOVA SENHA" className="w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border" />
             <div className="flex gap-3 pt-4">
                <button onClick={() => setEditingPasswordId(null)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Sair</button>
                <button onClick={handleUpdatePassword} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
