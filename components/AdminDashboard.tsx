
import React, { useState } from 'react';
import { PointRecord, Company, Employee } from '../types';

interface AdminDashboardProps {
  latestRecords?: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords = [], company, employees, onAddEmployee }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'colaboradores' | 'empresa' | 'log'>('status');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMatricula, setNewMatricula] = useState('');

  const handleSaveEmployee = () => {
    if(!newName || !newMatricula) return;
    onAddEmployee({
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      email: newEmail,
      matricula: newMatricula,
      photo: `https://ui-avatars.com/api/?name=${newName}&background=f97316&color=fff`,
      status: 'active'
    });
    setNewName(''); setNewEmail(''); setNewMatricula('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-orange-50/20 overflow-hidden relative">
      <header className="p-6 bg-white border-b border-orange-50 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Painel Gestor</h2>
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-1">RH Inteligente</p>
             </div>
          </div>
        </div>

        <div className="flex p-1 bg-orange-50/50 rounded-2xl border border-orange-100">
          {(['status', 'colaboradores', 'empresa', 'log'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === t ? 'bg-white text-orange-600 shadow-sm border border-orange-50' : 'text-orange-300'
              }`}
            >
              {t === 'colaboradores' ? 'Equipe' : t === 'empresa' ? 'Firma' : t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-24">
        
        {activeTab === 'status' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm relative overflow-hidden group">
                   <div className="absolute -right-2 -top-2 text-orange-50/50 text-4xl group-hover:scale-110 transition-transform">👥</div>
                   <p className="text-[10px] font-black text-orange-300 uppercase mb-1">Total Equipe</p>
                   <p className="text-3xl font-black text-slate-800">{employees.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm relative overflow-hidden group">
                   <div className="absolute -right-2 -top-2 text-emerald-50/50 text-4xl group-hover:scale-110 transition-transform">📸</div>
                   <p className="text-[10px] font-black text-orange-300 uppercase mb-1">Batidas Hoje</p>
                   <p className="text-3xl font-black text-emerald-500">{latestRecords.length}</p>
                </div>
             </div>

             <div className="bg-white rounded-[32px] border border-orange-50 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-orange-300 uppercase tracking-widest mb-4">Últimas Atividades</h3>
                {latestRecords.length === 0 ? (
                  <p className="text-center py-4 text-xs font-bold text-slate-400">Nenhum ponto registrado hoje.</p>
                ) : (
                  <div className="space-y-4">
                    {latestRecords.slice(0, 3).map(rec => (
                      <div key={rec.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-orange-100">
                           <img src={rec.photo} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-black text-slate-700 truncate">{rec.userName}</p>
                           <p className="text-[9px] text-orange-400 font-bold">{rec.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'colaboradores' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-orange-300 uppercase tracking-widest">Base de Funcionários</h3>
                <button 
                  onClick={() => setShowAddModal(true)} 
                  className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-100 active:scale-95 transition-transform"
                >
                  + Adicionar
                </button>
             </div>
             
             <div className="bg-white rounded-[32px] border border-orange-50 divide-y divide-orange-50 overflow-hidden shadow-sm">
                {employees.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                     <p className="text-4xl">👋</p>
                     <p className="text-xs font-bold text-slate-400">Nenhum funcionário cadastrado.</p>
                  </div>
                ) : (
                  employees.map(emp => (
                    <div key={emp.id} className="p-4 flex items-center gap-4 hover:bg-orange-50/30 transition-colors">
                       <img src={emp.photo} className="w-12 h-12 rounded-2xl object-cover border border-orange-50 shadow-sm" />
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate">{emp.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded font-black">MAT: {emp.matricula}</span>
                            <span className="text-[9px] text-slate-400 font-bold truncate">{emp.email}</span>
                          </div>
                       </div>
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'empresa' && company && (
          <div className="space-y-4 animate-in fade-in">
             <div className="bg-orange-500 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h3 className="text-2xl font-black tracking-tighter mb-1">{company.name}</h3>
                <p className="text-[10px] font-bold opacity-70 uppercase mb-8">CNPJ: {company.cnpj}</p>
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[32px] border border-white/20 text-center">
                   <p className="text-[9px] font-black uppercase opacity-80 mb-2 tracking-widest">Código de Acesso Unificado</p>
                   <p className="text-4xl font-black tracking-[0.2em]">{company.accessCode}</p>
                   <p className="text-[8px] mt-4 opacity-50 font-bold">USE ESTE CÓDIGO NO MODO TOTEM OU APP DO FUNCIONÁRIO</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'log' && (
           <div className="space-y-3 animate-in slide-in-from-right-4">
             {latestRecords.length === 0 ? (
               <div className="py-20 text-center opacity-30">
                  <p className="text-5xl mb-4">📜</p>
                  <p className="text-xs font-black uppercase">Sem registros hoje</p>
               </div>
             ) : (
               latestRecords.map(record => (
                 <div key={record.id} className="bg-white p-4 rounded-[32px] border border-orange-50 flex gap-4 items-center shadow-sm">
                    <img src={record.photo} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{record.userName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-orange-500 uppercase">{record.timestamp.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <p className="text-[9px] text-slate-400 font-bold truncate max-w-[150px]">{record.address}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl">
                       <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                 </div>
               ))
             )}
           </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
           <div className="w-full bg-white rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-300 border-t border-orange-100">
              <div className="w-12 h-1.5 bg-orange-100 rounded-full mx-auto mb-8"></div>
              <h3 className="text-xl font-black text-slate-800 mb-6 uppercase text-center tracking-tighter">Cadastrar Colaborador</h3>
              <div className="space-y-4 mb-8">
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300">👤</span>
                   <input type="text" placeholder="Nome Completo" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-4 pl-12 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                 </div>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300">✉️</span>
                   <input type="email" placeholder="E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-4 pl-12 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                 </div>
                 <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300">🆔</span>
                   <input type="text" placeholder="Nº Matrícula" value={newMatricula} onChange={e => setNewMatricula(e.target.value)} className="w-full p-4 pl-12 bg-orange-50/30 border border-orange-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                 </div>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
                 <button onClick={handleSaveEmployee} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-orange-200 active:scale-95 transition-all">Salvar Funcionário</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
