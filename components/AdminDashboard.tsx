
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
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  
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

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, "requests", requestId), { status });
      setSelectedRequest(null);
      alert(`Solicitação ${status === 'approved' ? 'Aprovada' : 'Reprovada'} com sucesso!`);
    } catch (e) {
      alert("Erro ao processar solicitação.");
    }
  };

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
    alert("Dados atualizados!");
  };

  const allEvents = [...getAutomaticHolidays(new Date().getFullYear()), ...(company?.holidays || [])].sort((a,b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex p-1 bg-slate-100 rounded-2xl min-w-max">
          {(['colaboradores', 'aprovacoes', 'jornada', 'calendario', 'ferias', 'config'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Ajustes (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-20 space-y-4">
        {tab === 'aprovacoes' && (
          <div className="space-y-3">
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Pedidos de Correção</h3>
             {requests.length === 0 ? (
               <div className="py-20 text-center opacity-30">
                 <p className="text-[10px] font-black uppercase">Nenhum ajuste pendente</p>
               </div>
             ) : (
               requests.sort((a:any, b:any) => b.createdAt - a.createdAt).map(req => (
                 <div key={req.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-orange-500 animate-pulse' : req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{req.userName}</p>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${req.type === 'atestado' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{req.type}</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Data do Evento: {new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                       <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">"{req.reason}"</p>
                    </div>

                    {req.attachment && (
                      <button onClick={() => setSelectedRequest(req)} className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        👁️ Ver Anexo / Detalhes
                      </button>
                    )}

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase border border-red-100">Rejeitar</button>
                        <button onClick={() => handleRequestAction(req.id, 'approved')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Aprovar Ajuste</button>
                      </div>
                    )}
                 </div>
               ))
             )}
          </div>
        )}

        {tab === 'colaboradores' && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Gestão de Equipe</h3>
            {employees.map(e => (
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm hover:border-orange-200 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={e.photo} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" />
                  <div>
                    <p className="text-xs font-black text-slate-800">{e.name}</p>
                    <p className="text-[8px] font-bold text-orange-500 uppercase tracking-tighter">{e.roleFunction || 'Sem Função'}</p>
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:bg-orange-50 hover:text-orange-600 transition-all">Editar</button>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Detalhes do Pedido */}
        {selectedRequest && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-sm rounded-[44px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 space-y-6">
                   <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Documento Comprobatório</h3>
                      <button onClick={() => setSelectedRequest(null)} className="text-slate-300 text-xl">✕</button>
                   </div>
                   {selectedRequest.attachment ? (
                     <img src={selectedRequest.attachment} className="w-full rounded-3xl border border-slate-100 shadow-inner" />
                   ) : (
                     <div className="py-12 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-100">
                        <p className="text-[10px] font-black text-slate-300 uppercase">Sem anexo visual</p>
                     </div>
                   )}
                   <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center">{selectedRequest.userName} — {selectedRequest.date}</p>
                      <div className="flex gap-3">
                        <button onClick={() => handleRequestAction(selectedRequest.id, 'rejected')} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Ignorar</button>
                        <button onClick={() => handleRequestAction(selectedRequest.id, 'approved')} className="flex-2 py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Aprovar Agora</button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Modal Editar Colaborador */}
        {editingEmp && (
          <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-sm rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-y-auto max-h-[85vh] no-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Perfil Profissional</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-300">✕</button>
              </div>
              
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <input type="text" placeholder="Nome" value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="Senha" value={editingEmp.password} onChange={e => setEditingEmp({...editingEmp, password: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" />
                <input type="text" placeholder="Cargo/Função" value={editingEmp.roleFunction || ''} onChange={e => setEditingEmp({...editingEmp, roleFunction: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
                <input type="text" placeholder="Jornada" value={editingEmp.workShift || ''} onChange={e => setEditingEmp({...editingEmp, workShift: e.target.value})} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold border border-orange-100" />
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
