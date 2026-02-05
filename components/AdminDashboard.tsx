
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

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
  
  const [name, setName] = useState('');
  const [mat, setMat] = useState('');
  const [pass, setPass] = useState('');
  const [currentIP, setCurrentIP] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setCurrentIP(d.ip));
  }, []);

  const handleSave = () => {
    if(!name || !mat || !pass) return alert("Preencha todos os campos!");
    onAddEmployee({
      name,
      matricula: mat,
      password: pass,
      hasFacialRecord: false,
      status: 'active',
      photo: `https://ui-avatars.com/api/?name=${name}&background=f97316&color=fff`
    });
    setName(''); setMat(''); setPass(''); setShowAdd(false);
  };

  const handleUpdatePassword = async () => {
    if (!editingEmployee || !newEmployeePassword) return;
    try {
      const empRef = doc(db, "employees", editingEmployee.id);
      await updateDoc(empRef, { password: newEmployeePassword });
      alert(`Senha de ${editingEmployee.name} atualizada com sucesso!`);
      setEditingEmployee(null);
      setNewEmployeePassword('');
    } catch (e) {
      alert("Erro ao atualizar senha.");
    }
  };

  const handleDownloadEmployeeReport = (emp: Employee) => {
    const empRecords = latestRecords.filter(r => r.matricula === emp.matricula);
    if (empRecords.length === 0) return alert(`Nenhum registro encontrado para ${emp.name}`);

    let content = `RELATÓRIO DE PONTO INDIVIDUAL - ${emp.name.toUpperCase()}\n`;
    content += "========================================================\n\n";
    content += `Empresa: ${company?.name || 'Não Informada'}\n`;
    content += `CNPJ: ${company?.cnpj || '-'}\n`;
    content += `Colaborador: ${emp.name}\n`;
    content += `Matrícula: ${emp.matricula}\n`;
    content += `Período: Dezembro / 2024 (Consolidado)\n\n`;
    content += "HISTÓRICO DE MARCAÇÕES:\n";
    content += "--------------------------------------------------------\n";

    empRecords.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).forEach(r => {
      content += `[${r.timestamp.toLocaleDateString('pt-BR')}] ${r.timestamp.toLocaleTimeString('pt-BR')} - ${r.address}\n`;
    });

    content += "\n--------------------------------------------------------\n";
    content += "Gerado em: " + new Date().toLocaleString('pt-BR');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_${emp.name.replace(/\s/g, '_')}.txt`;
    a.click();
  };

  const copyCode = () => {
    if (company?.accessCode) {
      navigator.clipboard.writeText(company.accessCode);
      alert("Código copiado!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-orange-50/30">
      {/* Banner de Código Sempre Visível para o RH */}
      <div className="px-6 pt-6 pb-2">
        <div className="bg-slate-800 rounded-3xl p-4 flex items-center justify-between shadow-lg border border-slate-700">
          <div>
            <p className="text-[8px] font-black text-orange-400 uppercase tracking-[0.2em] mb-0.5">Código da Sua Empresa</p>
            <p className="text-xl font-black text-white tracking-[0.1em]">{company?.accessCode || '---'}</p>
          </div>
          <button onClick={copyCode} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-colors shadow-sm active:scale-95">Copiar</button>
        </div>
      </div>

      <div className="p-4 bg-transparent shrink-0">
        <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-orange-100/50">
          {(['colaboradores', 'empresa', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'empresa' ? 'Minha Empresa' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {tab === 'colaboradores' && (
          <div className="space-y-4">
            <button onClick={() => setShowAdd(true)} className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">+ Adicionar Colaborador</button>
            <div className="bg-white rounded-[32px] border border-orange-50 divide-y divide-orange-50 overflow-hidden shadow-sm">
              {employees.length === 0 ? (
                <div className="p-12 text-center opacity-30"><p className="text-4xl mb-2">👥</p><p className="text-[10px] font-black uppercase">Nenhum cadastro</p></div>
              ) : (
                employees.map(e => (
                  <div key={e.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={e.photo} className="w-12 h-12 rounded-2xl object-cover border border-orange-50" />
                        <div>
                          <p className="text-xs font-black text-slate-800">{e.name}</p>
                          <p className="text-[9px] text-orange-400 font-bold uppercase">Matrícula: {e.matricula}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onDeleteEmployee(e.id)} className="p-2 text-red-200 hover:text-red-500 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Botões de Ação Explícitos */}
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setEditingEmployee(e)}
                        className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2.5 rounded-xl text-[9px] font-black text-slate-600 uppercase hover:bg-orange-50 hover:text-orange-600 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        Trocar Senha
                      </button>
                      <button 
                        onClick={() => handleDownloadEmployeeReport(e)}
                        className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2.5 rounded-xl text-[9px] font-black text-slate-600 uppercase hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Relatório
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'empresa' && company && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                <h3 className="text-xs font-black text-slate-800 uppercase">Configurações de Acesso</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <p className="text-[9px] font-black text-orange-400 uppercase mb-2">Trava de Rede Ativa (IP):</p>
                  <p className="text-sm font-bold text-slate-700 font-mono">{company.authorizedIP || 'Sem restrição (Qualquer rede)'}</p>
                </div>
                <button onClick={() => onUpdateIP(currentIP)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all">Travar nesta rede: {currentIP}</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase">Informações do RH</h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Empresa Cadastrada</p>
                 <p className="text-xs font-bold text-slate-600">{company.name}</p>
                 <p className="text-[9px] text-slate-400 mt-1 uppercase">E-mail: {company.adminEmail}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-3">
            {latestRecords.length === 0 ? (
               <div className="py-20 text-center opacity-20"><p className="text-5xl mb-2">📋</p><p className="text-xs font-black uppercase">Nenhum log recente</p></div>
            ) : (
              latestRecords.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-3xl border border-orange-50 flex items-center gap-4 shadow-sm">
                  <img src={r.photo} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{r.userName}</p>
                    <p className="text-[9px] text-orange-500 font-black uppercase">{r.timestamp.toLocaleTimeString()} • {r.address.substring(0, 30)}...</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="w-full bg-white rounded-[44px] p-8 animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-6">Novo Colaborador</h3>
            <div className="space-y-4">
              <input placeholder="NOME COMPLETO" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              <input placeholder="Nº MATRÍCULA" value={mat} onChange={e => setMat(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              <input type="password" placeholder="SENHA INICIAL" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={handleSave} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingEmployee && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-[44px] p-8 animate-in zoom-in duration-300 shadow-2xl">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-2">Redefinir Senha</h3>
            <p className="text-center text-[10px] font-bold text-orange-500 uppercase mb-6">{editingEmployee.name}</p>
            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="NOVA SENHA" 
                value={newEmployeePassword} 
                onChange={e => setNewEmployeePassword(e.target.value)} 
                className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingEmployee(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={handleUpdatePassword} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Salvar Nova Senha</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
