
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ComplianceAudit from './ComplianceAudit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  
  const [newEmp, setNewEmp] = useState({ 
    name: '', 
    matricula: '', 
    cpf: '',
    roleFunction: '', 
    workShift: '08:00 - 12:00 / 13:00 - 17:00',
    weeklyHours: 44,
    password: '',
    ctpsNumber: '',
    ctpsSeries: ''
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

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      return (reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula) &&
             date.getMonth() === reportFilter.month &&
             date.getFullYear() === reportFilter.year;
    });
  }, [latestRecords, reportFilter]);

  const calculateHoursDiff = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const formatMinutesToHours = (minutes: number) => {
    if (minutes <= 0) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleExportPDF = () => {
    const records = filteredRecords;
    const doc = new jsPDF() as jsPDFWithPlugin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const employeesToExport = reportFilter.matricula === 'todos' 
      ? employees 
      : employees.filter(e => e.matricula === reportFilter.matricula);

    employeesToExport.forEach((emp, index) => {
      if (index > 0) doc.addPage();

      // TITULO
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const monthLabel = new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
      doc.text(`FOLHA DE PONTO | MÊS/ANO: ${monthLabel} / ${reportFilter.year}`, pageWidth / 2, 12, { align: 'center' });

      // BOX 1: DADOS DO EMPREGADOR
      doc.setFontSize(8);
      doc.rect(margin, 15, contentWidth, 24);
      doc.text("DADOS DO EMPREGADOR", pageWidth / 2, 19, { align: 'center' });
      doc.line(margin, 21, pageWidth - margin, 21);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Nome: ${company?.name || ''}`, margin + 2, 25);
      // Alterado de CPF para CNPJ conforme solicitação
      doc.text(`CNPJ: ${company?.cnpj || ''}`, pageWidth / 2 + 20, 25);
      doc.text(`Endereço: ${company?.address || ''}`, margin + 2, 29);
      doc.text(`Cidade: ${company?.city || ''}`, margin + 2, 33);
      doc.text(`Estado: ${company?.state || ''}`, pageWidth / 2 - 10, 33);
      doc.text(`CEP: ${company?.zip || ''}`, pageWidth / 2 + 20, 33);
      doc.text(`Bairro: ${company?.neighborhood || ''}`, margin + 2, 37);

      // BOX 2: DADOS DO COLABORADOR
      doc.rect(margin, 41, contentWidth, 30);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO COLABORADOR", pageWidth / 2, 45, { align: 'center' });
      doc.line(margin, 47, pageWidth - margin, 47);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Nome: ${emp.name}`, margin + 2, 51);
      doc.text(`Carteira de trabalho nº: ${emp.ctpsNumber || ''}`, margin + 2, 56);
      doc.text(`Série: ${emp.ctpsSeries || ''}`, pageWidth / 2 - 20, 56);
      doc.text(`Cargo: ${emp.roleFunction || ''}`, pageWidth / 2 + 20, 56);
      
      doc.setFont("helvetica", "bold");
      doc.text("Horário de trabalho", margin + 2, 63);
      doc.text("contratado", margin + 2, 66);
      
      // Linhas do horário no box
      doc.rect(margin + 40, 60, contentWidth - 40, 9);
      doc.setFontSize(7);
      doc.text("Entrada: ______   Saída/almoço: ______   Retorno/almoço: ______   Saída: ______", margin + 42, 66);
      doc.setFontSize(8);

      // TABELA DE PONTO
      const daysInMonth = new Date(reportFilter.year, reportFilter.month + 1, 0).getDate();
      const body = [];

      // Jornada contratada média (8h48m p/ 44h sem) = 528 min
      const dailyContractedMinutes = 528; 

      for (let day = 1; day <= 31; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dayRecs = records.filter(r => 
          r.matricula === emp.matricula && 
          new Date(r.timestamp).toLocaleDateString('pt-BR').startsWith(dayStr + '/')
        ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const e1 = dayRecs[0] ? new Date(dayRecs[0].timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';
        const s1 = dayRecs[1] ? new Date(dayRecs[1].timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';
        const e2 = dayRecs[2] ? new Date(dayRecs[2].timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';
        const s2 = dayRecs[3] ? new Date(dayRecs[3].timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';

        let extraStr = "";
        if (day <= daysInMonth && e1 && s1 && e2 && s2) {
            const worked = calculateHoursDiff(e1, s1) + calculateHoursDiff(e2, s2);
            if (worked > dailyContractedMinutes) {
                extraStr = formatMinutesToHours(worked - dailyContractedMinutes);
            }
        }

        body.push([
          dayStr,
          day <= daysInMonth ? e1 : '',
          day <= daysInMonth ? s1 : '',
          day <= daysInMonth ? e2 : '',
          day <= daysInMonth ? s2 : '',
          '', // RUBRICA
          day <= daysInMonth ? extraStr : '',
          ''  // VISTO
        ]);
      }

      doc.autoTable({
        startY: 75,
        head: [['DIA\nMÊS', 'ENTRADA', 'INÍCIO DO\nINTERVALO', 'FIM DO\nINTERVALO', 'SAÍDA', 'RUBRICA', 'HORA EXTRA', 'VISTO']],
        body: body,
        theme: 'grid',
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            lineWidth: 0.1, 
            fontSize: 6, 
            halign: 'center', 
            valign: 'middle', 
            fontStyle: 'bold' 
        },
        styles: { 
            fontSize: 7, 
            cellPadding: 0.5, 
            halign: 'center', 
            textColor: [0, 0, 0], 
            lineWidth: 0.1,
            minCellHeight: 6
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 15 }
        },
        margin: { left: margin, right: margin }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      // Removido 'doméstico' e alterado para 'colaborador' conforme solicitado
      doc.text(`Assinatura do colaborador: __________________________________________________________________`, margin, finalY);
    });

    doc.save(`FOLHA_PONTO_${company?.name || 'EMPRESA'}_${reportFilter.month + 1}_${reportFilter.year}.pdf`);
  };

  const handleUpdatePassword = async () => {
    if (!editingPasswordId || !newPasswordValue) return;
    try {
      await updateDoc(doc(db, "employees", editingPasswordId), { password: newPasswordValue });
      alert("SENHA ATUALIZADA!");
      setEditingPasswordId(null);
      setNewPasswordValue('');
    } catch (e) { alert("ERRO AO ATUALIZAR."); }
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'dashboard', label: 'Início', icon: '🏠' },
          { id: 'colaboradores', label: 'Equipe', icon: '👥' },
          { id: 'aprovacoes', label: 'Pedidos', icon: '✅' },
          { id: 'saldos', label: 'Folhas PDF', icon: '📘' },
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
            <div className="space-y-1"><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Painel Administrativo</p><h3 className="text-white text-lg font-black uppercase">{company?.name}</h3></div>
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
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ativos Hoje</p>
              <p className="text-4xl font-black text-orange-600">{stats.activeToday}</p>
            </div>
            <div className="bg-white p-8 rounded-[40px] border shadow-sm text-center">
              <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Solicitações</p>
              <p className="text-4xl font-black text-blue-600">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'colaboradores' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black uppercase text-slate-900">Gestão de Equipe</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">+ Novo Cadastro</button>
          </div>
          <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                <tr><th className="p-5">Nome</th><th className="p-5">Matrícula</th><th className="p-5">Função</th><th className="p-5 text-center">Ações</th></tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase">
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b">
                    <td className="p-5">{emp.name}</td>
                    <td className="p-5 text-slate-400">{emp.matricula}</td>
                    <td className="p-5 text-slate-500">{emp.roleFunction || '-'}</td>
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
              <h3 className="text-sm font-black uppercase">Exportar Folha Ponto (PDF A4)</h3>
              <button onClick={handleExportPDF} className="bg-orange-600 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                📥 Baixar Folha Oficial
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos Colaboradores</option>
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
        </div>
      )}

      {activeTab === 'audit' && <ComplianceAudit records={latestRecords} employees={employees} />}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[44px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[14px] font-black uppercase text-center mb-6 text-orange-600 tracking-widest">Novo Colaborador</h2>
            <div className="space-y-3">
              <input type="text" placeholder="NOME COMPLETO" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <div className="flex gap-2">
                <input type="text" placeholder="MATRÍCULA" value={newEmp.matricula} onChange={e => setNewEmp({...newEmp, matricula: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="text" placeholder="CPF" value={newEmp.cpf} onChange={e => setNewEmp({...newEmp, cpf: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmp.roleFunction} onChange={e => setNewEmp({...newEmp, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              <div className="flex gap-2">
                <input type="text" placeholder="CTPS Nº" value={newEmp.ctpsNumber} onChange={e => setNewEmp({...newEmp, ctpsNumber: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="text" placeholder="SÉRIE" value={newEmp.ctpsSeries} onChange={e => setNewEmp({...newEmp, ctpsSeries: e.target.value})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="HORÁRIO (EX: 08:00H)" value={newEmp.workShift} onChange={e => setNewEmp({...newEmp, workShift: e.target.value})} className="flex-[2] p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
                <input type="number" placeholder="HORAS/SEM" value={newEmp.weeklyHours} onChange={e => setNewEmp({...newEmp, weeklyHours: parseInt(e.target.value)})} className="flex-1 p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border" />
              </div>
              <input type="password" placeholder="SENHA DE ACESSO" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-[10px] font-black border border-orange-100 outline-none" />
            </div>
            
            <div className="flex gap-3 pt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={() => { onAddEmployee(newEmp); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Cadastrar</button>
            </div>
          </div>
        </div>
      )}

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
