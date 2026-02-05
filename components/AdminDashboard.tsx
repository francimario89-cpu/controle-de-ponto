
import React, { useState, useEffect } from 'react';
import { PointRecord, Company, Employee } from '../types';

interface AdminDashboardProps {
  latestRecords: PointRecord[];
  company: Company | null;
  employees: Employee[];
  onAddEmployee: (emp: any) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateIP: (ip: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ latestRecords, company, employees, onAddEmployee, onDeleteEmployee, onUpdateIP }) => {
  const [tab, setTab] = useState<'colaboradores' | 'rede' | 'logs'>('colaboradores');
  const [showAdd, setShowAdd] = useState(false);
  
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

  return (
    <div className="flex flex-col h-full bg-orange-50/30">
      <div className="p-6 bg-white border-b border-orange-50 shrink-0">
        <div className="flex p-1 bg-orange-50 rounded-2xl">
          {(['colaboradores', 'rede', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tab === t ? 'bg-white text-orange-600 shadow-sm border border-orange-100' : 'text-orange-300'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {tab === 'colaboradores' && (
          <div className="space-y-4">
            <button onClick={() => setShowAdd(true)} className="w-full py-4 bg-orange-500 text-white rounded-[24px] font-black uppercase text-[10px] shadow-lg shadow-orange-100 active:scale-95 transition-all">+ Novo Funcionário</button>
            <div className="bg-white rounded-[32px] border border-orange-50 divide-y divide-orange-50 overflow-hidden shadow-sm">
              {employees.length === 0 ? (
                <div className="p-12 text-center opacity-30"><p className="text-4xl mb-2">👥</p><p className="text-[10px] font-black uppercase">Nenhum cadastro</p></div>
              ) : (
                employees.map(e => (
                  <div key={e.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <img src={e.photo} className="w-10 h-10 rounded-xl object-cover border border-orange-50" />
                      <div>
                        <p className="text-xs font-black text-slate-800">{e.name}</p>
                        <p className="text-[9px] text-orange-400 font-bold">MAT: {e.matricula} {e.hasFacialRecord ? '• BIOMETRIA OK' : '• AGUARDANDO FACE'}</p>
                      </div>
                    </div>
                    <button onClick={() => onDeleteEmployee(e.id)} className="p-2 text-red-200 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'rede' && company && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[32px] border border-orange-50 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl text-orange-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg></div>
                <h3 className="text-xs font-black text-slate-800 uppercase">Segurança de Rede</h3>
              </div>
              <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100">
                <p className="text-[9px] font-black text-orange-400 uppercase mb-2">Seu IP Atual:</p>
                <p className="text-lg font-black text-slate-700 font-mono">{currentIP}</p>
                {company.authorizedIP && <p className="text-[9px] text-emerald-500 font-black mt-2">✓ IP BLOQUEADO: {company.authorizedIP}</p>}
              </div>
              <button onClick={() => onUpdateIP(currentIP)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-slate-200">Vincular a esta rede</button>
              <p className="text-[9px] text-slate-400 font-bold text-center px-4 leading-relaxed">Ao ativar, colaboradores só registram ponto se estiverem no Wi-Fi autorizado.</p>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-3">
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

      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end p-4">
          <div className="w-full bg-white rounded-[44px] p-8 animate-in slide-in-from-bottom-full duration-300">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs mb-6">Novo Colaborador</h3>
            <div className="space-y-4">
              <input placeholder="NOME COMPLETO" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
              <input placeholder="Nº MATRÍCULA" value={mat} onChange={e => setMat(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
              <input type="password" placeholder="DEFINIR SENHA" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancelar</button>
                <button onClick={handleSave} className="flex-2 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-orange-100">Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
