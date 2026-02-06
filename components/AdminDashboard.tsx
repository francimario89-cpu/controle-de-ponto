
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest, Holiday, WorkSchedule } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, addDoc, deleteDoc } from "firebase/firestore";

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio' | 'saldos';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [newEmpData, setNewEmpData] = useState<Partial<Employee>>({ name: '', matricula: '', password: '', scheduleId: '', roleFunction: '', department: '' });

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

  const formatBalance = (worked: number, expected: number) => {
    const diff = worked - expected;
    const absDiff = Math.abs(diff);
    const h = Math.floor(absDiff);
    const m = Math.round((absDiff - h) * 60);
    const sign = diff >= 0 ? '+' : '-';
    return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
  };

  const handleDownloadSaldosCSV = () => {
    let csv = "\uFEFFNome;Matricula;Horas Trabalhadas;Meta Mensal;Saldo\n";
    employees.forEach(emp => {
      const worked = calculateWorkedHours(latestRecords.filter(r => r.matricula === emp.matricula));
      const expected = 176; // Padrão 22 dias * 8h
      const balance = formatBalance(worked, expected);
      csv += `${emp.name};${emp.matricula};${worked.toFixed(2)}h;${expected}h;${balance}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Saldo_Geral_Equipe_${new Date().getMonth() + 1}.csv`;
    a.click();
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
      
      tableRows += `
        <tr>
          <td>${d}</td>
          <td>${e1}</td>
          <td>${s1}</td>
          <td>${e2}</td>
          <td>${s2}</td>
          <td></td>
          <td></td>
        </tr>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Folha de Ponto - ${emp.name}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.1; }
            .no-print { text-align: right; margin-bottom: 10px; }
            .container { width: 100%; max-width: 210mm; margin: 0 auto; border: 1px solid #000; padding: 10px; box-sizing: border-box; }
            .header-title { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .header-title h1 { margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
            .info-box { border: 1px solid #000; padding: 5px; border-radius: 4px; }
            .info-item { font-size: 10px; margin-bottom: 2px; }
            .info-item b { font-size: 8px; color: #555; text-transform: uppercase; display: block; margin-bottom: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { border: 1px solid #000; text-align: center; font-size: 9px; height: 18px; padding: 2px; }
            th { background: #f2f2f2; font-weight: bold; font-size: 8px; text-transform: uppercase; }
            .anotacoes { margin-top: 10px; border: 1px solid #000; padding: 5px; height: 40px; font-size: 8px; text-transform: uppercase; }
            .footer-sigs { margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 0 20px; }
            .sig-line { border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .brand-footer { text-align: center; font-size: 7px; color: #888; margin-top: 10px; text-transform: uppercase; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 8px 16px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;">IMPRIMIR AGORA</button>
          </div>
          <div class="container">
            <div class="header-title"><h1>FOLHA DE PONTO</h1></div>
            <div class="info-grid">
              <div class="info-box">
                <div class="info-item"><b>Empregador(a)</b> ${company?.name || '---'}</div>
                <div class="info-item"><b>CNPJ</b> ${company?.cnpj || '---'}</div>
              </div>
              <div class="info-box">
                <div class="info-item"><b>Período</b> ${monthName} / ${year}</div>
                <div class="info-item"><b>Endereço</b> ${company?.address || '---'}</div>
              </div>
            </div>
            <div class="info-box" style="margin-bottom: 10px;">
              <div class="info-grid" style="border:none; margin:0; padding:0;">
                <div class="info-item"><b>Empregado(a)</b> ${emp.name}</div>
                <div class="info-item"><b>CPF</b> ${emp.cpf || '---'}</div>
                <div class="info-item"><b>Cargo</b> ${emp.roleFunction || '---'}</div>
                <div class="info-item"><b>Matrícula</b> ${emp.matricula}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th width="30">Dia</th>
                  <th>Entrada</th>
                  <th>Início Intervalo</th>
                  <th>Fim Intervalo</th>
                  <th>Saída</th>
                  <th>Hora Extra</th>
                  <th width="180">Assinatura do Empregado(a)</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="anotacoes">Anotações:</div>
            <div class="footer-sigs">
              <div class="sig-line">Assinatura do Empregado(a)</div>
              <div class="sig-line">Assinatura do Empregador(a)</div>
            </div>
            <div class="brand-footer">Gerado por ForTime PRO - Sistema de Gestão de Ponto Eletrônico v4.2</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20 transition-all">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max shadow-inner">
          {(['relatorio', 'colaboradores', 'saldos', 'calendario', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t === 'saldos' ? 'SALDOS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 space-y-6">
        
        {/* ABA SALDOS GERAL (BANCO DE HORAS) */}
        {tab === 'saldos' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase text-xs">Saldos da Equipe</h2>
                   <p className="text-[9px] text-slate-400 font-black uppercase mt-1">Horas Faltantes e Extras (Mês Atual)</p>
                </div>
                <button onClick={handleDownloadSaldosCSV} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                   📥 EXPORTAR SALDOS
                </button>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-[44px] border dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Colaborador</th>
                            <th className="px-6 py-4">Trabalhado</th>
                            <th className="px-6 py-4">Meta</th>
                            <th className="px-6 py-4 text-right">Saldo Final</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                         {employees.map(emp => {
                            const worked = calculateWorkedHours(latestRecords.filter(r => r.matricula === emp.matricula));
                            const expected = 176;
                            const diff = worked - expected;
                            const percent = Math.min((worked / expected) * 100, 100);
                            
                            return (
                               <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                  <td className="px-6 py-5">
                                     <div className="flex items-center gap-3">
                                        <img src={emp.photo || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-9 h-9 rounded-xl object-cover" />
                                        <div>
                                           <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase">{emp.name}</p>
                                           <p className="text-[8px] font-black text-slate-400 uppercase">MAT: {emp.matricula}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-5">
                                     <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{worked.toFixed(1)}h</p>
                                     <div className="w-20 h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                        <div className={`h-full ${diff >= 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${percent}%` }}></div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-5">
                                     <p className="text-[10px] font-black text-slate-400 uppercase">{expected}h</p>
                                  </td>
                                  <td className="px-6 py-5 text-right">
                                     <span className={`text-[12px] font-black px-3 py-1.5 rounded-xl ${diff >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-red-50 dark:bg-red-950/20 text-red-600'}`}>
                                        {formatBalance(worked, expected)}
                                     </span>
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
             
             <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-center">
                   A meta mensal padrão é de 176h (referente a 22 dias úteis de 8h). Para ajustes personalizados por escala, utilize o módulo de Folha de Ponto.
                </p>
             </div>
          </div>
        )}

        {/* COLABORADORES */}
        {tab === 'colaboradores' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
              <input type="text" placeholder="BUSCAR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none focus:border-primary transition-all" />
              <button onClick={() => { employees.forEach(e => generatePrintableFolha(e, latestRecords)) }} title="Gerar Folhas de Todos" className="bg-slate-900 text-white p-4 rounded-2xl text-lg shadow-lg active:scale-90 transition-all">📄</button>
            </div>
            
            <button onClick={() => setShowAddModal(true)} className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all">CADASTRAR NOVO COLABORADOR +</button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEmployees.map(e => (
                <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 flex items-center justify-between shadow-sm group">
                  <div className="flex items-center gap-4">
                    <img src={e.photo || `https://ui-avatars.com/api/?name=${e.name}`} className="w-12 h-12 rounded-2xl object-cover border dark:border-slate-600" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate w-32 md:w-40">{e.name}</p>
                      <p className="text-[8px] font-black text-primary uppercase">MAT: {e.matricula}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => generatePrintableFolha(e, latestRecords)} title="Folha de Ponto PDF" className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-emerald-500 hover:text-white transition-all">📄</button>
                    <button onClick={() => setViewingHistory(e)} title="Ver Espelho" className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 w-9 h-9 flex items-center justify-center rounded-xl text-lg hover:bg-indigo-500 hover:text-white transition-all">👁</button>
                    <button onClick={() => onDeleteEmployee(e.id)} title="Excluir" className="bg-red-50 text-red-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm hover:bg-red-500 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTROS TABS SIMPLIFICADOS */}
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
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${record.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{record.type.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
      </div>

      {/* MODAL ESPELHO INDIVIDUAL */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden">
           <header className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center shrink-0">
              <button onClick={() => setViewingHistory(null)} className="text-white text-2xl p-4 bg-white/5 rounded-2xl">✕</button>
              <div className="text-center">
                 <h2 className="text-white font-black uppercase text-[10px] tracking-[0.4em] opacity-40 mb-1">Espelho de Ponto</h2>
                 <p className="text-primary text-xl font-black uppercase tracking-tight">{viewingHistory.name}</p>
              </div>
              <button onClick={() => generatePrintableFolha(viewingHistory, latestRecords)} className="bg-primary text-white p-4 rounded-2xl text-xl">📄</button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 text-center">
              <p className="text-white/20 text-[11px] font-black uppercase tracking-[0.5em] py-40">Use o botão 📄 para ver o relatório completo</p>
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
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="password" placeholder="SENHA INICIAL" onChange={e => setNewEmpData({...newEmpData, password: e.target.value})} className="w-full p-5 bg-orange-50 dark:bg-slate-900 border border-primary/20 rounded-3xl text-[12px] font-black text-primary outline-none" required />
              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full bg-primary text-white py-5 rounded-3xl font-black uppercase text-[11px] shadow-xl">SALVAR REGISTRO</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
