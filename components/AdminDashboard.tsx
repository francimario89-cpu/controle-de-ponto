
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Controle de segurança (Sempre pedir senha ao entrar)
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassAttempt, setAdminPassAttempt] = useState('');
  const [authError, setAuthError] = useState(false);

  const [newEmpData, setNewEmpData] = useState({ 
    name: '', 
    matricula: '', 
    cpf: '', 
    password: '', 
    roleFunction: '', 
    workShift: '',
    department: '' 
  });
  
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setAdminPassAttempt('');
    }
  };

  const handleCreateEmployee = () => {
    if(!newEmpData.name || !newEmpData.matricula || !newEmpData.roleFunction || !newEmpData.workShift) {
      alert("NOME, MATRÍCULA, FUNÇÃO E JORNADA SÃO OBRIGATÓRIOS");
      return;
    }
    onAddEmployee(newEmpData);
    setShowAddModal(false);
    setNewEmpData({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', workShift: '', department: '' });
  };

  const calculateHours = (matricula: string) => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const recs = latestRecords.filter(r => r.matricula === matricula && r.timestamp.getMonth() === month && r.timestamp.getFullYear() === year);
    if (recs.length < 2) return "0.00";
    const sorted = [...recs].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
    let ms = 0;
    for(let i=0; i<sorted.length; i+=2) {
      if(sorted[i] && sorted[i+1]) ms += sorted[i+1].timestamp.getTime() - sorted[i].timestamp.getTime();
    }
    return (ms / (1000 * 60 * 60)).toFixed(2);
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  // Tela de bloqueio por senha
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-10 rounded-[44px] shadow-2xl border dark:border-slate-800 text-center space-y-6">
           <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto text-primary text-2xl">🔒</div>
           <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Acesso Restrito ao RH</h2>
           <p className="text-[10px] text-slate-400 font-bold uppercase">Digite a senha de administrador para gerenciar a empresa.</p>
           
           <input 
             type="password" 
             placeholder="SENHA DO GESTOR" 
             value={adminPassAttempt}
             onChange={e => setAdminPassAttempt(e.target.value)}
             onKeyPress={e => e.key === 'Enter' && handleVerifyAdmin()}
             className={`w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[11px] font-black text-center outline-none border-2 ${authError ? 'border-red-500 animate-shake' : 'border-transparent focus:border-primary/20'}`}
           />
           
           <button 
             onClick={handleVerifyAdmin}
             className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase shadow-xl"
           >
             Liberar Dashboard
           </button>
           
           {authError && <p className="text-[9px] text-red-500 font-black uppercase">Senha incorreta. Tente novamente.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center relative">
      <div className="w-full bg-primary/5 p-4 flex justify-center gap-6 items-center border-b dark:border-slate-800">
         <div className="flex items-center gap-2">
           <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-primary font-black p-2 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 transition-colors">◀</button>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 min-w-[150px] text-center">
             {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
           </span>
           <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-primary font-black p-2 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 transition-colors">▶</button>
         </div>
      </div>

      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full max-w-4xl">
          {(['colaboradores', 'aprovacoes', 'saldos', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl overflow-y-auto p-6 no-scrollbar pb-24">
        {tab === 'colaboradores' && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row gap-4 items-center">
               <div className="relative flex-1 w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-lg">🔍</span>
                  <input 
                    type="text" 
                    placeholder="BUSCAR POR NOME OU MATRÍCULA..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full p-5 pl-12 bg-white dark:bg-slate-800 rounded-[28px] text-[11px] font-black border dark:border-slate-700 outline-none shadow-sm focus:border-primary/50 transition-all" 
                  />
               </div>
               <button onClick={() => setShowAddModal(true)} className="w-full md:w-auto bg-primary text-white px-10 py-5 rounded-[28px] font-black text-[11px] uppercase shadow-xl shadow-blue-100 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all">
                 <span className="text-xl">+</span> Novo Colaborador
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredEmployees.map(emp => (
                 <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border dark:border-slate-800 flex items-center gap-4 group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all shadow-sm">
                    <div className="relative">
                      <img src={emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}`} className="w-16 h-16 rounded-[22px] object-cover border-2 border-slate-50 dark:border-slate-700" />
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase truncate">{emp.name}</p>
                       <div className="flex flex-col gap-0.5 mt-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase truncate">{emp.roleFunction || 'SEM CARGO'}</p>
                          <p className="text-[8px] font-bold text-primary uppercase truncate">{emp.workShift || 'JORNADA NÃO DEF.'}</p>
                       </div>
                       <div className="mt-2 flex items-center gap-2">
                          <span className="text-[7px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">Saldo: {calculateHours(emp.matricula)}h</span>
                       </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteEmployee(emp.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[14px] font-black uppercase text-center mb-8 tracking-[0.2em] text-primary">Novo Colaborador</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Dados Pessoais</p>
                <input type="text" placeholder="NOME COMPLETO" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-transparent focus:border-primary/20 dark:text-white" />
                <input type="text" placeholder="MATRÍCULA" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              </div>

              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Contratação e Jornada</p>
                <input type="text" placeholder="CARGO / FUNÇÃO" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-transparent focus:border-primary/20 dark:text-white" />
                <input type="text" placeholder="JORNADA (EX: 08:00 - 18:00)" value={newEmpData.workShift} onChange={e => setNewEmpData({...newEmpData, workShift: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-transparent focus:border-primary/20 dark:text-white" />
              </div>

              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Acesso</p>
                <input type="password" placeholder="SENHA INICIAL" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              </div>
              
              <div className="flex gap-3 pt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button onClick={handleCreateEmployee} className="flex-[2] py-5 bg-primary text-white rounded-[28px] text-[10px] font-black uppercase shadow-xl shadow-blue-100 dark:shadow-none">Salvar Dados</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => { setSelectedEmployee(null); setIsResettingPassword(false); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">✖</button>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Detalhes do Contrato</p>
              <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center mb-6">
               <img src={selectedEmployee.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}`} className="w-24 h-24 rounded-[30px] object-cover border-4 border-white dark:border-slate-700 shadow-xl mb-4" />
               <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase text-center">{selectedEmployee.name}</h3>
               <div className="mt-2 text-center">
                  <p className="text-[11px] font-black text-primary uppercase">{selectedEmployee.roleFunction}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedEmployee.workShift}</p>
               </div>
            </div>

            <div className="space-y-3">
              <button 
                 onClick={() => setIsResettingPassword(!isResettingPassword)}
                 className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase"
              >
                {isResettingPassword ? 'Cancelar Troca de Senha' : '🔑 Alterar Senha de Acesso'}
              </button>

              {isResettingPassword && (
                <div className="mt-4 space-y-2 animate-in fade-in">
                  <input type="password" placeholder="DIGITE A NOVA SENHA" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-primary/20" />
                  <button onClick={() => { /* lógica de update no banco */ }} className="w-full py-5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Confirmar Alteração</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
