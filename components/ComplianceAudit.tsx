
import React, { useState } from 'react';
import { PointRecord, Employee } from '../types';
import { auditCompliance } from '../geminiService';

interface ComplianceAuditProps {
  records: PointRecord[];
  employees: Employee[];
}

const ComplianceAudit: React.FC<ComplianceAuditProps> = ({ records, employees }) => {
  const [auditResult, setAuditResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');

  const runAudit = async () => {
    if (!selectedEmp) return alert("Selecione um colaborador");
    setLoading(true);
    const emp = employees.find(e => e.id === selectedEmp);
    const empRecs = records.filter(r => r.matricula === emp?.matricula).map(r => `${r.timestamp.toLocaleString()} - ${r.type}`);
    const result = await auditCompliance(emp?.name || 'Colaborador', empRecs);
    setAuditResult(result);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 pb-24 h-full">
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">AUDITORIA DE RISCO CLT</h2>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Análise por Inteligência Artificial</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 space-y-4 shadow-sm">
        <select 
          value={selectedEmp} 
          onChange={e => setSelectedEmp(e.target.value)}
          className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none dark:text-white"
        >
          <option value="">Selecione um Colaborador...</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <button 
          onClick={runAudit}
          disabled={loading}
          className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : 'Iniciar Auditoria IA'}
        </button>
      </div>

      {auditResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
           <div className={`p-6 rounded-[40px] border shadow-sm ${
             auditResult.riskLevel === 'Alto' ? 'bg-red-50 border-red-100 dark:bg-red-900/10' : 
             auditResult.riskLevel === 'Médio' ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/10' : 
             'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10'
           }`}>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Risco</p>
             <h3 className={`text-2xl font-black uppercase ${
               auditResult.riskLevel === 'Alto' ? 'text-red-600' : 
               auditResult.riskLevel === 'Médio' ? 'text-orange-600' : 
               'text-emerald-600'
             }`}>{auditResult.riskLevel}</h3>
             <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">{auditResult.summary}</p>
           </div>

           <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border dark:border-slate-800 space-y-3 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas Encontrados</h4>
              {auditResult.alerts.map((a: string, i: number) => (
                <div key={i} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                   <span className="text-orange-500 font-bold">⚠️</span>
                   <p className="text-[9px] font-bold text-slate-700 dark:text-slate-200">{a}</p>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceAudit;
