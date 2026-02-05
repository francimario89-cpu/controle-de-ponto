
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
  const [tab, setTab] = useState<'colaborador' | 'empresa' | 'log'>('colaborador');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [mat, setMat] = useState('');
  const [pass, setPass] = useState('');
  const [ip, setIp] = useState('');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setIp(d.ip));
  }, []);

  const save = () => {
    if(!name || !mat || !pass) return alert("Campos obrigatórios!");
    onAddEmployee({ name, matricula: mat, password: pass, hasFacialRecord: false, status: 'active', photo: `https://ui-avatars.com/api/?name=${name}&background=f97316&color=fff` });
    setName(''); setMat(''); setPass(''); setShowAdd(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex bg-orange-100/50 p-1 rounded-2xl">
        {(['colaborador', 'empresa', 'log'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${tab === t ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-300'}`}>{t}</button>
        ))}
      </div>

      {tab === 'colaborador' && (
        <div className="space-y-4">
          <button onClick={() => setShowAdd(true)} className="w-full py-3 bg-orange-500 text-white rounded-xl font-black uppercase text-[10px]">+ Novo Colaborador</button>
          <div className="bg-white rounded-3xl border border-orange-50 divide-y divide-orange-50 overflow-hidden shadow-sm">
            {employees.map(e => (
              <div key={e.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={e.photo} className="w-10 h-10 rounded-xl object-cover border border-orange-100" />
                  <div>
                    <p className="text-xs font-black text-slate-800">{e.name}</p>
                    <p className="text-[9px] text-orange-400 font-bold uppercase">Matrícula: {e.matricula}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteEmployee(e.id)} className="p-2 text-red-200 hover:text-red-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'empresa' && company && (
        <div className="bg-white p-6 rounded-3xl border border-orange-50 space-y-4 shadow-sm">
          <p className="text-sm font-black text-slate-800">{company.name}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Código: {company.accessCode}</p>
          <div className="p-4 bg-orange-50 rounded-2xl">
            <p className="text-[9px] font-black text-orange-400 uppercase mb-2">Trava de Rede IP:</p>
            <p className="text-xs font-bold text-slate-600">{company.authorizedIP || 'Nenhuma trava ativa'}</p>
          </div>
          <button onClick={() => onUpdateIP(ip)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-[10px]">Vincular ao IP: {ip}</button>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white w-full rounded-[40px] p-8 space-y-4">
            <h3 className="text-center font-black text-slate-800 uppercase text-xs">Cadastrar Colaborador</h3>
            <input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
            <input placeholder="Matrícula" value={mat} onChange={e => setMat(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
            <input type="password" placeholder="Senha Provisória" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-bold" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-400 font-bold text-[10px] uppercase">Cancelar</button>
              <button onClick={save} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
