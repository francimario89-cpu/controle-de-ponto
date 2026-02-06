
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
  
  // States para Paradas Personalizadas
  const [stopDate, setStopDate] = useState('');
  const [stopDesc, setStopDesc] = useState('');

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

  // Função para calcular feriados automáticos (CLT Brasil)
  const getAutomaticHolidays = (year: number): Holiday[] => {
    const holidays: Holiday[] = [
      { id: '1', date: `${year}-01-01`, description: 'Confraternização Universal', type: 'feriado' },
      { id: '2', date: `${year}-04-21`, description: 'Tiradentes', type: 'feriado' },
      { id: '3', date: `${year}-05-01`, description: 'Dia do Trabalho', type: 'feriado' },
      { id: '4', date: `${year}-09-07`, description: 'Independência do Brasil', type: 'feriado' },
      { id: '5', date: `${year}-10-12`, description: 'Nossa Sra. Aparecida', type: 'feriado' },
      { id: '6', date: `${year}-11-02`, description: 'Finados', type: 'feriado' },
      { id: '7', date: `${year}-11-15`, description: 'Proclamação da República', type: 'feriado' },
      { id: '8', date: `${year}-12-25`, description: 'Natal', type: 'feriado' },
    ];

    // Cálculo de Páscoa para feriados móveis
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    
    const easter = new Date(year, month - 1, day);
    
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().split('T')[0];
    };

    holidays.push({ id: 'm1', date: addDays(easter, -47), description: 'Carnaval', type: 'feriado' });
    holidays.push({ id: 'm2', date: addDays(easter, -2), description: 'Sexta-feira Santa', type: 'feriado' });
    holidays.push({ id: 'm3', date: addDays(easter, 60), description: 'Corpus Christi', type: 'feriado' });

    return holidays;
  };

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

  const handleAddStop = async () => {
    if (!stopDate || !stopDesc || !company?.id) return;
    const newStop: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      date: stopDate,
      description: stopDesc,
      type: 'parada'
    };
    await updateDoc(doc(db, "companies", company.id), {
      holidays: arrayUnion(newStop)
    });
    setStopDate('');
    setStopDesc('');
  };

  const allEvents = [...getAutomaticHolidays(new Date().getFullYear()), ...(company?.holidays || [])].sort((a,b) => a.date.localeCompare(b.date));

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
                    <p className="text-[8px] font-bold text-orange-500 uppercase">{e.roleFunction || 'Sem Função'}</p>
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula} • {e.workShift || 'S/ Jornada'}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[9px] font-black uppercase">Editar</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'jornada' && (
          <div className="bg-white p-8 rounded-[44px] border border-slate-100 shadow-sm space-y-6">
             <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto text-3xl">🕒</div>
             <div className="text-center">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Escalas e Ocupações</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Definições globais de RH</p>
             </div>
             
             <div className="space-y-3">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Carga Horária Padrão</p>
                   <p className="text-xs font-bold text-slate-700">Seg-Sex: 08:00 - 18:00 (1h Intervalo)</p>
                </div>
                <p className="text-[9px] text-slate-400 px-4 text-center">Para mudar a jornada de um colaborador específico, use o botão "EDITAR" na lista de colaboradores.</p>
             </div>
          </div>
        )}

        {tab === 'calendario' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Nova Parada/Recesso</h3>
               <div className="space-y-3">
                  <input type="date" value={stopDate} onChange={e => setStopDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <input type="text" placeholder="Motivo (Ex: Parada Técnica, Recesso Local)" value={stopDesc} onChange={e => setStopDesc(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                  <button onClick={handleAddStop} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Adicionar Parada</button>
               </div>
            </div>

            <div className="space-y-3">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Agenda Anual {new Date().getFullYear()}</h3>
               <div className="grid gap-2">
                 {allEvents.map((h, idx) => (
                   <div key={idx} className={`p-4 rounded-[28px] border flex items-center justify-between ${h.type === 'feriado' ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${h.type === 'feriado' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {h.type === 'feriado' ? '🇧🇷' : '🛑'}
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-800">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{h.description}</p>
                         </div>
                      </div>
                      <span className="text-[7px] font-black uppercase text-slate-300">{h.type}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {editingEmp && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Editar Colaborador</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
              </div>
              
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Nome</label>
                  <input type="text" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Senha</label>
                  <input type="text" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Função / Cargo</label>
                  <input type="text" placeholder="Ex: Motorista" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Jornada de Trabalho</label>
                  <input type="text" placeholder="Ex: 08:00 - 18:00" value={editingEmp.workShift || ''} onChange={e => setEditingEmp({...editingEmp, workShift: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
                </div>
                <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase shadow-xl">Salvar Dados</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
