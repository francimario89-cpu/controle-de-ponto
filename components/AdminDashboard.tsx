
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

  // Listener de solicitações RH: Removido orderBy para evitar erro de índice
  useEffect(() => {
    if (isAuthorized && company?.id) {
      // O company.id aqui é o código da empresa (ex: TQZMUL)
      const q = query(
        collection(db, "requests"), 
        where("companyCode", "==", company.id)
      );

      const unsub = onSnapshot(q, (snap) => {
        const reqs: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          reqs.push({ 
            id: d.id, 
            ...data,
            // Converte timestamp para objeto Date JS para ordenação em memória
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          });
        });
        // Ordena manualmente por data (mais recentes primeiro)
        setRequests(reqs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
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
      alert("Sucesso! Solicitação aprovada e lançada.");
    } catch (e) {
      alert("Erro ao aprovar.");
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Recusar esta solicitação?")) return;
    await updateDoc(doc(db, "requests", id), { status: 'rejected' });
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[44px] shadow-2xl border text-center space-y-6">
           <div className="w-20 h-20 bg-orange-100 rounded-[35px] flex items-center justify-center mx-auto text-orange-600 text-3xl">🔒</div>
           <h2 className="text-sm font-black text-slate-900 uppercase">Acesso RH</h2>
           <input 
             type="password" 
             placeholder="SENHA ADMINISTRATIVA" 
             value={adminPassAttempt}
             onChange={e => setAdminPassAttempt(e.target.value)}
             className={`w-full p-5 bg-slate-50 rounded-3xl text-[11px] font-black text-center border-2 ${authError ? 'border-red-500' : 'border-transparent'}`}
           />
           <button onClick={handleVerifyAdmin} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs">Entrar</button>
        </div>
      </div>
    );
  }

  if (activeTab === 'aprovacoes') {
    const filteredRequests = requests.filter(r => r.status === requestFilter);
    return (
      <div className="space-y-6 animate-in fade-in">
         <div className="flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase text-slate-900 px-2">Aprovações Pendentes</h3>
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-hidden">
               {(['pending', 'approved', 'rejected'] as const).map(status => (
                 <button 
                  key={status}
                  onClick={() => setRequestFilter(status)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${requestFilter === status ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`}
                 >
                   {status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovadas' : 'Recusadas'}
                 </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map(req => (
              <div key={req.id} className="bg-white p-6 rounded-[44px] shadow-2xl border border-slate-100 flex flex-col space-y-5 animate-in zoom-in-95">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-50 rounded-[24px] flex items-center justify-center text-2xl">📝</div>
                    <div>
                       <h4 className="text-[13px] font-black uppercase text-slate-900 leading-tight">{req.userName}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">MAT: {req.matricula}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50/80 p-5 rounded-[30px] space-y-4">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase">
                       <span className="text-slate-400">Solicitação:</span>
                       <span className="text-orange-600">{req.type === 'atestado' ? 'ATESTADO' : 'AJUSTE PONTO'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase border-t pt-2 border-slate-100">
                       <span className="text-slate-400">Data:</span>
                       <span className="text-slate-800">{new Date(req.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="pt-2">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Motivo:</p>
                       <p className="text-[11px] font-bold text-slate-700 italic">"{req.reason}"</p>
                    </div>

                    {req.attachment && (
                      <button 
                        onClick={() => setPreviewFile(req)}
                        className="w-full py-3 text-blue-600 font-black text-[9px] uppercase flex items-center justify-center gap-2 hover:bg-blue-50 rounded-xl border border-blue-100 mt-2"
                      >
                        📂 Abrir Arquivo / Atestado
                      </button>
                    )}
                 </div>

                 {req.status === 'pending' ? (
                   <div className="flex gap-2">
                      <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase hover:bg-red-100 transition-all">Recusar</button>
                      <button onClick={() => handleApproveRequest(req)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all">Aprovar Agora</button>
                   </div>
                 ) : (
                   <div className={`py-4 rounded-2xl text-[10px] font-black uppercase text-center border ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                     Processado ✓
                   </div>
                 )}
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                 <span className="text-7xl mb-4">📂</span>
                 <p className="text-xs font-black uppercase">Nenhum pedido aqui.</p>
              </div>
            )}
         </div>

         {/* MODAL DE VISUALIZAÇÃO */}
         {previewFile && (
           <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 lg:p-12">
              <div className="bg-white w-full max-w-4xl h-full rounded-[44px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in">
                 <header className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div>
                       <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{previewFile.userName}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Atestado / Comprovante</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow && previewFile.attachment) {
                            printWindow.document.write(`<img src="${previewFile.attachment}" style="max-width:100%">`);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }}
                        className="bg-orange-600 text-white px-6 py-4 rounded-2xl text-[9px] font-black uppercase shadow-lg"
                       >
                         Imprimir / Baixar
                       </button>
                       <button onClick={() => setPreviewFile(null)} className="p-4 bg-slate-200 rounded-2xl">
                          ✕
                       </button>
                    </div>
                 </header>
                 <div className="flex-1 bg-slate-100 overflow-y-auto p-12 flex justify-center items-center">
                    {previewFile.attachment?.startsWith('data:image') ? (
                      <img src={previewFile.attachment} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                    ) : (
                      <div className="text-center">
                         <p className="font-black uppercase text-slate-400">Clique em imprimir para baixar o documento</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
         )}
      </div>
    );
  }

  // Dashboard admin padrão (simplificado para focar na correção)
  return (
    <div className="space-y-8 animate-in fade-in">
       <div className="bg-slate-900 p-8 rounded-[44px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Painel Administrativo</p>
             <h3 className="text-white text-lg font-black uppercase tracking-tight">{company?.name}</h3>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-slate-800 px-8 py-5 rounded-3xl border border-slate-700">
                <span className="text-white font-mono text-2xl font-black">{company?.accessCode || '------'}</span>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <button onClick={() => setActiveTab('colaboradores')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'colaboradores' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border'}`}>
                <span className="text-2xl">👥</span>
                <span className="font-black uppercase text-[10px]">Funcionários</span>
             </button>
             <button onClick={() => setActiveTab('aprovacoes')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 relative ${activeTab === 'aprovacoes' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border'}`}>
                <span className="text-2xl">✅</span>
                <span className="font-black uppercase text-[10px]">Aprovações</span>
                {stats.pendingRequests > 0 && <span className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full">{stats.pendingRequests}</span>}
             </button>
             <button onClick={() => setActiveTab('saldos')} className={`p-6 rounded-[35px] text-left transition-all flex flex-col gap-2 ${activeTab === 'saldos' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border'}`}>
                <span className="text-2xl">📘</span>
                <span className="font-black uppercase text-[10px]">Livro de Ponto</span>
             </button>
             <button onClick={() => onNavigate('company_profile')} className="p-6 rounded-[35px] text-left bg-white border flex flex-col gap-2">
                <span className="text-2xl">⚙️</span>
                <span className="font-black uppercase text-[10px]">Configurações</span>
             </button>
          </div>
    </div>
  );
};

export default AdminDashboard;
