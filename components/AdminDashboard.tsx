
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (id: string, data: any) => void;
  onUpdateIP: (ip: string) => void;
  initialTab?: 'dashboard' | 'colaboradores' | 'aprovacoes' | 'saldos' | 'audit';
  onNavigate: (v: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateEmployee, initialTab, onNavigate }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminPassAttempt, setAdminPassAttempt] = useState('');
  const [authError, setAuthError] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [previewFile, setPreviewFile] = useState<AttendanceRequest | null>(null);

  const now = new Date();
  const [reportFilter, setReportFilter] = useState({
    matricula: 'todos',
    month: now.getMonth(),
    year: now.getFullYear()
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isAuthorized && company?.id) {
      const q = query(collection(db, "requests"), where("companyCode", "==", company.id));
      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date());
          reqs.push({ id: d.id, ...data, createdAt });
        });
        setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeTodayCount = new Set(
      latestRecords.filter(r => r.timestamp.toDateString() === today).map(r => r.matricula)
    ).size;
    return {
      total: employees.length,
      activeToday: activeTodayCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [employees, latestRecords, requests]);

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) { setIsAuthorized(true); setAuthError(false); }
    else { setAuthError(true); setAdminPassAttempt(''); }
  };

  const handleFullBackup = () => {
    const dataToExport = {
      backupDate: new Date().toISOString(),
      company: company,
      employees: employees,
      attendanceRecords: latestRecords,
      rhRequests: requests
    };
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_PONTOEXATO_${company?.name?.replace(/\s+/g, '_') || 'EMPRESA'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    alert("Backup completo gerado e pronto para download!");
  };

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      if (req.type === 'inclusão' && req.times) {
        for (const timeStr of req.times) {
          if (!timeStr) continue;
          const [h, m] = timeStr.split(':');
          const ts = new Date(req.date); ts.setHours(parseInt(h), parseInt(m), 0);
          await addDoc(collection(db, "records"), {
            userName: req.userName, matricula: req.matricula, timestamp: ts,
            address: `PONTO AJUSTADO RH: ${req.reason.toUpperCase()}`,
            latitude: 0, longitude: 0, photo: "", status: 'synchronized',
            digitalSignature: `RH-ADJ-${req.id}-${Date.now()}`, type: 'entrada',
            companyCode: req.companyCode, isAdjustment: true
          });
        }
      }
      alert("Sucesso! O livro de ponto foi atualizado.");
    } catch (e) { alert("Erro ao aprovar."); }
  };

  const handleRejectRequest = async (id: string) => {
    if (confirm("Recusar esta solicitação?")) await updateDoc(doc(db, "requests", id), { status: 'rejected' });
  };

  const filteredRecords = useMemo(() => {
    return latestRecords.filter(r => {
      const date = new Date(r.timestamp);
      const matchMonth = date.getMonth() === reportFilter.month;
      const matchYear = date.getFullYear() === reportFilter.year;
      const matchEmp = reportFilter.matricula === 'todos' || r.matricula === reportFilter.matricula;
      return matchMonth && matchYear && matchEmp;
    });
  }, [latestRecords, reportFilter]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="w-full max-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase">Gestor RH</h2>
           <input type="password" placeholder="SENHA DE ACESSO" value={adminPassAttempt} onChange={e => setAdminPassAttempt(e.target.value)} className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`} />
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Acessar Painel</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-sm font-black uppercase">Livro de Ponto / Saldos</h3>
             <button onClick={handleFullBackup} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
               📥 Backup Geral
             </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                <option value="todos">Todos Funcionários</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
              <select value={reportFilter.year} onChange={e => setReportFilter({...reportFilter, year: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none border">
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>
        </div>
        <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm overflow-x-auto">
           <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                 <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5 text-center">Hora</th><th className="p-5">Status</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className={`border-b hover:bg-slate-50 ${r.isAdjustment ? 'bg-orange-50/50' : ''}`}>
                       <td className="p-5 uppercase">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className={`p-5 text-center font-black ${r.isAdjustment ? 'text-orange-600' : ''}`}>
                          {new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {r.isAdjustment && <span className="block text-[6px] uppercase tracking-tighter">Ajuste RH</span>}
                       </td>
                       <td className="p-5 uppercase text-[8px] text-slate-400">{r.isAdjustment ? 'Manual' : 'Digital'}</td>
                    </tr>
                 ))}
                 {filteredRecords.length === 0 && <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase">Nenhum ponto encontrado para este filtro</td></tr>}
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'aprovacoes') {
    const filteredRequests = requests.filter(r => r.status === requestFilter);
    return (
      <div className="space-y-6 animate-in fade-in">
         <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
            {(['pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setRequestFilter(s)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${requestFilter === s ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>
                {s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovadas' : 'Recusadas'}
              </button>
            ))}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[44px] shadow-2xl border border-slate-100 flex flex-col space-y-4">
                 <div className="flex items-center gap-4 border-b pb-4">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-xl">📝</div>
                    <div><h4 className="text-[12px] font-black uppercase">{req.userName}</h4><p className="text-[10px] text-slate-400">MAT: {req.matricula}</p></div>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-[30px] space-y-3">
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-slate-400">Tipo:</span><span className="text-orange-600">{req.type === 'atestado' ? 'ATESTADO' : 'AJUSTE'}</span></div>
                    <div className="flex justify-between text-[9px] font-black uppercase"><span className="text-slate-400">Data:</span><span>{new Date(req.date).toLocaleDateString('pt-BR')}</span></div>
                    <p className="text-[10px] font-bold text-slate-700 italic border-t pt-2">"{req.reason}"</p>
                    {req.attachment && (
                      <button onClick={() => setPreviewFile(req)} className="w-full py-3 text-blue-600 font-black text-[9px] uppercase border border-blue-100 rounded-xl bg-white mt-2">📂 Ver Atestado / Arquivo</button>
                    )}
                 </div>
                 {req.status === 'pending' ? (
                   <div className="flex gap-2"><button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase">Recusar</button><button onClick={() => handleApproveRequest(req)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Aprovar</button></div>
                 ) : (
                   <div className={`py-4 rounded-2xl text-[10px] font-black uppercase text-center border ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{req.status === 'approved' ? 'Aprovado ✓' : 'Negado ✕'}</div>
                 )}
              </div>
            ))}
         </div>
         {previewFile && (
           <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl h-full rounded-[44px] overflow-hidden flex flex-col animate-in zoom-in">
                 <header className="p-8 border-b flex justify-between bg-slate-50">
                    <div><h4 className="font-black text-sm uppercase">{previewFile.userName}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">Documento Comprovante</p></div>
                    <div className="flex gap-2">
                       <button onClick={() => { const w = window.open('', '_blank'); w.document.write(`<img src="${previewFile.attachment}" style="max-width:100%">`); w.document.close(); w.print(); }} className="bg-orange-600 text-white px-6 py-4 rounded-2xl text-[9px] font-black uppercase">Imprimir</button>
                       <button onClick={() => setPreviewFile(null)} className="p-4 bg-slate-200 rounded-2xl">✕</button>
                    </div>
                 </header>
                 <div className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center items-center">
                    {previewFile.attachment?.startsWith('data:image') ? <img src={previewFile.attachment} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" /> : <p className="font-black uppercase text-slate-400">Clique em imprimir para ver o PDF</p>}
                 </div>
              </div>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
       <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1"><p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Módulo de Gestão</p><h3 className="text-white text-lg font-black uppercase">{company?.name}</h3></div>
          <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700"><span className="text-white font-mono text-2xl font-black">{company?.accessCode || '------'}</span></div>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setActiveTab('colaboradores')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'colaboradores' ? 'bg-slate-900 text-white' : 'bg-white border'}`}><span className="text-2xl">👥</span><span className="font-black uppercase text-[10px]">Funcionários</span></button>
          <button onClick={() => setActiveTab('aprovacoes')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 relative ${activeTab === 'aprovacoes' ? 'bg-slate-900 text-white' : 'bg-white border'}`}><span className="text-2xl">✅</span><span className="font-black uppercase text-[10px]">Aprovações</span>{stats.pendingRequests > 0 && <span className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">{stats.pendingRequests}</span>}</button>
          <button onClick={() => setActiveTab('saldos')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'saldos' ? 'bg-slate-900 text-white' : 'bg-white border'}`}><span className="text-2xl">📘</span><span className="font-black uppercase text-[10px]">Livro de Ponto</span></button>
          <button onClick={() => setActiveTab('audit')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'audit' ? 'bg-slate-900 text-white' : 'bg-white border'}`}><span className="text-2xl">⚖️</span><span className="font-black uppercase text-[10px]">Auditoria IA</span></button>
       </div>
    </div>
  );
};

export default AdminDashboard;
