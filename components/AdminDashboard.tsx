
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

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center relative">
      <div className="w-full bg-primary/5 p-2 flex justify-center gap-4 items-center border-b dark:border-slate-800">
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg">◀</button>
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
           {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
         </span>
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg">▶</button>
      </div>

      <div className="w-full p-2 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-center sticky top-0 z-20 overflow-x-auto no-scrollbar">
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['colaboradores', 'aprovacoes', 'saldos', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 no-scrollbar pb-24 space-y-4">
        {tab === 'colaboradores' && (
          <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="BUSCAR COLABORADOR..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black border dark:border-slate-700 outline-none shadow-sm" 
               />
               <button onClick={() => setShowAddModal(true)} className="bg-primary text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 dark:shadow-none">
                 + CADASTRAR
               </button>
             </div>

             <div className="space-y-3">
               {filteredEmployees.map(emp => (
                 <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border dark:border-slate-800 flex items-center gap-4 group cursor-pointer active:scale-95 transition-all shadow-sm">
                    <img src={emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}`} className="w-14 h-14 rounded-2xl object-cover" />
                    <div className="flex-1">
                       <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase mb-1">{emp.name}</p>
                       <div className="flex flex-wrap gap-2">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{emp.roleFunction || 'SEM CARGO'}</span>
                          <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">•</span>
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{emp.workShift || 'JORNADA NÃO DEF.'}</span>
                       </div>
                       <div className="flex gap-2 mt-2">
                          <span className="text-[7px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase">Saldo: {calculateHours(emp.matricula)}h</span>
                       </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteEmployee(emp.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR COLABORADOR ATUALIZADO */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
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

      {/* MODAL DETALHES CONTINUA IGUAL... */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => { setSelectedEmployee(null); setIsResettingPassword(false); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">✖</button>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Detalhes do Contrato</p>
              <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center mb-6">
               <img src={selectedEmployee.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}`} className="w-20 h-20 rounded-[30px] object-cover border-4 border-white shadow-xl mb-4" />
               <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase text-center">{selectedEmployee.name}</h3>
               <div className="mt-2 text-center">
                  <p className="text-[10px] font-black text-primary uppercase">{selectedEmployee.roleFunction}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{selectedEmployee.workShift}</p>
               </div>
            </div>

            <button 
               onClick={() => setIsResettingPassword(!isResettingPassword)}
               className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[9px] font-black uppercase"
            >
              {isResettingPassword ? 'Cancelar Troca de Senha' : '🔑 Alterar Senha'}
            </button>

            {isResettingPassword && (
              <div className="mt-4 space-y-2 animate-in fade-in">
                <input type="password" placeholder="NOVA SENHA" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] font-black outline-none" />
                <button onClick={() => { /* lógica de update */ }} className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase">Confirmar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
