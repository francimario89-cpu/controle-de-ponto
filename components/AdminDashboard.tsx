
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";
import { auditCompliance } from '../geminiService';

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP }) => {
  const [tab, setTab] = useState<'colaboradores' | 'empresa' | 'logs'>('colaboradores');
  const [showAdd, setShowAdd] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const [name, setName] = useState('');
  const [mat, setMat] = useState('');
  const [pass, setPass] = useState('');
  const [currentIP, setCurrentIP] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setCurrentIP(d.ip));
  }, []);

  const handleUpdatePassword = async () => {
    if (!editingEmployee || !newEmployeePassword) return;
    try {
      const empRef = doc(db, "employees", editingEmployee.id);
      await updateDoc(empRef, { password: newEmployeePassword });
      alert(`Senha de ${editingEmployee.name} atualizada!`);
      setEditingEmployee(null);
      setNewEmployeePassword('');
    } catch (e) { alert("Erro ao atualizar."); }
  };

  const runAudit = async (emp: Employee) => {
    setIsAuditing(true);
    const empRecords = latestRecords.filter(r => r.matricula === emp.matricula);
    const recordStrings = empRecords.map(r => `${r.timestamp.toLocaleString()} - ${r.address}`);
    const result = await auditCompliance(emp.name, recordStrings);
    setAuditResult(result);
    setIsAuditing(false);
  };

  const exportToCSV = (emp: Employee) => {
    const empRecords = latestRecords.filter(r => r.matricula === emp.matricula);
    if (empRecords.length === 0) return alert("Sem registros.");

    let csv = "\uFEFF"; // BOM para Excel
    csv += "Data;Hora;Colaborador;Matricula;Endereco;Latitude;Longitude\n";
    
    empRecords.forEach(r => {
      csv += `${r.timestamp.toLocaleDateString()};${r.timestamp.toLocaleTimeString()};${emp.name};${emp.matricula};"${r.address}";${r.latitude};${r.longitude}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ponto_${emp.name.replace(/\s/g, '_')}.csv`;
    a.click();
  };

  const copyCode = () => {
    if (company?.accessCode) {
      navigator.clipboard.writeText(company.accessCode);
      alert("Código copiado!");
    }
  };

  // Add handleSave function to fix the "Cannot find name 'handleSave'" error
  const handleSave = () => {
    if (!name || !mat || !pass) return alert("Preencha todos os campos.");
    onAddEmployee({
      name,
      matricula: mat,
      password: pass,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=fff`,
      hasFacialRecord: false,
      status: 'active'
    });
    setName('');
    setMat('');
    setPass('');
  };

  return (
    <div className="flex flex-col h-full bg-orange-50/30">
      {/* Banner de Código - CRÍTICO: Sempre Visível */}
      <div className="px-6 pt-6 pb-2">
        <div className="bg-slate-900 rounded-[32px] p-5 flex items-center justify-between shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full -mr-10 -mt-10"></div>
          <div>
            <p className="text-[8px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1">Acesso da Unidade</p>
            <p className="text-2xl font-black text-white tracking-[0.2em]">{company?.accessCode || '---'}</p>
          </div>
          <button onClick={copyCode} className="bg-orange-500 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-orange-900/20 active:scale-95 transition-all">Copiar</button>
        </div>
      </div>

      <div className="p-4 shrink-0">
        <div className="flex p-1 bg-white rounded-2xl border border-orange-100/50 shadow-sm">
          {(['colaboradores', 'empresa', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'empresa' ? 'Config' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {tab === 'colaboradores' && (
          <div className="space-y-4">
            <button onClick={() => setShowAdd(true)} className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] shadow-lg">+ Novo Colaborador</button>
            <div className="grid grid-cols-1 gap-3">
              {employees.map(e => (
                <div key={e.id} className="bg-white rounded-[32px] p-5 border border-orange-50 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={e.photo} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-orange-50" />
                      <div>
                        <p className="text-sm font-black text-slate-800">{e.name}</p>
                        <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">Matrícula: {e.matricula}</p>
                      </div>
                    </div>
                    <button onClick={() => onDeleteEmployee(e.id)} className="p-2 text-red-100 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setEditingEmployee(e)} className="bg-slate-50 py-3 rounded-2xl text-[8px] font-black text-slate-500 uppercase border border-slate-100 hover:bg-orange-50 hover:text-orange-600 transition-all">Alterar Senha</button>
                    <button onClick={() => exportToCSV(e)} className="bg-slate-50 py-3 rounded-2xl text-[8px] font-black text-slate-500 uppercase border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 transition-all">Exportar Excel</button>
                    <button onClick={() => runAudit(e)} className="bg-slate-50 py-3 rounded-2xl text-[8px] font-black text-slate-500 uppercase border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all">Auditoria IA</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'empresa' && company && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Rede e Segurança</h3>
              <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100">
                <p className="text-[9px] font-black text-orange-400 uppercase mb-2">Restrição de IP Atual:</p>
                <p className="text-sm font-bold text-slate-700 font-mono tracking-tighter">{company.authorizedIP || 'Livre para qualquer rede'}</p>
              </div>
              <button onClick={() => onUpdateIP(currentIP)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all">Vincular Wi-Fi Atual ({currentIP})</button>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-3 pb-20">
            {latestRecords.map(r => (
              <div key={r.id} className="bg-white p-4 rounded-3xl border border-orange-50 flex items-center gap-4 shadow-sm">
                <img src={r.photo} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{r.userName}</p>
                  <p className="text-[9px] text-orange-500 font-black uppercase">{r.timestamp.toLocaleTimeString()} • {r.address.substring(0, 30)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Auditoria IA */}
      {auditResult && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[44px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className={`p-6 text-center ${auditResult.riskLevel === 'Alto' ? 'bg-red-500' : 'bg-indigo-600'} text-white`}>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Auditoria Inteligente</p>
              <h4 className="text-2xl font-black">Risco {auditResult.riskLevel}</h4>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{auditResult.summary}</p>
              <div className="space-y-2">
                {auditResult.alerts.map((a: string, i: number) => (
                  <div key={i} className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-orange-500 font-bold">•</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight">{a}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setAuditResult(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Loading Auditoria */}
      {isAuditing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white font-black uppercase text-xs tracking-widest">Gemini Auditando Jornada...</p>
          </div>
        </div>
      )}

      {/* Modal Trocar Senha */}
      {editingEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-2">Redefinir Senha</h3>
            <p className="text-center text-[10px] font-bold text-orange-500 uppercase mb-6">{editingEmployee.name}</p>
            <div className="space-y-4">
              <input type="password" placeholder="NOVA SENHA" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none" />
              <div className="flex gap-3">
                <button onClick={() => setEditingEmployee(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Sair</button>
                <button onClick={handleUpdatePassword} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Colaborador */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="w-full bg-white rounded-[44px] p-8 animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-6">Novo Colaborador</h3>
            <div className="space-y-4">
              <input placeholder="NOME" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none" />
              <input placeholder="MATRÍCULA" value={mat} onChange={e => setMat(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none" />
              <input type="password" placeholder="SENHA INICIAL" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold outline-none" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={() => {handleSave(); setShowAdd(false);}} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
