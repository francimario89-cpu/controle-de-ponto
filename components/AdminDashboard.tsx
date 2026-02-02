
import React, { useState } from 'react';

interface EmployeeStatus {
  id: string;
  name: string;
  photo: string;
  status: 'present' | 'absent' | 'late';
  lastPunch: string;
  location: string;
}

const AdminDashboard: React.FC = () => {
  const employees: EmployeeStatus[] = [
    { id: '1', name: 'Milu da Silva', photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100', status: 'present', lastPunch: '08:02', location: 'Savassi, BH' },
    { id: '2', name: 'João Pereira', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', status: 'late', lastPunch: '09:15', location: 'Home Office' },
    { id: '3', name: 'Ana Costa', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', status: 'absent', lastPunch: '--:--', location: 'N/A' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Painel do RH</h2>
          <p className="text-sm text-slate-500 font-medium">Gestão em tempo real da equipe</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Exportar Relatório
        </button>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">Presentes</p>
          <p className="text-2xl font-bold text-emerald-500">12</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">Atrasos</p>
          <p className="text-2xl font-bold text-amber-500">02</p>
        </div>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase">Faltas</p>
          <p className="text-2xl font-bold text-red-500">01</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colaboradores</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {employees.map(emp => (
            <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <img src={emp.photo} className="w-10 h-10 rounded-full object-cover" alt={emp.name} />
                <div>
                  <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Último: {emp.lastPunch} • {emp.location}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                emp.status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                emp.status === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
              }`}>
                {emp.status === 'present' ? 'No Posto' : emp.status === 'late' ? 'Atrasado' : 'Ausente'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
