
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, deleteDoc, addDoc, arrayUnion } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP }) => {
  const [tab, setTab] = useState<'colaboradores' | 'aprovacoes' | 'calendario' | 'config'>('colaboradores');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  
  // States para Feriados
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  useEffect(() => {
    if (!company?.id) return;
    const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
    return onSnapshot(q, (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
  }, [company?.id]);

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    await updateDoc(doc(db, "employees", editingEmp.id), {
      name: editingEmp.name,
      password: editingEmp.password,
      roleFunction: editingEmp.roleFunction || '',
      workShift: editingEmp.workShift || ''
    });
    setEditingEmp(null);
    alert("Dados do colaborador atualizados!");
  };

  const handleAddHoliday = async () => {
    if (!holidayDate || !holidayDesc || !company?.id) return;
    const newHoliday: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      date: holidayDate,
      description: holidayDesc,
      type: 'feriado'
    };
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayUnion(newHoliday)
    });
    setHolidayDate('');
    setHolidayDesc('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex p-1 bg-slate-100 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'calendario', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-6 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Pendências (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-20 space-y-4">
        {tab === 'colaboradores' && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Gestão de Equipe</h3>
            {employees.map(e => (
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <img src={e.photo} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" />
                  <div>
                    <p className="text-xs font-black text-slate-800">{e.name}</p>
                    <p className="text-[8px] font-bold text-orange-500 uppercase">{e.roleFunction || 'Função não definida'}</p>
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula} • {e.workShift || 'S/ Jornada'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingEmp(e)} className="p-3 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase">Editar</button>
                  <button onClick={() => onDeleteEmployee(e.id)} className="p-3 text-red-200 hover:text-red-500 transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Novo Feriado/Parada</h3>
               <div className="space-y-3">
                  <input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <input type="text" placeholder="Descrição (Ex: Natal, Recesso)" value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <button onClick={handleAddHoliday} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Salvar no Calendário</button>
               </div>
            </div>

            <div className="space-y-3">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Datas Cadastradas</h3>
               {company?.holidays?.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                 <div key={h.id} className="bg-white p-5 rounded-[32px] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-lg">🗓️</div>
                       <div>
                          <p className="text-xs font-black text-slate-800">{new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{h.description}</p>
                       </div>
                    </div>
                    <button className="text-red-200">✕</button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Modal de Edição */}
        {editingEmp && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Editar Colaborador</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
              </div>
              
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Nome Completo</label>
                  <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Senha de Acesso</label>
                  <input type="text" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Função / Ocupação</label>
                  <input type="text" placeholder="Ex: Analista Financeiro" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Jornada de Trabalho</label>
                  <input type="text" placeholder="Ex: 08:00 às 18:00" value={editingEmp.workShift || ''} onChange={e => setEditingEmp({...editingEmp, workShift: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                  <button type="submit" className="flex-2 bg-orange-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl shadow-orange-100">Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
