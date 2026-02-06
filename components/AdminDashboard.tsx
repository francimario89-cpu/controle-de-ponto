
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, WorkSchedule } from '../types';
import { db } from '../firebase';
import { getGeminiResponse } from '../geminiService';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos' | 'config';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [iaSummary, setIaSummary] = useState<string | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', password: '', roleFunction: '', department: '' });

  // Holiday State
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  // Password Reset States
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean, empId: string, empName: string }>({ isOpen: false, empId: '', empName: '' });
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Config States
  const [configData, setConfigData] = useState({
    radius: company?.geofence?.radius || 100,
    lat: company?.geofence?.lat || 0,
    lng: company?.geofence?.lng || 0,
    tolerance: company?.config?.toleranceMinutes || 10
  });

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!company?.id) return;
    const unsubReq = onSnapshot(query(collection(db, "requests"), where("companyCode", "==", company.id)), (s) => {
      const reqs: any[] = [];
      s.forEach(d => reqs.push({ id: d.id, ...d.data() }));
      setRequests(reqs);
    });
    return () => unsubReq();
  }, [company?.id]);

  const handleUpdatePassword = async () => {
    if (!newPasswordValue) return alert("Digite a nova senha.");
    try {
      const empRef = doc(db, "employees", resetPasswordModal.empId);
      await updateDoc(empRef, { password: newPasswordValue });
      alert("SENHA ATUALIZADA COM SUCESSO!");
      setResetPasswordModal({ isOpen: false, empId: '', empName: '' });
      setNewPasswordValue('');
    } catch (err) {
      alert("ERRO AO ATUALIZAR SENHA");
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.description || !company?.id) return;
    try {
      const holidayObj: Holiday = { id: Date.now().toString(), date: newHoliday.date, description: newHoliday.description, type: 'feriado' };
      await updateDoc(doc(db, "companies", company.id), {
        holidays: arrayUnion(holidayObj)
      });
      setNewHoliday({ date: '', description: '' });
    } catch (err) {
      alert("Erro ao adicionar feriado.");
    }
  };

  const handleDeleteHoliday = async (h: Holiday) => {
    if (!company?.id) return;
    try {
      await updateDoc(doc(db, "companies", company.id), {
        holidays: arrayRemove(h)
      });
    } catch (err) {
      alert("Erro ao remover feriado.");
    }
  };

  const generatePrintableFolha = (emp: Employee, allRecs: PointRecord[]) => {
    const empRecs = allRecs.filter(r => r.matricula === emp.matricula);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = viewDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    for (let d = 1; d <= 31; d++) {
      if (d > daysInMonth) {
        tableRows += `<tr><td>${d}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`;
        continue;
      }
      const dateStr = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      const dayRecs = empRecs.filter(r => r.timestamp.toLocaleDateString('pt-BR') === dateStr)
                         .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const e1 = dayRecs[0] ? dayRecs[0].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s1 = dayRecs[1] ? dayRecs[1].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const e2 = dayRecs[2] ? dayRecs[2].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s2 = dayRecs[3] ? dayRecs[3].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      
      tableRows += `<tr><td>${d}</td><td>${e1}</td><td>${s1}</td><td>${e2}</td><td>${s2}</td><td></td><td></td></tr>`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Folha de Ponto - ${emp.name}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.2; font-size: 10px; }
            .container { width: 100%; border: 1px solid #000; padding: 15px; box-sizing: border-box; }
            h1 { text-align: center; font-size: 16px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .info-box { border: 1px solid #000; padding: 8px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; text-align: center; padding: 4px; }
            th { background: #f2f2f2; font-weight: bold; font-size: 8px; text-transform: uppercase; }
            .footer-sigs { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            <h1>FOLHA DE PONTO INDIVIDUAL</h1>
            <div class="header-info">
              <div class="info-box">
                <b>EMPRESA:</b> ${company?.name || '---'}<br/>
                <b>CNPJ:</b> ${company?.cnpj || '---'}<br/>
                <b>ENDEREÇO:</b> ${company?.address || '---'}
              </div>
              <div class="info-box">
                <b>COLABORADOR:</b> ${emp.name}<br/>
                <b>MATRÍCULA:</b> ${emp.matricula}<br/>
                <b>PERÍODO:</b> ${monthName} / ${year}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th width="30">DIA</th>
                  <th>ENTRADA 1</th>
                  <th>SAÍDA 1</th>
                  <th>ENTRADA 2</th>
                  <th>SAÍDA 2</th>
                  <th>H. EXTRA</th>
                  <th width="150">ASSINATURA</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="footer-sigs">
              <div class="sig-line">Assinatura do Empregado</div>
              <div class="sig-line">Assinatura do Empregador</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleIAAnalysis = async () => {
    setIsGeneratingIA(true);
    const dataString = employees.map(e => {
      const recs = latestRecords.filter(r => r.matricula === e.matricula).length;
      return `${e.name}: ${recs} batidas.`;
    }).join(' | ');
    const prompt = `Analise os dados da equipe e dê um feedback rápido de RH: ${dataString}`;
    const result = await getGeminiResponse(prompt, []);
    setIaSummary(result);
    setIsGeneratingIA(false);
  };

  const calculateWorkedHours = (empRecords: PointRecord[]) => {
    const grouped: { [key: string]: PointRecord[] } = {};
    empRecords.forEach(r => {
      const day = r.timestamp.toLocaleDateString('pt-BR');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(r);
    });
    let totalMs = 0;
    Object.values(grouped).forEach(dayRecs => {
      const sorted = [...dayRecs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      for (let i = 0; i < sorted.length; i += 2) {
        const entry = sorted[i];
        const exit = sorted[i + 1];
        if (entry && exit) totalMs += exit.timestamp.getTime() - entry.timestamp.getTime();
      }
    });
    return totalMs / (1000 * 60 * 60);
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      {/* MENU SUPERIOR */}
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max shadow-inner">
          {(['relatorio', 'colaboradores', 'saldos', 'aprovacoes', 'config', 'calendario', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t === 'aprovacoes' ? 'PEDIDOS' : t === 'config' ? 'REGRAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 space-y-6">
        
        {/* ABA CALENDÁRIO / FERIADOS */}
        {tab === 'calendario' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border dark:border-slate-700 shadow-xl space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">📅</div>
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Gestão de Feriados</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Defina feriados e pontos facultativos</p>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                   <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black dark:text-white outline-none border dark:border-slate-700" />
                   <input type="text" placeholder="DESCRIÇÃO (EX: NATAL)" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value.toUpperCase()})} className="flex-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black dark:text-white outline-none border dark:border-slate-700" />
                   <button onClick={handleAddHoliday} className="bg-primary text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg">ADICIONAR</button>
                </div>

                <div className="space-y-3">
                   {company?.holidays?.map(h => (
                     <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
                        <div>
                           <p className="text-[11px] font-black dark:text-white">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{h.description}</p>
                        </div>
                        <button onClick={() => handleDeleteHoliday(h)} className="text-red-500 font-black text-xs p-2 hover:bg-red-50 rounded-xl transition-all">REMOVER</button>
                     </div>
                   ))}
                   {!company?.holidays?.length && <p className="text-center py-10 text-[10px] text-slate-300 font-black uppercase tracking-widest">Nenhum feriado cadastrado.</p>}
                </div>
             </div>
          </div>
        )}

        {/* ABA COLABORADORES COM FOLHA DE PONTO */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
              <input type="text" placeholder="BUSCAR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none focus:border-primary" />
            </div>
            
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all">CADASTRAR NOVO COLABORADOR +</button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-6 rounded-[36px] border dark:border-slate-700 flex flex-col gap-4 shadow-sm group">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-16 h-16 rounded-[24px] object-cover border dark:border-slate-600 shadow-md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{e.name}</p>
                      <p className="text-[9px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{e.roleFunction || 'SEM CARGO'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t dark:border-slate-700">
                    <button onClick={() => generatePrintableFolha(e, latestRecords)} title="Folha de Ponto PDF" className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all">📄 FOLHA A4</button>
                    <button onClick={() => setResetPasswordModal({ isOpen: true, empId: e.id, empName: e.name })} className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-4 py-3 rounded-2xl text-lg">🔑</button>
                    <button onClick={() => onDeleteEmployee(e.id)} className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-lg hover:bg-red-500 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA CONTABILIDADE */}
        {tab === 'contabilidade' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Equipe</p>
                   <p className="text-2xl font-black text-slate-800 dark:text-white">{employees.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Batidas/Mês</p>
                   <p className="text-2xl font-black text-primary">{latestRecords.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border dark:border-slate-700 shadow-sm text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Feriados Ativos</p>
                   <p className="text-2xl font-black text-indigo-500">{company?.holidays?.length || 0}</p>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-[44px] border dark:border-slate-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Colaborador</th>
                      <th className="px-8 py-5">Horas Trab.</th>
                      <th className="px-8 py-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {employees.map(emp => {
                      const worked = calculateWorkedHours(latestRecords.filter(r => r.matricula === emp.matricula));
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="px-8 py-6">
                            <p className="text-[10px] font-black dark:text-white uppercase">{emp.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{emp.roleFunction}</p>
                          </td>
                          <td className="px-8 py-6 text-[11px] font-black text-slate-600 dark:text-slate-300">{worked.toFixed(1)}h</td>
                          <td className="px-8 py-6 text-right">
                             <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">Ativo</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* MANTENDO RELATÓRIO E SALDOS */}
        {tab === 'relatorio' && (
           <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
                <input type="text" placeholder="FILTRAR BATIDAS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
                  <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <img src={record.photo} className="w-16 h-16 rounded-2xl object-cover cursor-pointer border-2 border-slate-100" onClick={() => setSelectedPhoto(record.photo)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{record.userName}</p>
                      <p className="text-[9px] font-black text-primary mt-0.5">{record.timestamp.toLocaleDateString()} - {record.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </div>

      {/* MODAL RESET SENHA */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 z-[450] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[44px] p-10 space-y-6 shadow-2xl animate-in zoom-in">
              <div className="text-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
                 <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ALTERAR SENHA</h3>
                 <p className="text-[14px] font-black text-slate-800 dark:text-white uppercase mt-2">{resetPasswordModal.empName}</p>
              </div>
              <input type="text" placeholder="NOVA SENHA" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-3xl text-[12px] font-black text-center dark:text-white outline-none" />
              <button onClick={handleUpdatePassword} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">ATUALIZAR SENHA</button>
              <button onClick={() => setResetPasswordModal({ isOpen: false, empId: '', empName: '' })} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
           </div>
        </div>
      )}

      {/* MODAL AMPLIAR FOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-6" onClick={() => setSelectedPhoto(null)}>
           <img src={selectedPhoto} className="max-w-full max-h-[85vh] rounded-[50px] shadow-2xl border-4 border-white/10" />
        </div>
      )}

      {/* MODAL ADICIONAR COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-4 shadow-2xl">
            <h3 className="text-[12px] font-black text-slate-400 uppercase text-center mb-6 tracking-widest">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="text" placeholder="CARGO / FUNÇÃO" onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
                <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-5 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-3xl text-[12px] font-black text-primary outline-none" required />
              </div>
              <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">SALVAR REGISTRO</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
