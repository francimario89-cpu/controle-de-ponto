
import React from 'react';
import { PointRecord } from '../types';

interface PunchSuccessProps {
  record: PointRecord;
  onClose: () => void;
}

const PunchSuccess: React.FC<PunchSuccessProps> = ({ record, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-emerald-500 h-24 flex items-center justify-center relative">
          <div className="bg-white rounded-full p-2 shadow-lg">
             <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>

        <div className="p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Registro de Ponto</h2>
          <p className="text-emerald-500 font-bold mb-4">Ponto registrado com sucesso!</p>
          
          <div className="flex flex-col items-center mb-6">
            <p className="text-4xl font-black text-slate-900 leading-none">
              {record.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-slate-400 mt-1">Terça-feira, 03 de dezembro de 2024</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2 mb-6">
             <div className="flex gap-2 items-start">
               <svg className="w-4 h-4 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
               <p className="text-xs text-slate-600 font-medium">{record.address}</p>
             </div>
             <div className="flex gap-2 items-center">
               <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Registro Sincronizado</p>
             </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 rounded-2xl border border-slate-200 text-slate-400 font-bold hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PunchSuccess;
