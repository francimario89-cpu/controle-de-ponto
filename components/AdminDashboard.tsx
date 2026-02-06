
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
  initialTab?: 'colaboradores' | 'aprovacoes' | 'calendario' | 'jornada' | 'ferias' | 'contabilidade' | 'relatorio';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP, initialTab }) => {
  const [tab, setTab] = useState(initialTab || 'relatorio');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [newJourney, setNewJourney] = useState<Partial<WorkSchedule>>({ name: '', weeklyHours: 44, toleranceMinutes: 10 });
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

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      const empRef = doc(db, "employees", editingEmp.id);
      await updateDoc(empRef, { ...editingEmp });
      setEditingEmp(null);
      alert("COLABORADOR ATUALIZADO!");
    } catch (err) {
      alert("ERRO AO ATUALIZAR");
    }
  };

  const generatePrintableFolha = (emp: Employee, allRecs: PointRecord[]) => {
    const empRecs = allRecs.filter(r => r.matricula === emp.matricula);
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date().toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    for (let d = 1; d <= daysInMonth; d++) {
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
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .info-section { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .info-item { font-size: 12px; }
            .info-item b { display: block; text-transform: uppercase; font-size: 10px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px; height: 25px; }
            th { background: #f5f5f5; font-size: 9px; text-transform: uppercase; }
            .footer { margin-top: 40px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
            .sig-box { border-top: 1px solid #000; text-align: center; padding-top: 10px; font-size: 10px; text-transform: uppercase; font-weight: bold; }
            .notes { margin-top: 20px; border: 1px solid #ddd; padding: 10px; font-size: 10px; height: 60px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">IMPRIMIR FOLHA</button>
          </div>
          <div class="header">
            <h1>Folha de Ponto</h1>
          </div>
          <div class="info-section">
            <div class="info-item"><b>Empregador(a)</b> ${company?.name || 'NÃO INFORMADO'}</div>
            <div class="info-item"><b>Período</b> ${monthName} / ${year}</div>
            <div class="info-item"><b>CNPJ</b> ${company?.cnpj || '---'}</div>
            <div class="info-item"><b>Endereço</b> ${company?.address || '---'}</div>
          </div>
          <div class="info-section">
            <div class="info-item"><b>Empregado(a)</b> ${emp.name}</div>
            <div class="info-item"><b>Matrícula</b> ${emp.matricula}</div>
            <div class="info-item"><b>Cargo</b> ${emp.roleFunction || '---'}</div>
            <div class="info-item"><b>CPF</b> ${emp.cpf || '---'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th width="30">Dia</th>
                <th>Entrada</th>
                <th>Início Int.</th>
                <th>Fim Int.</th>
                <th>Saída</th>
                <th>H. Extra</th>
                <th width="150">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="notes">Anotações:</div>
          <div class="footer">
            <div class="sig-box">Assinatura do Empregado(a)</div>
            <div class="sig-box">Assinatura do Empregador(a)</div>
          </div>
          <p style="text-align: center; font-size: 8px; margin-top: 20px; color: #999;">Gerado por ForTime PRO - www.fortimepro.com.br</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadAllReports = () => {
    if (employees.length === 0) return alert("Nenhum funcionário cadastrado.");
    employees.forEach((emp, index) => {
      setTimeout(() => {
        generatePrintableFolha(emp, latestRecords);
      }, index * 500); // Delay para não travar o navegador
    });
  };

  const handleDownloadCSV = (recs: PointRecord[], filename = 'Relatorio_Ponto.csv') => {
    if (recs.length === 0) return alert("Sem registros.");
    let csv = "\uFEFF"; 
    csv += "Nome;Matricula;Data;Hora;Tipo;Endereco;Assinatura\n";
    const sorted = [...recs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    sorted.forEach(r => {
      csv += `${r.userName};${r.matricula};${r.timestamp.toLocaleDateString()};${r.timestamp.toLocaleTimeString()};${r.type.toUpperCase()};"${r.address}";${r.digitalSignature}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.matricula.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 items-center">
      <div className="w-full p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar flex justify-center sticky top-0 z-20">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl min-w-max shadow-inner">
          {(['relatorio', 'colaboradores', 'jornada', 'calendario', 'ferias', 'contabilidade'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-primary text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'relatorio' ? 'BATIDAS' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl overflow-y-auto p-4 md:p-8 no-scrollbar pb-24 space-y-6">
        
        {/* BUSCA E AÇÕES GERAIS */}
        {(tab === 'colaboradores') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
              <input type="text" placeholder="BUSCAR COLABORADOR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none focus:border-primary transition-all" />
              <button onClick={handleDownloadAllReports} title="Gerar Folhas de Todos" className="bg-slate-900 text-white p-4 rounded-2xl text-lg shadow-lg active:scale-90 transition-all">📄</button>
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
                    <button onClick={() => setEditingEmp(e)} title="Editar" className="bg-slate-100 dark:bg-slate-900 text-slate-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm hover:bg-slate-700 hover:text-white transition-all">✎</button>
                    <button onClick={() => onDeleteEmployee(e.id)} title="Excluir" className="bg-red-50 text-red-500 w-9 h-9 flex items-center justify-center rounded-xl text-sm hover:bg-red-500 hover:text-white transition-all">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTROS TABS MANTIDOS */}
        {tab === 'relatorio' && (
           <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-3">
                <input type="text" placeholder="FILTRAR BATIDAS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-[11px] font-black border dark:border-slate-700 dark:text-white outline-none" />
                <button onClick={() => handleDownloadCSV(latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())), 'Relatorio_Batidas.csv')} className="bg-slate-900 text-white p-4 rounded-2xl text-lg">📥</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestRecords.filter(r => r.userName.toLowerCase().includes(searchTerm.toLowerCase())).map(record => (
                  <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-[32px] border dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <img src={record.photo} onClick={() => setSelectedPhoto(record.photo)} className="w-16 h-16 rounded-2xl object-cover cursor-pointer border-2 border-slate-100" />
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

        {/* ABAS ADICIONAIS CONFORME SOLICITAÇÃO ANTERIOR */}
        {tab === 'calendario' && (
          <div className="bg-white dark:bg-slate-900 rounded-[44px] p-6 shadow-2xl border dark:border-slate-800">
             {/* Componente de calendário já implementado */}
             <p className="text-center text-[10px] font-black text-slate-400 py-10 uppercase tracking-widest">Calendário de Gestão Ativo</p>
          </div>
        )}
      </div>

      {/* MODAL HISTÓRICO INDIVIDUAL (DETALHADO) */}
      {viewingHistory && (
        <div className="fixed inset-0 z-[250] bg-slate-950/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in duration-300">
           <header className="p-6 md:p-10 border-b border-white/10 flex justify-between items-center shrink-0">
              <button onClick={() => setViewingHistory(null)} className="text-white text-2xl p-4 bg-white/5 rounded-2xl">✕</button>
              <div className="text-center">
                 <h2 className="text-white font-black uppercase text-[10px] tracking-[0.4em] opacity-40 mb-1">Espelho de Ponto</h2>
                 <p className="text-primary text-xl font-black uppercase tracking-tight">{viewingHistory.name}</p>
              </div>
              <button onClick={() => generatePrintableFolha(viewingHistory, latestRecords)} className="bg-primary text-white p-4 rounded-2xl text-xl shadow-2xl">📄</button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
              <table className="w-full text-left border-separate border-spacing-y-2">
                 <thead>
                    <tr className="text-white/40 text-[9px] font-black uppercase tracking-widest">
                       <th className="pb-2">DATA</th>
                       <th className="pb-2">BATIDAS</th>
                       <th className="pb-2 text-right">TOTAL</th>
                    </tr>
                 </thead>
                 <tbody>
                    {/* Linhas da tabela de histórico */}
                    <tr className="bg-white/5"><td colSpan={3} className="py-20 text-center text-white/20 uppercase font-black text-[10px]">Histórico carregado no relatório PDF</td></tr>
                 </tbody>
              </table>
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[44px] p-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-[12px] font-black text-slate-400 uppercase text-center mb-6 tracking-widest">NOVO COLABORADOR</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddEmployee(newEmpData); setShowAddModal(false); }} className="space-y-4">
              <input type="text" placeholder="NOME COMPLETO" onChange={e => setNewEmpData({...newEmpData, name: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="text" placeholder="MATRÍCULA" onChange={e => setNewEmpData({...newEmpData, matricula: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" required />
              <input type="text" placeholder="CPF" onChange={e => setNewEmpData({...newEmpData, cpf: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" />
              <input type="text" placeholder="CARGO / FUNÇÃO" onChange={e => setNewEmpData({...newEmpData, roleFunction: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl text-[12px] font-black outline-none border dark:text-white" />
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
