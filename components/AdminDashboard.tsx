
import React, { useState, useMemo } from 'react';
import { PointRecord, Company, Employee } from '../types';

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

  // Fix: Defining 'stats' to calculate team metrics and resolve missing variable errors
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
      pendingRequests: 0 // Note: Requests are managed in separate component logic
    };
  }, [employees, latestRecords]);

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
           <h2 className="text-sm font-black text-slate-900 uppercase">Acesso Restrito RH</h2>
           <input 
             type="password" 
             placeholder="SENHA ADMINISTRATIVA" 
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
           <h3 className="text-sm font-black text-slate-900 uppercase">Livro de Ponto Mensal</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black">
                <option value="todos">TODA A EQUIPE</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black">
                <option value={2024}>2024</option><option value={2025}>2025</option>
              </select>
           </div>
           <button onClick={handleDownloadReport} className="w-full bg-orange-600 text-white py-6 rounded-[28px] font-black uppercase text-xs shadow-xl hover:bg-orange-700 transition-all">
             Baixar Livro de Ponto (Portaria 671)
           </button>
        </div>
        <div className="bg-white rounded-[40px] border overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase">
                 <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5">Hora</th><th className="p-5">Tipo</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                       <td className="p-5">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className="p-5 text-orange-600">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                       <td className="p-5 uppercase">{r.type}</td>
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
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase">Quadro de Funcionários</h3>
              <button onClick={() => { setEditingEmpId(null); setNewEmpData({name:'', matricula:'', roleFunction:'', workShift:'', password:''}); setShowAddModal(true); }} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase">+ Novo</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => (
                 <div key={emp.id} className="bg-white p-6 rounded-[35px] border flex items-center gap-4 shadow-sm group">
                    <img src={emp.photo} className="w-14 h-14 rounded-2xl object-cover border" />
                    <div className="flex-1">
                       <p className="text-xs font-black uppercase">{emp.name}</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase">MAT: {emp.matricula}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => startEdit(emp)} className="p-2 bg-slate-50 rounded-lg text-slate-600 hover:text-orange-600">✏️</button>
                      <button onClick={() => onDeleteEmployee(emp.id)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500">🗑️</button>
                    </div>
                 </div>
              ))}
           </div>
           {showAddModal && (
             <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4">
                   <h2 className="text-sm font-black text-orange-600 text-center uppercase">{editingEmpId ? 'Editar Funcionário' : 'Novo Cadastro'}</h2>
                   <input type="text" placeholder="NOME" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
                   <input type="text" placeholder="MATRÍCULA" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
                   <input type="text" placeholder="FUNÇÃO" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
                   <input type="text" placeholder="JORNADA" value={newEmpData.workShift} onChange={e => setNewEmpData({...newEmpData, workShift: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
                   <input type="password" placeholder="SENHA" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-center" />
                   <div className="flex gap-3 pt-4">
                      <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                      <button onClick={() => { editingEmpId ? onUpdateEmployee(editingEmpId, newEmpData) : onAddEmployee(newEmpData); setShowAddModal(false); }} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase">Salvar</button>
                   </div>
                </div>
             </div>
           )}
        </div>
     );
  }

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase">Equipe</p>
             <h3 className="text-3xl font-black">{stats.total}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase">Hoje</p>
             <h3 className="text-3xl font-black text-emerald-500">{stats.activeToday}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase">Pendentes</p>
             <h3 className="text-3xl font-black text-orange-500">{stats.pendingRequests}</h3>
          </div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => setActiveTab('colaboradores')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all">👥 <span className="font-black ml-2 uppercase text-xs">Funcionários</span></button>
          <button onClick={() => setActiveTab('saldos')} className="p-6 bg-slate-50 rounded-[35px] text-left hover:bg-slate-900 hover:text-white transition-all">📘 <span className="font-black ml-2 uppercase text-xs">Livro de Ponto</span></button>
       </div>
    </div>
  );
};

export default AdminDashboard;
