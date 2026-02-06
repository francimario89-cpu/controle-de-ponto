
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
  const [newEmpData, setNewEmpData] = useState({ name: '', matricula: '', cpf: '', password: '', roleFunction: '', department: '' });

  // Holiday State
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  // Password Reset States
  const [resetPasswordModal, setResetPasswordModal] = useState<{ isOpen: boolean, empId: string, empName: string }>({ isOpen: false, empId: '', empName: '' });
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Config States - Initialized with safe defaults
  const [configData, setConfigData] = useState({
    radius: 100,
    lat: 0,
    lng: 0,
    tolerance: 10
  });

  // Sync configData when company data arrives
  useEffect(() => {
    if (company) {
      setConfigData({
        radius: company.geofence?.radius || 100,
        lat: company.geofence?.lat || 0,
        lng: company.geofence?.lng || 0,
        tolerance: company.config?.toleranceMinutes || 10
      });
    }
  }, [company]);

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
      alert("FERIADO ADICIONADO!");
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
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = viewDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    
    // Filter records for the selected month/year
    const empRecs = allRecs.filter(r => 
      r.matricula === emp.matricula && 
      r.timestamp.getMonth() === month && 
      r.timestamp.getFullYear() === year
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    for (let d = 1; d <= 31; d++) {
      const dateObj = new Date(year, month, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      
      if (d > daysInMonth) {
        tableRows += `<tr class="empty-row"><td>${d}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
        continue;
      }

      const dateStr = dateObj.toLocaleDateString('pt-BR');
      const dayRecs = empRecs.filter(r => r.timestamp.toLocaleDateString('pt-BR') === dateStr)
                         .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const e1 = dayRecs[0] ? dayRecs[0].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s1 = dayRecs[1] ? dayRecs[1].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const e2 = dayRecs[2] ? dayRecs[2].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const s2 = dayRecs[3] ? dayRecs[3].timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      
      const rowClass = isWeekend ? 'weekend' : '';
      tableRows += `<tr class="${rowClass}">
        <td>${d}</td>
        <td>${e1}</td>
        <td>${s1}</td>
        <td>${e2}</td>
        <td>${s2}</td>
        <td></td>
        <td></td>
      </tr>`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>PONTO - ${emp.name}</title>
          <style>
            @page { size: A4; margin: 3mm; }
            body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #000; font-size: 8.5px; line-height: 1.1; -webkit-print-color-adjust: exact; }
            .container { width: 100%; max-width: 200mm; margin: 0 auto; border: 1.5px solid #000; padding: 8px; box-sizing: border-box; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
            .title { text-align: center; font-size: 13px; font-weight: 900; margin-bottom: 6px; border-bottom: 1.5px solid #000; padding-bottom: 3px; text-transform: uppercase; }
            .header-info { display: grid; grid-template-columns: 1.2fr 1fr; gap: 5px; margin-bottom: 8px; }
            .info-box { border: 1px solid #000; padding: 4px; background: #fafafa; }
            .info-box b { font-size: 7px; color: #333; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; text-align: center; padding: 3px 1px; overflow: hidden; }
            th { background: #eee; font-weight: 900; font-size: 7px; text-transform: uppercase; }
            tr.weekend { background: #f9f9f9; }
            tr.empty-row td { color: transparent; border-color: #ddd; }
            .footer-sigs { margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-line { border-top: 1px solid #000; text-align: center; padding-top: 2px; font-weight: 900; font-size: 7.5px; }
            .stamp { text-align: right; font-size: 6px; color: #999; margin-top: 5px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="container">
            <div>
                <div class="title">Folha de Frequência Individual</div>
                <div class="header-info">
                  <div class="info-box">
                    <b>EMPRESA:</b> ${company?.name || '---'}<br/>
                    <b>CNPJ:</b> ${company?.cnpj || '---'}<br/>
                    <b>ENDEREÇO:</b> ${company?.address || '---'}
                  </div>
                  <div class="info-box">
                    <b>COLABORADOR:</b> ${emp.name}<br/>
                    <b>MATRÍCULA:</b> ${emp.matricula}<br/>
                    <b>MÊS/ANO:</b> ${monthName} / ${year}
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th width="25">DIA</th>
                      <th>ENTRADA 1</th>
                      <th>SAÍDA 1</th>
                      <th>ENTRADA 2</th>
                      <th>SAÍDA 2</th>
                      <th width="40">H. EXTRA</th>
                      <th width="110">ASSINATURA</th>
                    </tr>
                  </thead>
                  <tbody>${tableRows}</tbody>
                </table>
            </div>
            <div>
                <div class="footer-sigs">
                  <div class="sig-line">Assinatura do Colaborador</div>
                  <div class="sig-line">Assinatura do Responsável</div>
                </div>
                <div class="stamp">Gerado via ForTime PRO - Em conformidade com Portaria 671 MTP</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveConfig = async () => {
    if (!company?.id) return;
    try {
      await updateDoc(doc(db, "companies", company.id), {
        geofence: { enabled: true, lat: configData.lat, lng: configData.lng, radius: configData.radius },
        "config.toleranceMinutes": configData.tolerance
      });
      alert("POLÍTICAS DA EMPRESA SALVAS COM SUCESSO!");
    } catch (err) {
      alert("ERRO AO SALVAR CONFIGURAÇÕES.");
    }
  };

  const calculateWorkedHours = (empRecords: PointRecord[]) => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const monthRecs = empRecords.filter(r => r.timestamp.getMonth() === month && r.timestamp.getFullYear() === year);

    const grouped: { [key: string]: PointRecord[] } = {};
    monthRecs.forEach(r => {
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
      {/* SELETOR DE MÊS GLOBAL */}
      <div className="w-full bg-primary/5 p-3 flex justify-center gap-4 items-center border-b dark:border-slate-800">
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="text-primary font-black px-3 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm">◀</button>
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
           {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
         </span>
         <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="text-primary font-black px-3 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm">▶</button>
      </div>

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
        
        {/* ABA CONFIGURAÇÕES */}
        {tab === 'config' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border dark:border-slate-700 shadow-xl space-y-10">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl">⚙️</div>
                   <div>
                      <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Políticas Operacionais</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Gestão de IP, GPS e Tolerâncias</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Raio Permitido (metros)</label>
                      <input type="number" value={configData.radius} onChange={e => setConfigData({...configData, radius: parseInt(e.target.value)})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tolerância (minutos)</label>
                      <input type="number" value={configData.tolerance} onChange={e => setConfigData({...configData, tolerance: parseInt(e.target.value)})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sede Latitude</label>
                      <input type="number" step="any" value={configData.lat} onChange={e => setConfigData({...configData, lat: parseFloat(e.target.value)})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sede Longitude</label>
                      <input type="number" step="any" value={configData.lng} onChange={e => setConfigData({...configData, lng: parseFloat(e.target.value)})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" />
                   </div>
                </div>

                <button onClick={handleSaveConfig} className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all">SALVAR REGRAS DO SISTEMA</button>
             </div>
          </div>
        )}

        {/* ABA SALDOS */}
        {tab === 'saldos' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-[44px] shadow-xl border dark:border-slate-700 overflow-hidden">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 flex justify-between items-center">
                   <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Relatório de Horas Equipe</h3>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Colaborador</th>
                      <th className="px-8 py-5">Horas</th>
                      <th className="px-8 py-5 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {employees.map(emp => {
                      const worked = calculateWorkedHours(latestRecords.filter(r => r.matricula === emp.matricula));
                      const diff = worked - 176;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="px-8 py-6">
                            <p className="text-[11px] font-black dark:text-white uppercase leading-tight">{emp.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">MAT: {emp.matricula}</p>
                          </td>
                          <td className="px-8 py-6 font-black text-[12px] text-slate-600 dark:text-slate-300">{worked.toFixed(1)}h</td>
                          <td className={`px-8 py-6 text-right font-black text-[12px] ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {diff >= 0 ? '+' : ''}{diff.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {/* ABA COLABORADORES */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
              <input type="text" placeholder="BUSCAR POR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border-2 border-transparent focus:border-primary dark:text-white outline-none" />
            </div>
            
            <button onClick={() => setShowAddModal(true)} className="w-full bg-emerald-500 text-white py-4 rounded-[20px] font-black uppercase text-[10px] shadow-lg hover:brightness-105 active:scale-95 transition-all">CADASTRAR NOVO +</button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-3 rounded-[24px] border dark:border-slate-700 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-10 h-10 rounded-[14px] object-cover border dark:border-slate-700" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{e.name}</p>
                      <p className="text-[8px] font-black text-emerald-500 uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      onClick={() => generatePrintableFolha(e, latestRecords)} 
                      title="Folha A4"
                      className="w-8 h-8 bg-slate-900 dark:bg-slate-700 text-white rounded-[10px] flex items-center justify-center active:scale-90 transition-all"
                    >
                      <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 18H8.2v-1.2h7.6V20zm0-2.5H8.2v-1.2h7.6v1.2zm0-2.5H8.2v-1.2h7.6v1.2zM13 9V3.5L18.5 9H13z"/></svg>
                    </button>
                    <button 
                      onClick={() => setResetPasswordModal({ isOpen: true, empId: e.id, empName: e.name })} 
                      title="Alterar Senha"
                      className="w-8 h-8 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-[10px] flex items-center justify-center text-sm hover:text-primary active:scale-90 transition-all"
                    >
                      🔑
                    </button>
                    <button 
                      onClick={() => onDeleteEmployee(e.id)} 
                      title="Excluir"
                      className="w-8 h-8 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-[10px] flex items-center justify-center text-sm hover:bg-red-500 hover:text-white active:scale-90 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA CALENDÁRIO */}
        {tab === 'calendario' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-[44px] border dark:border-slate-700 shadow-xl space-y-8">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl">📅</div>
                   <div>
                      <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Feriados e Datas</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Gestão do Calendário Anual</p>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                   <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="flex-1 p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black dark:text-white outline-none" />
                   <input type="text" placeholder="DESCRIÇÃO" value={newHoliday.description} onChange={e => setNewHoliday({...newHoliday, description: e.target.value.toUpperCase()})} className="flex-2 p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black dark:text-white outline-none" />
                   <button onClick={handleAddHoliday} className="bg-primary text-white px-10 py-5 rounded-3xl text-[11px] font-black uppercase shadow-xl">ADICIONAR</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {company?.holidays?.map(h => (
                     <div key={h.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900 rounded-[28px] border dark:border-slate-800 group transition-all">
                        <div>
                           <p className="text-[11px] font-black dark:text-white">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{h.description}</p>
                        </div>
                        <button onClick={() => handleDeleteHoliday(h)} className="text-red-500 font-black text-xs p-3 hover:bg-red-50 rounded-2xl transition-all">✕</button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* BATIDAS (RELATÓRIO) */}
        {tab === 'relatorio' && (
           <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
                <input type="text" placeholder="BUSCAR POR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border-2 border-transparent focus:border-primary dark:text-white outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
                  <div key={record.id} className="bg-white dark:bg-slate-800 p-5 rounded-[36px] border dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.01]">
                    <img src={record.photo} className="w-16 h-16 rounded-[24px] object-cover border-2 border-slate-100 dark:border-slate-700" onClick={() => setSelectedPhoto(record.photo)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{record.userName}</p>
                      <p className="text-[9px] font-black text-primary mt-1">{record.timestamp.toLocaleDateString()} - {record.timestamp.toLocaleTimeString()}</p>
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
           <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[44px] p-10 space-y-6 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center">
                 <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
                 <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ALTERAR SENHA</h3>
                 <p className="text-[14px] font-black text-slate-800 dark:text-white uppercase mt-2">{resetPasswordModal.empName}</p>
              </div>
              <input type="text" placeholder="NOVA SENHA" value={newPasswordValue} onChange={e => setNewPasswordValue(e.target.value)} className="w-full p-6 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-3xl text-[14px] font-black text-center dark:text-white outline-none focus:border-primary" />
              <button onClick={handleUpdatePassword} className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase text-[11px] shadow-xl">ATUALIZAR ACESSO</button>
              <button onClick={() => setResetPasswordModal({ isOpen: false, empId: '', empName: '' })} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
           </div>
        </div>
      )}

      {/* MODAL ADICIONAR COLABORADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-5 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" required />
              <input type="text" placeholder="CARGO" onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" />
              <input type="text" placeholder="CPF" onChange={e => setNewEmpData({...newEmpData, cpf: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border-2 border-transparent focus:border-primary dark:text-white" required />
                <input type="password" placeholder="SENHA" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-5 bg-orange-50 dark:bg-slate-900 border-2 border-primary/20 rounded-3xl text-[12px] font-black text-primary outline-none focus:border-primary" required />
              </div>
              <button type="submit" className="w-full bg-primary text-white py-6 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all mt-4">FINALIZAR CADASTRO</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
