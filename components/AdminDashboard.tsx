
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
  
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [selectedAuditEmp, setSelectedAuditEmp] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);

  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

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
    if (reportFilter.matricula === 'todos') {
      alert("Por favor, selecione um colaborador específico para gerar a Folha Individual.");
      return;
    }

    const emp = employees.find(e => e.matricula === reportFilter.matricula);
    if (!emp) return;

    const monthName = new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const daysInMonth = new Date(reportFilter.year, reportFilter.month + 1, 0).getDate();

    // Agrupar registros por dia
    const dailyData: { [key: number]: string[] } = {};
    filteredRecords.forEach(r => {
      const d = new Date(r.timestamp).getDate();
      if (!dailyData[d]) dailyData[d] = [];
      dailyData[d].push(new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    });

    // Ordenar horários de cada dia
    Object.keys(dailyData).forEach(day => {
      dailyData[parseInt(day)].sort();
    });

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 20px; color: #000; }
        .container { width: 100%; max-width: 800px; margin: auto; border: 1px solid #000; padding: 1px; }
        .title { text-align: center; font-size: 14px; font-weight: bold; border-bottom: 2px solid #000; padding: 10px 0; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 2px 4px; height: 14px; }
        .header-box { background: #f0f0f0; font-weight: bold; font-size: 7px; text-transform: uppercase; }
        .field-label { font-size: 6px; font-weight: bold; color: #444; display: block; }
        .field-value { font-size: 9px; font-weight: bold; }
        .ponto-table th { font-size: 7px; font-weight: bold; background: #eee; }
        .summary-table { margin-top: 5px; }
        .footer { margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
        @media print { 
          body { padding: 0; } 
          .container { border: none; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">FOLHA DE PONTO INDIVIDUAL DE TRABALHO</div>
        
        <table>
          <tr>
            <td colspan="3"><span class="field-label">EMPREGADOR:</span><span class="field-value">${company?.name || ''}</span></td>
            <td><span class="field-label">CEI / CNPJ Nº:</span><span class="field-value">${company?.cnpj || ''}</span></td>
          </tr>
          <tr>
            <td colspan="4"><span class="field-label">ENDEREÇO:</span><span class="field-value">${company?.address || ''}</span></td>
          </tr>
          <tr>
            <td colspan="2"><span class="field-label">EMPREGADO(A):</span><span class="field-value">${emp.name}</span></td>
            <td><span class="field-label">CTPS Nº E SÉRIE:</span><span class="field-value">${emp.cpf || '---'}</span></td>
            <td><span class="field-label">DATA DE ADMISSÃO:</span><span class="field-value">${emp.admissionDate || '---'}</span></td>
          </tr>
          <tr>
            <td colspan="2"><span class="field-label">FUNÇÃO:</span><span class="field-value">${emp.roleFunction || 'COLABORADOR'}</span></td>
            <td colspan="2"><span class="field-label">HORÁRIO DE TRABALHO DE SEG. A SEXTA FEIRA:</span><span class="field-value">${emp.workShift || '08:00 ÀS 18:00'}</span></td>
          </tr>
          <tr>
            <td><span class="field-label">HORÁRIO AOS SÁBADOS:</span><span class="field-value">---</span></td>
            <td><span class="field-label">DESCANSO SEMANAL:</span><span class="field-value">DOMINGO</span></td>
            <td><span class="field-label">MÊS:</span><span class="field-value">${monthName}</span></td>
            <td><span class="field-label">ANO:</span><span class="field-value">${reportFilter.year}</span></td>
          </tr>
        </table>

        <table class="ponto-table">
          <thead>
            <tr>
              <th rowspan="2" width="30">DIAS MÊS</th>
              <th rowspan="2">ENTRADA MANHÃ</th>
              <th colspan="2">ALMOÇO</th>
              <th rowspan="2">SAÍDA TARDE</th>
              <th colspan="2">EXTRAS</th>
              <th rowspan="2" width="150">ASSINATURA</th>
            </tr>
            <tr>
              <th>SAÍDA</th>
              <th>RETORNO</th>
              <th>ENTRADA</th>
              <th>SAÍDA</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const times = dailyData[day] || [];
              const isInvalid = day > daysInMonth;
              
              return `
                <tr style="${isInvalid ? 'background:#ddd' : ''}">
                  <td align="center"><b>${String(day).padStart(2, '0')}</b></td>
                  <td align="center">${times[0] || ''}</td>
                  <td align="center">${times[1] || ''}</td>
                  <td align="center">${times[2] || ''}</td>
                  <td align="center">${times[3] || ''}</td>
                  <td align="center"></td>
                  <td align="center"></td>
                  <td></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td width="50%" valign="top">
              <table style="width:100%; border:none">
                <tr class="header-box"><td colspan="2">RESUMO GERAL</td><td width="50">R$</td></tr>
                <tr><td width="20">+</td><td>DIAS / HORAS NORMAIS</td><td></td></tr>
                <tr><td width="20">+</td><td>H. EXTRAS / ADICIONAIS</td><td></td></tr>
                <tr><td width="20">(-)</td><td>FALTAS NO MÊS</td><td></td></tr>
                <tr class="header-box"><td colspan="2">SUB-TOTAL / BASE CÁLCULO</td><td></td></tr>
                <tr><td width="20">(-)</td><td>% INSS</td><td></td></tr>
                <tr><td width="20">(-)</td><td>OUTROS DESCONTOS</td><td></td></tr>
                <tr class="header-box"><td colspan="2">TOTAL LÍQUIDO A RECEBER</td><td></td></tr>
              </table>
            </td>
            <td width="50%" valign="top">
               <div style="height:100px; display:flex; flex-direction:column; justify-content:space-between">
                  <span class="field-label">VISTO DA FISCALIZAÇÃO:</span>
                  <div style="border-top:1px solid #000; margin-top:50px; text-align:center; font-size:7px">ASSINATURA DO EMPREGADOR</div>
               </div>
            </td>
          </tr>
        </table>
        <div style="padding:10px; text-align:center; font-size:7px; font-weight:bold">
          Assinatura do empregado: __________________________________________________________________
        </div>
      </div>
      <div style="text-align:center; margin-top:20px">
        <button onclick="window.print()" style="padding:10px 20px; background:#000; color:#fff; border:none; border-radius:5px; cursor:pointer">IMPRIMIR / SALVAR PDF</button>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Folha_Ponto_${emp.name.replace(/ /g, '_')}_${monthName}.html`;
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

  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Geração de Folha de Ponto</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200">
                <option value="todos">SELECIONE O COLABORADOR</option>
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
             📥 Gerar Folha Individual (Modelo CLT)
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
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  // Restante das abas (colaboradores, aprovações, audit, dashboard) permanecem as mesmas
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
          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest px-2">Módulos Administrativos</p>
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
