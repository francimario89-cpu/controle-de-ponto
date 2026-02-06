
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'config' | 'jornada' | 'ferias';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'colaboradores');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

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
          {(['colaboradores', 'aprovacoes', 'jornada', 'calendario', 'ferias', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Solicitações (${requests.filter(r => r.status === 'pending').length})` : t}
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
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="p-3 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase">Editar</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'jornada' && (
          <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm space-y-6 text-center">
             <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto text-3xl">🕒</div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Jornadas de Trabalho</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase">Configure a carga horária padrão</p>
             <div className="space-y-3 text-left">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Padrão da Empresa</p>
                   <p className="text-xs font-bold text-slate-700">08:00 — 12:00 | 13:00 — 18:00</p>
                </div>
                <button className="w-full py-4 border-2 border-dashed border-orange-200 rounded-3xl text-[9px] font-black text-orange-500 uppercase">
                  + Criar Nova Escala
                </button>
             </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Registrar Evento</h3>
               <div className="space-y-3">
                  <input type="date" value={holidayDate} onChange={e => setHolidayDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <input type="text" placeholder="Nome do Feriado ou Parada" value={holidayDesc} onChange={e => setHolidayDesc(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <button onClick={handleAddHoliday} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Salvar no Calendário</button>
               </div>
            </div>
          </div>
        )}

        {tab === 'ferias' && (
          <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm space-y-6 text-center">
             <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto text-3xl">🏖️</div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Gestão de Férias</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase">Monitoramento de períodos aquisitivos</p>
             <div className="p-12 border-2 border-dashed border-slate-100 rounded-[40px]">
                <p className="text-[9px] font-black text-slate-300 uppercase">Nenhum colaborador em férias no momento</p>
             </div>
          </div>
        )}

        {editingEmp && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Perfil Profissional</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
              </div>
              
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <input type="text" placeholder="Nome" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="Nova Senha" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="Cargo/Função" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="Escala de Trabalho" value={editingEmp.workShift || ''} onChange={e => setEditingEmp({...editingEmp, workShift: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
                <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl">Salvar Alterações</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
