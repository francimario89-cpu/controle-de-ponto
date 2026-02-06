
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, Holiday } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', department: '' });

  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean, empId: string, empName: string }>({ isOpen: false, empId: '', empName: '' });
  const [newPasswordValue, setNewPasswordValue] = useState('');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const handleUpdatePassword = async () => {
    if (!newPasswordValue) return alert("Digite a nova senha.");
    try {
      await updateDoc(doc(db, "employees", resetPasswordModal.empId), { password: newPasswordValue });
      alert("SENHA ATUALIZADA!");
      setResetPasswordModal({ isOpen: false, empId: '', empName: '' });
      setNewPasswordValue('');
    } catch { alert("ERRO AO ATUALIZAR"); }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.description || !company?.id) return;
    try {
      const holidayObj: Holiday = { id: Date.now().toString(), date: newHoliday.date, description: newHoliday.description, type: 'feriado' };
      await updateDoc(doc(db, "companies", company.id), { holidays: arrayUnion(holidayObj) });
      setNewHoliday({ date: '', description: '' });
      alert("FERIADO ADICIONADO!");
    } catch { alert("Erro ao adicionar"); }
  };

  const generatePrintableFolha = (emp: Employee) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthName = viewDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const empRecs = latestRecords.filter(r => r.matricula === emp.matricula && r.timestamp.getMonth() === month && r.timestamp.getFullYear() === year);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><body onload="window.print()"><h1 style="text-align:center;">PONTO: ${emp.name}</h1><p>Mes: ${monthName}/${year}</p></body></html>`);
    printWindow.document.close();
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.matricula.includes(searchTerm));

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      <div className="w-full bg-primary/5 p-2 flex justify-center gap-4 items-center border-b dark:border-slate-800">
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm">◀</button>
         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
           {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
         </span>
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-primary font-black px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm">▶</button>
      </div>

      <div className="w-full p-2 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex justify-center sticky top-0 z-20 overflow-x-auto no-scrollbar">
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['relatorio', 'colaboradores', 'saldos', 'config', 'calendario'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${tab === t ? 'bg-primary text-white shadow-sm' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-3 no-scrollbar pb-24 space-y-3">
        {tab === 'colaboradores' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder="BUSCAR NOME..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-3 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black border dark:border-slate-700 outline-none dark:text-white" />
              <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 text-white px-4 rounded-2xl font-black text-[10px] shadow-sm">+</button>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border dark:border-slate-700 flex items-center justify-between shadow-sm hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-8 h-8 rounded-lg object-cover border dark:border-slate-700" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate leading-tight">{e.name}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none">MAT: {e.matricula} • CPF: {e.cpf || '---'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => generatePrintableFolha(e)} className="w-7 h-7 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg flex items-center justify-center text-[10px] active:scale-90" title="Relatório">📄</button>
                    <button onClick={() => setResetPasswordModal({ isOpen: true, empId: e.id, empName: e.name })} className="w-7 h-7 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-lg flex items-center justify-center text-[10px]" title="Senha">🔑</button>
                    <button onClick={() => onDeleteEmployee(e.id)} className="w-7 h-7 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-lg flex items-center justify-center text-[10px]" title="Excluir">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'calendario' && (
           <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 space-y-3">
                <h3 className="text-[9px] font-black uppercase text-primary">Novo Evento</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                   <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold dark:text-white outline-none" />
                   <input type="text" placeholder="DESCRIÇÃO" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value.toUpperCase()})} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold dark:text-white outline-none" />
                   <button onClick={handleAddHoliday} className="bg-primary text-white p-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Salvar</button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700">
                <h3 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">Feriados Listados</h3>
                <div className="space-y-2">
                  {company?.holidays?.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                    <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">{h.date.split('-').reverse().join('/')}</span>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{h.description}</span>
                       </div>
                       <button onClick={async () => {
                         if(confirm("REMOVER?")) await updateDoc(doc(db, "companies", company.id), { holidays: arrayRemove(h) });
                       }} className="text-red-400 p-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        )}

        {tab === 'relatorio' && (
           <div className="grid grid-cols-1 gap-1.5">
             {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
               <div key={record.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border dark:border-slate-700 shadow-sm flex items-center gap-4">
                 <img src={record.photo} className="w-10 h-10 rounded-lg object-cover" />
                 <div>
                   <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1">{record.userName}</p>
                   <p className="text-[8px] font-black text-primary uppercase">{record.timestamp.toLocaleDateString()} • {record.timestamp.toLocaleTimeString()}</p>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[450] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 space-y-4 shadow-2xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Alterar Senha</h3>
              <p className="text-center font-black text-[12px] dark:text-white uppercase">{resetPasswordModal.empName}</p>
              <input type="text" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl text-center font-black dark:text-white outline-none" placeholder="SENHA" />
              <div className="flex gap-2">
                <button onClick={() => setResetPasswordModal({ isOpen: false, empId: '', empName: '' })} className="flex-1 py-3 text-slate-400 font-black text-[9px] uppercase">Sair</button>
                <button onClick={handleUpdatePassword} className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-6 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">Novo Colaborador</h3>
            <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none dark:text-white" required />
            <input type="text" placeholder="CPF" onChange={e => setNewEmpData({...newEmpData, cpf: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none dark:text-white" required />
            <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-bold outline-none dark:text-white" required />
            <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-3 bg-orange-50 dark:bg-slate-900 border-2 border-primary/20 rounded-xl text-[10px] font-bold dark:text-white outline-none" required />
            <button onClick={() => { onAddEmployee(newEmpData); setShowAddModal(false); }} className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg mt-2">Finalizar</button>
            <button onClick={() => setShowAddModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[9px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
