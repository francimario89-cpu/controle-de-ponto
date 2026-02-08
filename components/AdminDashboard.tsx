
import React, { useState, useMemo, useEffect } from 'react';
import { PointRecord, Company, Employee, AttendanceRequest } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
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

  // Listener principal das solicitações de RH
  useEffect(() => {
    if (isAuthorized && company?.id) {
      // Remover qualquer filtro de matrícula para o RH ver todos da empresa
      const q = query(
        collection(db, "requests"), 
        where("companyCode", "==", company.id),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          reqs.push({ id: d.id, ...data });
        });
        setRequests(reqs);
      }, (err) => {
        console.error("Erro no listener de solicitações:", err);
      });
      return () => unsub();
    }
  }, [isAuthorized, company?.id]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const activeTodayCount = new Set(
      latestRecords
        .filter(r => r.timestamp.toDateString() === today)
        .map(r => r.matricula)
    ).size;

    return {
      total: employees.length,
      activeToday: activeTodayCount,
      pendingRequests: requests.filter(r => r.status === 'pending').length
    };
  }, [employees, latestRecords, requests]);

  const handleVerifyAdmin = () => {
    if (adminPassAttempt === company?.adminPassword) {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setAdminPassAttempt('');
    }
  };

  const handleApproveRequest = async (req: AttendanceRequest) => {
    try {
      await updateDoc(doc(db, "requests", req.id), { status: 'approved' });
      
      if (req.type === 'inclusão' && req.times) {
        for (const timeStr of req.times) {
          if (!timeStr) continue;
          const [h, m] = timeStr.split(':');
          const timestamp = new Date(req.date);
          timestamp.setHours(parseInt(h), parseInt(m), 0);
          
          await addDoc(collection(db, "records"), {
            userName: req.userName,
            matricula: req.matricula,
            timestamp: timestamp,
            address: `PONTO AJUSTADO PELO RH: ${req.reason.toUpperCase()}`,
            latitude: 0,
            longitude: 0,
            photo: "",
            status: 'synchronized',
            digitalSignature: `RH-ADJ-${req.id}-${Date.now()}`,
            type: 'entrada',
            companyCode: req.companyCode,
            isAdjustment: true
          });
        }
      }
      alert("✓ Solicitação aprovada e pontos lançados no livro!");
    } catch (e) {
      alert("✕ Erro ao processar aprovação.");
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Confirmar recusa desta solicitação?")) return;
    await updateDoc(doc(db, "requests", id), { status: 'rejected' });
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
        <div className="w-full max-w-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Painel Gestor RH</h2>
           <input 
             type="password" 
             placeholder="SENHA DE ACESSO" 
             value={adminPassAttempt}
             onChange={e => setAdminPassAttempt(e.target.value)}
             className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`}
           />
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Acessar Sistema</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'saldos') {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Livro de Ponto Mensal</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select value={reportFilter.matricula} onChange={e => setReportFilter({...reportFilter, matricula: e.target.value})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200 uppercase">
                <option value="todos">Todos os Funcionários</option>
                {employees.map(e => <option key={e.id} value={e.matricula}>{e.name}</option>)}
              </select>
              <select value={reportFilter.month} onChange={e => setReportFilter({...reportFilter, month: parseInt(e.target.value)})} className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black outline-none border border-slate-200 uppercase">
                {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
              </select>
           </div>
           <button className="w-full bg-orange-600 text-white py-6 rounded-[28px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
             📥 Exportar Espelho (PDF/CLT)
           </button>
        </div>
        <div className="bg-white rounded-[40px] border overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-500">
                 <tr><th className="p-5">Nome</th><th className="p-5">Data</th><th className="p-5 text-center">Horário</th><th className="p-5">Origem</th></tr>
              </thead>
              <tbody className="text-[10px] font-bold text-slate-800">
                 {filteredRecords.map(r => (
                    <tr key={r.id} className={`border-b hover:bg-slate-50 transition-colors ${r.isAdjustment ? 'bg-orange-50/50' : ''}`}>
                       <td className="p-5 uppercase">{r.userName}</td>
                       <td className="p-5">{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                       <td className={`p-5 text-center font-black ${r.isAdjustment ? 'text-orange-600' : 'text-slate-800'}`}>
                         <div className="flex flex-col items-center">
                            <span className="text-xs">{new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {r.isAdjustment && <span className="text-[6px] bg-orange-600 text-white px-2 py-0.5 rounded-full mt-1 uppercase tracking-tighter">AJUSTADO RH</span>}
                         </div>
                       </td>
                       <td className="p-5 uppercase text-[8px] text-slate-400">{r.isAdjustment ? 'Correção Manual' : 'Facial / GPS'}</td>
                    </tr>
                 ))}
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
         <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase text-slate-900 px-2 tracking-tighter">Fluxo de Justificativas</h3>
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
               {(['pending', 'approved', 'rejected'] as const).map(status => (
                 <button 
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${requestFilter === status ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-slate-400'}`}
                 >
                   {status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovadas' : 'Recusadas'}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[44px] shadow-2xl border border-slate-100 flex flex-col space-y-6 animate-in zoom-in-95 duration-300">
                 <div className="flex items-center gap-4 border-b pb-4 border-slate-50">
                    <div className="w-16 h-16 bg-orange-50 rounded-[28px] flex items-center justify-center text-3xl">📝</div>
                    <div>
                       <h4 className="text-[13px] font-black uppercase text-slate-900 leading-tight">{req.userName}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">MAT: {req.matricula}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50/50 p-6 rounded-[35px] space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-400">Tipo:</span>
                       <span className="text-orange-600 font-black">{req.type === 'atestado' ? 'ATESTADO MÉDICO' : 'AJUSTE DE PONTO'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-slate-100 pt-3">
                       <span className="text-slate-400">Data:</span>
                       <span className="text-slate-800 font-black">{new Date(req.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="pt-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Motivo Informado:</p>
                       <p className="text-[11px] font-bold text-slate-700 italic">"{req.reason}"</p>
                    </div>

                    {req.type === 'inclusão' && req.times && req.times.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                         <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Horários Solicitados:</p>
                         <div className="flex flex-wrap gap-2">
                            {req.times.filter(t => t).map((t, i) => (
                              <span key={i} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-900 border border-slate-100 shadow-sm">{t}</span>
                            ))}
                         </div>
                      </div>
                    )}

                    {req.attachment && (
                      <button 
                        onClick={() => setPreviewFile(req)}
                        className="w-full py-4 text-blue-600 font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-50 rounded-2xl transition-all border border-blue-100 mt-2"
                      >
                        📎 Ver Anexo: {req.attachmentName || 'Documento'}
                      </button>
                    )}
                 </div>

                 {req.status === 'pending' ? (
                   <div className="flex gap-3 pt-2">
                      <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-5 bg-red-50 text-red-600 rounded-3xl text-[10px] font-black uppercase active:scale-95 transition-all hover:bg-red-100">Recusar</button>
                      <button onClick={() => handleApproveRequest(req)} className="flex-[2] py-5 bg-[#10b981] text-white rounded-3xl text-[10px] font-black uppercase shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-600">Aprovar e Lançar</button>
                   </div>
                 ) : (
                   <div className={`py-5 rounded-3xl text-[11px] font-black uppercase text-center border ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                     Solicitação {req.status === 'approved' ? 'Aprovada ✓' : 'Negada ✕'}
                   </div>
                 )}
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-full py-32 text-center opacity-20 flex flex-col items-center">
                 <span className="text-8xl mb-6">📂</span>
                 <p className="text-sm font-black uppercase tracking-[0.3em]">Nenhuma solicitação encontrada.</p>
              </div>
            )}
         </div>

         {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DE ANEXO */}
         {previewFile && (
           <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 lg:p-12 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-5xl h-full rounded-[44px] shadow-2xl overflow-hidden flex flex-col">
                 <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                       <span className="text-3xl">📄</span>
                       <div>
                          <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{previewFile.attachmentName || 'Atestado'}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Enviado por: {previewFile.userName}</p>
                       </div>
                    </div>
                    <div className="flex gap-3">
                       <button 
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow && previewFile.attachment) {
                            printWindow.document.write(`<img src="${previewFile.attachment}" style="max-width:100%">`);
                            printWindow.document.close();
                            printWindow.focus();
                            printWindow.print();
                          }
                        }}
                        className="bg-orange-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2 hover:bg-orange-700"
                       >
                         📥 Baixar e Imprimir
                       </button>
                       <button onClick={() => setPreviewFile(null)} className="p-4 bg-slate-200 rounded-2xl hover:bg-slate-300 transition-colors">
                          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                 </header>
                 <div className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center items-center">
                    {previewFile.attachment?.startsWith('data:image') ? (
                      <img src={previewFile.attachment} className="max-w-full max-h-full object-contain rounded-2xl shadow-xl" alt="Documento" />
                    ) : (
                      <div className="text-center space-y-4">
                         <div className="text-8xl">📎</div>
                         <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Documento PDF ou Foto</p>
                         <button 
                            onClick={() => {
                               const link = document.createElement('a');
                               link.href = previewFile.attachment!;
                               link.download = previewFile.attachmentName || 'anexo';
                               link.click();
                            }}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px]"
                          >
                            Download Direto
                          </button>
                      </div>
                    )}
                 </div>
              </div>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
       {/* Painel Inicial Admin */}
       <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1 text-center md:text-left">
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Ambiente de Gestão RH</p>
             <h3 className="text-white text-lg font-black uppercase tracking-tight">{company?.name}</h3>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700">
                <span className="text-white font-mono text-2xl font-black tracking-[0.2em]">{company?.accessCode || '------'}</span>
             </div>
             <button className="p-5 bg-orange-600 text-white rounded-3xl hover:bg-orange-700 shadow-xl active:scale-90 transition-all">📋</button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[40px] border shadow-sm group hover:border-orange-100 transition-all">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Funcionários</p>
             <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm">
             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ativos Hoje</p>
             <h3 className="text-3xl font-black text-emerald-500">{stats.activeToday}</h3>
          </div>
          <div className="bg-white p-8 rounded-[40px] border shadow-sm relative border-orange-200">
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Pendências RH</p>
             <h3 className={`text-3xl font-black ${stats.pendingRequests > 0 ? 'text-orange-500' : 'text-slate-300'}`}>{stats.pendingRequests}</h3>
             {stats.pendingRequests > 0 && <span className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full animate-ping"></span>}
          </div>
       </div>

       <div className="bg-white p-8 rounded-[44px] border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <button onClick={() => setActiveTab('colaboradores')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'colaboradores' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">👥</span>
                <span className="font-black uppercase text-[10px]">Funcionários</span>
             </button>
             <button onClick={() => setActiveTab('aprovacoes')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 relative ${activeTab === 'aprovacoes' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">✅</span>
                <span className="font-black uppercase text-[10px]">Aprovações</span>
                {stats.pendingRequests > 0 && <span className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse">{stats.pendingRequests}</span>}
             </button>
             <button onClick={() => setActiveTab('saldos')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'saldos' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">📗</span>
                <span className="font-black uppercase text-[10px]">Livro de Ponto</span>
             </button>
             <button onClick={() => setActiveTab('audit')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50'}`}>
                <span className="text-2xl">🤖</span>
                <span className="font-black uppercase text-[10px]">Auditoria IA</span>
             </button>
          </div>
       </div>
    </div>
  );
};

export default AdminDashboard;
