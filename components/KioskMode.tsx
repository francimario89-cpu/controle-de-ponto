
import React, { useRef, useEffect, useState } from 'react';
import { Employee, PointRecord } from '../types';
import { Search, Delete, User, Camera, ArrowRight, X } from 'lucide-react';

interface KioskModeProps {
  employees: Employee[];
  onPunch: (record: PointRecord) => void;
  onExit: () => void;
}

const KioskMode: React.FC<KioskModeProps> = ({ employees, onPunch, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [typedMatricula, setTypedMatricula] = useState('');
  const [identifiedEmployee, setIdentifiedEmployee] = useState<Employee | null>(null);
  const [step, setStep] = useState<'id' | 'confirm' | 'success'>('id');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 'confirm') {
       navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; });
    }
  }, [step]);

  const handleKeyPress = (val: string) => {
    if (typedMatricula.length < 10) setTypedMatricula(prev => prev + val);
  };

  const handleClear = () => setTypedMatricula('');
  
  const handleBackspace = () => setTypedMatricula(prev => prev.slice(0, -1));

  const handleIdentify = () => {
    const emp = employees.find(e => e.matricula === typedMatricula);
    if (emp) {
      setIdentifiedEmployee(emp);
      setStep('confirm');
    } else {
      alert("COLABORADOR NÃO ENCONTRADO");
      setTypedMatricula('');
    }
  };

  const executePunch = (type: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo') => {
    if (!identifiedEmployee) return;
    setLoading(true);

    const now = new Date();
    const record: PointRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userName: identifiedEmployee.name,
      timestamp: now,
      address: "TOTEM CENTRAL",
      latitude: 0,
      longitude: 0,
      photo: identifiedEmployee.photo,
      status: 'synchronized',
      matricula: identifiedEmployee.matricula,
      digitalSignature: `TOTEM-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      type: type
    };

    onPunch(record);
    setStep('success');
    
    setTimeout(() => {
      resetTotem();
    }, 4000);
  };

  const resetTotem = () => {
    setStep('id');
    setTypedMatricula('');
    setIdentifiedEmployee(null);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center p-6 overflow-hidden select-none">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onExit} className="text-[10px] font-black text-white/40 uppercase tracking-widest border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/5 transition-all">
          <X size={14} /> Encerrar Totem
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">PontoExato Corporativo</p>
          <p className="text-[8px] text-white/20 font-bold uppercase mt-0.5">Terminal Autointeligente v5.0</p>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        
        {/* Lado Esquerdo: Identificação / Teclado */}
        <div className={`w-full max-w-sm transition-all duration-500 ${step !== 'id' ? 'opacity-30 blur-sm pointer-events-none scale-95' : 'opacity-100'}`}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Sua Identificação</h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Digite sua matrícula para começar</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-md shadow-2xl">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-8 text-center">
              <span className="text-4xl font-mono font-black text-white tracking-[0.2em]">
                {typedMatricula || '------'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-16 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-black hover:bg-white/10 active:scale-95 transition-all">{n}</button>
              ))}
              <button onClick={handleBackspace} className="h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all"><Delete size={24} /></button>
              <button onClick={() => handleKeyPress('0')} className="h-16 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-black hover:bg-white/10 active:scale-95 transition-all">0</button>
              <button onClick={handleIdentify} className="h-16 rounded-2xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-500/20"><ArrowRight size={28} /></button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Confirmação Facial / Sucesso */}
        <div className="w-full max-w-sm flex flex-col items-center">
          {step === 'id' && (
            <div className="flex flex-col items-center justify-center text-center p-12">
               <div className="w-24 h-24 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-white/20 mb-6 animate-pulse">
                  <User size={48} />
               </div>
               <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">Aguardando Matrícula...</p>
            </div>
          )}

          {(step === 'confirm' || step === 'success') && identifiedEmployee && (
            <div className="w-full animate-in slide-in-from-right-8 duration-500">
               <div className="relative aspect-[3/4] rounded-[50px] overflow-hidden border-8 border-white/5 bg-slate-900 shadow-2xl mb-8">
                  <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${loading ? 'brightness-125 blur-sm' : ''}`} />
                  
                  {step === 'confirm' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-between p-8">
                       <div className="w-full flex items-center gap-3 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                          <img src={identifiedEmployee.photo} className="w-10 h-10 rounded-xl object-cover border border-white/20" />
                          <div>
                             <p className="text-[10px] font-black text-white uppercase truncate w-40">{identifiedEmployee.name}</p>
                             <p className="text-[8px] font-bold text-orange-500 uppercase">Matrícula {identifiedEmployee.matricula}</p>
                          </div>
                       </div>
                       
                       <div className="flex flex-col gap-2 w-full">
                          <button onClick={() => executePunch('entrada')} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-orange-50 transition-all">Registrar Entrada</button>
                          <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => executePunch('inicio_intervalo')} className="py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Intervalo</button>
                             <button onClick={() => executePunch('saida')} className="py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Saída</button>
                          </div>
                          <button onClick={resetTotem} className="w-full py-3 text-[9px] font-black text-white/40 uppercase tracking-widest mt-2">Não sou eu / Cancelar</button>
                       </div>
                    </div>
                  )}

                  {step === 'success' && (
                    <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                       <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-emerald-600 text-4xl mb-6 shadow-2xl">✓</div>
                       <h3 className="text-2xl font-black text-white mb-2 uppercase">Registrado!</h3>
                       <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-6">
                         Ponto confirmado para<br/><span className="text-white text-base">{identifiedEmployee.name}</span>
                       </p>
                       <p className="text-white/40 font-black text-[9px] uppercase tracking-widest animate-pulse">Retornando ao Início...</p>
                    </div>
                  )}

                  {loading && step === 'confirm' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                       <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] font-black text-white/10 uppercase tracking-[1em] mt-8">Secure Hardware Token Enabled</p>
    </div>
  );
};

export default KioskMode;

