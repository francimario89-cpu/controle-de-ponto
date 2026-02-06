
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
  
  const [stopDate, setStopDate] = useState('');
  const [stopDesc, setStopDesc] = useState('');

  // Branding States
  const [themeColor, setThemeColor] = useState(company?.themeColor || '#f97316');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (company?.id) {
          await updateDoc(doc(db, "companies", company.id), { logoUrl: base64 });
          alert("Logo da empresa atualizada!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    if (!company?.id) return;
    setIsSavingBranding(true);
    await updateDoc(doc(db, "companies", company.id), { themeColor });
    setIsSavingBranding(false);
    alert("Cores do sistema atualizadas!");
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
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'aprovacoes' ? `Ajustes (${requests.filter(r => r.status === 'pending').length})` : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-20 space-y-4">
        {tab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Identidade Visual</h3>
               
               {/* Logo Upload */}
               <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-40 h-20 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                    {company?.logoUrl ? (
                      <img src={company.logoUrl} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase">Sem Logo</span>
                    )}
                  </div>
                  <label className="cursor-pointer bg-white px-6 py-2 rounded-xl text-[10px] font-black uppercase text-primary border border-primary/20 shadow-sm active:scale-95 transition-all">
                    Selecionar Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">PNG ou JPG com fundo transparente</p>
               </div>

               {/* Color Picker */}
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Cor Temática do App</p>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <input 
                      type="color" 
                      value={themeColor} 
                      onChange={e => setThemeColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border-none bg-transparent cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-700 uppercase">{themeColor.toUpperCase()}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Escolha a cor que representa sua marca</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {['#f97316', '#2563eb', '#10b981', '#7c3aed', '#ef4444'].map(c => (
                      <button 
                        key={c} 
                        onClick={() => setThemeColor(c)}
                        className="w-full h-8 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={handleSaveBranding}
                    disabled={isSavingBranding}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary-light active:scale-95 transition-all"
                  >
                    {isSavingBranding ? 'Salvando...' : 'Aplicar Alterações Visuais'}
                  </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-2">Configurações de Rede</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="IP Autorizado (Ex: 192.168.1.1)" 
                  value={company?.authorizedIP || ''} 
                  onChange={e => onUpdateIP(e.target.value)} 
                  className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" 
                />
                <p className="text-[8px] text-slate-400 px-4 uppercase font-bold">Restrinja batidas apenas à rede Wi-Fi da empresa.</p>
              </div>
            </div>
          </div>
        )}

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
                          <div className={`w-2 h-2 rounded-full ${req.status === 'pending' ? 'bg-primary animate-pulse' : req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{req.userName}</p>
                       </div>
                       <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${req.type === 'atestado' ? 'bg-blue-50 text-blue-600' : 'bg-primary-light text-primary'}`}>{req.type}</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Data: {new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
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
              <div key={e.id} className="bg-white p-4 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={e.photo} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" />
                  <div>
                    <p className="text-xs font-black text-slate-800">{e.name}</p>
                    <p className="text-[8px] font-bold text-primary uppercase tracking-tighter">{e.roleFunction || 'Sem Função'}</p>
                    <p className="text-[7px] text-slate-400 uppercase font-black">MAT: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => setEditingEmp(e)} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:bg-primary-light hover:text-primary transition-all">Editar</button>
              </div>
            ))}
          </div>
        )}

        {/* Modal Detalhes e Edição permanecem os mesmos usando text-primary e bg-primary */}
      </div>
    </div>
  );
};

export default AdminDashboard;
