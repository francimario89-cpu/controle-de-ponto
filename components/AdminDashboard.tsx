
import React, { useState, useMemo } from 'react';
import { PointRecord, Company, Employee } from '../types';

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'dashboard' | 'colaboradores' | 'aprovacoes' | 'saldos' | 'audit';
  onNavigate: (v: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, initialTab, onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassAttempt, setAdminPassAttempt] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', roleFunction: '', workShift: '', password: '' });

  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

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

  const handleDownloadReport = () => {
    if (filteredRecords.length === 0) {
      alert("Nenhum registro para este período.");
      return;
    }

    const empName = reportFilter.matricula === 'todos' ? 'TODOS' : employees.find(e => e.matricula === reportFilter.matricula)?.name || 'COLABORADOR';
    const monthName = new Date(0, reportFilter.month).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

    let content = `LIVRO DE PONTO MENSAL - ${company?.name}\n`;
    content += `CNPJ: ${company?.cnpj || 'N/A'}\n`;
    content += `PERÍODO: ${monthName} / ${reportFilter.year}\n`;
    content += `EMPREGADO: ${empName}\n`;
    content += `------------------------------------------------------------\n`;
    content += `DATA       | HORA  | TIPO    | LOCALIZAÇÃO / STATUS\n`;
    content += `------------------------------------------------------------\n`;

    filteredRecords.forEach(r => {
      const date = new Date(r.timestamp).toLocaleDateString('pt-BR');
      const time = new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const type = (r.type || 'PONTO').toUpperCase().padEnd(8);
      content += `${date} | ${time} | ${type} | ${r.address.substring(0, 20)}\n`;
    });

    content += `------------------------------------------------------------\n`;
    content += `Software em conformidade com Portaria 671 MTP\n`;
    content += `Gerado em: ${new Date().toLocaleString()}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Livro_Ponto_${empName.replace(/ /g, '_')}_${monthName}.txt`;
    link.click();
  };

  const stats = {
    total: employees.length,
    activeToday: latestRecords.filter(r => r.timestamp.toDateString() === new Date().toDateString()).length,
    pendingRequests: 3
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-10 rounded-[44px] shadow-2xl border dark:border-slate-800 text-center space-y-6 animate-in zoom-in duration-300">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <div className="space-y-1">
             <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Painel Administrativo</h2>
             <p className="text-[10px] text-slate-500 font-bold uppercase">Área restrita de RH e Governança.</p>
           </div>
           
           <input 
             type="password" 
             placeholder="SENHA ADMINISTRATIVA" 
             value={adminPassAttempt}
             onChange={e => setAdminPassAttempt(e.target.value)}
             className={`w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl text-[11px] font-black text-center outline-none border-2 dark:text-white ${authError ? 'border-red-500 animate-shake' : 'border-transparent focus:border-orange-500/20'}`}
           />
           
           <button 
             onClick={handleVerifyAdmin}
             className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase shadow-xl active:scale-95 transition-all"
           >
             Liberar Gestão RH
           </button>
           
           {authError && <p className="text-[9px] text-red-500 font-black uppercase mt-2">Senha incorreta</p>}
        </div>
      </div>
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Equipe</p>
              <h3 className="text-4xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Registros Hoje</p>
              <h3 className="text-4xl font-black text-emerald-500">{stats.activeToday}</h3>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pendências</p>
              <h3 className="text-4xl font-black text-orange-500">{stats.pendingRequests}</h3>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[44px] p-8 border dark:border-slate-800 shadow-sm space-y-6">
           <div className="flex justify-between items-center px-2">
              <p className="text-[11px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">MENU OPERACIONAL RH</p>
              <span className="text-[10px] bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-black uppercase">Módulos Ativos</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setActiveTab('colaboradores')} className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-slate-800 rounded-[35px] hover:bg-slate-900 hover:text-white transition-all group">
                 <span className="text-3xl">👥</span>
                 <div className="text-left">
                    <p className="text-xs font-black uppercase">Quadro de Horário</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Contratação e Edição</p>
                 </div>
              </button>
              <button onClick={() => setActiveTab('aprovacoes')} className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-slate-800 rounded-[35px] hover:bg-slate-900 hover:text-white transition-all group">
                 <span className="text-3xl">✅</span>
                 <div className="text-left">
                    <p className="text-xs font-black uppercase">Aprovações Pendentes</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Atestados e Ajustes</p>
                 </div>
              </button>
              <button onClick={() => setActiveTab('saldos')} className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-slate-800 rounded-[35px] hover:bg-slate-900 hover:text-white transition-all group">
                 <span className="text-3xl">📘</span>
                 <div className="text-left">
                    <p className="text-xs font-black uppercase">Livro de Ponto</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Exportação Mensal 671</p>
                 </div>
              </button>
              <button onClick={() => setActiveTab('audit')} className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-slate-800 rounded-[35px] hover:bg-slate-900 hover:text-white transition-all group">
                 <span className="text-3xl">🛡️</span>
                 <div className="text-left">
                    <p className="text-xs font-black uppercase">Auditoria e Risco</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase">Compliance e Alertas</p>
                 </div>
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
           <div className="space-y-4 w-full flex-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Geração de Livro de Ponto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Colaborador</p>
                    <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-transparent focus:border-orange-500/20 dark:text-white">
                      <option value="todos">FILTRAR POR EQUIPE COMPLETA</option>
                      {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Mês</p>
                    <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black dark:text-white border border-slate-100 dark:border-slate-700">
                      {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Ano</p>
                    <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black dark:text-white border border-slate-100 dark:border-slate-700">
                      <option value={2024}>2024</option><option value={2025}>2025</option>
                    </select>
                 </div>
              </div>
           </div>
           <button onClick={handleDownloadReport} className="w-full md:w-auto bg-orange-600 text-white px-10 py-5 rounded-[28px] font-black text-[11px] uppercase shadow-xl hover:bg-orange-700 transition-all">
             Baixar Livro Mensal
           </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-[9px] font-black uppercase">
                 <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5">Hora</th><th className="p-5">Tipo</th><th className="p-5">Local</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold text-slate-900 dark:text-slate-300">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                       <td className="p-5">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className="p-5 font-black text-orange-600">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                       <td className="p-5 uppercase">{r.type}</td>
                       <td className="p-5 truncate max-w-[150px]">{r.address}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'colaboradores') {
     return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Equipe ForTime</h3>
              <button onClick={() => setShowAddModal(true)} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                + Novo Registro
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                 <div key={emp.id} className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border dark:border-slate-800 flex items-center gap-4 shadow-sm group">
                    <img src={emp.photo} className="w-14 h-14 rounded-2xl object-cover border dark:border-slate-700" />
                    <div className="flex-1">
                       <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{emp.name}</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase">{emp.roleFunction}</p>
                       <p className="text-[8px] font-black text-orange-600 uppercase mt-1">MAT: {emp.matricula}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => { setEditingEmp(emp); setNewEmpData({ name: emp.name, matricula: emp.matricula, roleFunction: emp.roleFunction || '', workShift: emp.workShift || '', password: '' }); }} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 hover:text-orange-600 transition-colors">✏️</button>
                      <button onClick={() => onDeleteEmployee(emp.id)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                    </div>
                 </div>
              ))}
           </div>

           {(showAddModal || editingEmp) && (
             <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
                   <h2 className="text-sm font-black text-orange-600 text-center uppercase tracking-widest">{editingEmp ? 'Editar Cadastro' : 'Novo Cadastro'}</h2>
                   <input type="text" placeholder="NOME" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border border-slate-200 dark:border-slate-700 outline-none" />
                   <input type="text" placeholder="MATRÍCULA" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border border-slate-200 dark:border-slate-700 outline-none" />
                   <input type="text" placeholder="FUNÇÃO" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border border-slate-200 dark:border-slate-700 outline-none" />
                   <input type="text" placeholder="JORNADA" value={newEmpData.workShift} onChange={e => setNewEmpData({...newEmpData, workShift: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border border-slate-200 dark:border-slate-700 outline-none" />
                   <input type="password" placeholder="SENHA DE ACESSO" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center dark:text-white border border-slate-200 dark:border-slate-700 outline-none" />
                   <div className="flex gap-3 pt-4">
                      <button onClick={() => { setShowAddModal(false); setEditingEmp(null); }} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                      <button onClick={() => { onAddEmployee(newEmpData); setShowAddModal(false); setEditingEmp(null); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar</button>
                   </div>
                </div>
             </div>
           )}
        </div>
     );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in">
       <span className="text-6xl mb-6">📂</span>
       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Módulo em Atualização</h3>
       <button onClick={() => setActiveTab('dashboard')} className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Voltar ao Início</button>
    </div>
  );
};

export default AdminDashboard;
