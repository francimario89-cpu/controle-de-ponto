
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
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', department: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, "requests"), where("companyCode", "==", company.id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
    return () => unsub();
  }, [company?.id]);

  const handleUpdatePassword = async () => {
    if (!selectedEmployee?.id || !newPasswordValue) {
      alert("POR FAVOR, DIGITE A NOVA SENHA");
      return;
    }
    try {
      await updateDoc(doc(db, "employees", selectedEmployee.id), {
        password: newPasswordValue
      });
      alert("SENHA ATUALIZADA COM SUCESSO!");
      setIsResettingPassword(false);
      setNewPasswordValue('');
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      alert("ERRO AO ATUALIZAR SENHA NO BANCO DE DADOS");
    }
  };

  const handleCreateEmployee = () => {
    if(!newEmpData.name || !newEmpData.matricula) {
      alert("NOME E MATRÍCULA SÃO OBRIGATÓRIOS");
      return;
    }
    onAddEmployee(newEmpData);
    setShowAddModal(false);
    setNewEmpData({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', department: '' });
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

  const handleUpdateConfig = async (data: any) => {
    if(!company?.id) return;
    await updateDoc(doc(db, "companies", company.id), { config: { ...company.config, ...data } });
    alert("CONFIGURAÇÕES SALVAS!");
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
        {tab === 'config' && (
          <div className="space-y-4">
             <div className="p-8 bg-white dark:bg-slate-800 rounded-[40px] border dark:border-slate-800 space-y-6">
                <h3 className="text-[12px] font-black uppercase text-primary tracking-[0.2em]">Cálculo de Horas e Adicionais</h3>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">H. Extra Semanal (%)</p>
                      <input type="number" defaultValue={company?.config?.overtimePercentage || 50} onBlur={e => handleUpdateConfig({ overtimePercentage: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[12px] font-black outline-none" />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Adic. Noturno (%)</p>
                      <input type="number" defaultValue={company?.config?.nightShiftPercentage || 20} onBlur={e => handleUpdateConfig({ nightShiftPercentage: parseInt(e.target.value) })} className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[12px] font-black outline-none" />
                   </div>
                </div>
             </div>
          </div>
        )}

        {tab === 'colaboradores' && (
          <div className="space-y-4">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="BUSCAR COLABORADOR POR NOME OU MATRÍCULA..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black border dark:border-slate-700 outline-none shadow-sm" 
               />
               <button onClick={() => setShowAddModal(true)} className="bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">
                 + ADICIONAR
               </button>
             </div>

             <div className="space-y-3">
               {filteredEmployees.map(emp => (
                 <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white dark:bg-slate-900 p-5 rounded-[32px] border dark:border-slate-800 flex items-center gap-4 group cursor-pointer active:scale-95 transition-all shadow-sm">
                    <img src={emp.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}`} className="w-14 h-14 rounded-2xl object-cover" />
                    <div className="flex-1">
                       <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase mb-1">{emp.name}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Matrícula: {emp.matricula}</p>
                       <div className="flex gap-2 mt-2">
                          <span className="text-[7px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase">Saldo: {calculateHours(emp.matricula)}h</span>
                          {!emp.hasFacialRecord && <span className="text-[7px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Sem Biometria</span>}
                       </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteEmployee(emp.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                 </div>
               ))}

               {filteredEmployees.length === 0 && (
                 <div className="py-20 text-center opacity-30 flex flex-col items-center">
                   <span className="text-5xl mb-4">👥</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum colaborador encontrado</p>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-[12px] font-black uppercase text-center mb-6 tracking-widest text-primary">Novo Colaborador</h2>
            <div className="space-y-3">
              <input type="text" placeholder="NOME COMPLETO" value={newEmpData.name} onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              <input type="text" placeholder="MATRÍCULA" value={newEmpData.matricula} onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              <input type="text" placeholder="CPF" value={newEmpData.cpf} onChange={e => setNewEmpData({...newEmpData, cpf: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              <input type="text" placeholder="FUNÇÃO" value={newEmpData.roleFunction} onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              <input type="password" placeholder="SENHA INICIAL" value={newEmpData.password} onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none dark:text-white" />
              
              <div className="flex gap-2 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                <button onClick={handleCreateEmployee} className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO COLABORADOR */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => { setSelectedEmployee(null); setIsResettingPassword(false); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">✖</button>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Painel do Colaborador</p>
              <div className="w-8"></div>
            </div>

            <div className="flex flex-col items-center mb-8">
               <img src={selectedEmployee.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}`} className="w-20 h-20 rounded-[30px] object-cover border-4 border-white shadow-xl mb-4" />
               <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase text-center leading-tight">{selectedEmployee.name}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{selectedEmployee.roleFunction || 'Função não definida'}</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Últimos Registros</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                  {latestRecords.filter(r => r.matricula === selectedEmployee.matricula).slice(0, 10).map(r => (
                    <div key={r.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-800 dark:text-white">{r.timestamp.toLocaleDateString()}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{r.address.substring(0, 20)}...</span>
                      </div>
                      <span className="text-[11px] font-black text-primary uppercase">{r.type}: {r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {latestRecords.filter(r => r.matricula === selectedEmployee.matricula).length === 0 && (
                    <p className="text-[9px] text-slate-300 font-bold uppercase text-center py-6 border-2 border-dashed rounded-2xl">Nenhum ponto registrado</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t dark:border-slate-800">
                {isResettingPassword ? (
                   <div className="space-y-3 animate-in fade-in">
                     <p className="text-[9px] font-black text-primary uppercase tracking-widest text-center">Nova Senha de Acesso</p>
                     <input 
                       type="text" 
                       placeholder="DIGITE A NOVA SENHA" 
                       value={newPasswordValue} 
                       onChange={e => setNewPasswordValue(e.target.value)}
                       className="w-full p-4 bg-orange-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black outline-none border-2 border-primary" 
                     />
                     <div className="flex gap-2">
                       <button onClick={() => setIsResettingPassword(false)} className="flex-1 py-4 text-[9px] font-black uppercase text-slate-400">Cancelar</button>
                       <button onClick={handleUpdatePassword} className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[9px] font-black uppercase shadow-lg">Confirmar Troca</button>
                     </div>
                   </div>
                ) : (
                  <button 
                    onClick={() => setIsResettingPassword(true)}
                    className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[28px] text-[10px] font-black uppercase flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    🔐 Alterar Senha do Colaborador
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
