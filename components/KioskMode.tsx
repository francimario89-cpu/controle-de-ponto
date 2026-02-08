
import React, { useRef, useEffect, useState } from 'react';
import { Employee, PointRecord } from '../types';

interface KioskModeProps {
  employees: Employee[];
  onPunch: (record: PointRecord) => void;
  onExit: () => void;
}

const KioskMode: React.FC<KioskModeProps> = ({ employees, onPunch, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [lastMatch, setLastMatch] = useState<Employee | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; });
  }, []);

  const handlePunchType = (type: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo') => {
    if (recognizing || employees.length === 0) return;
    setRecognizing(true);
    
    setTimeout(() => {
      const randomEmp = employees[Math.floor(Math.random() * employees.length)];
      setLastMatch(randomEmp);
      
      const now = new Date();
      const record: PointRecord = {
        id: Math.random().toString(36).substr(2, 9),
        userName: randomEmp.name,
        timestamp: now,
        address: "TOTEM CENTRAL",
        latitude: 0,
        longitude: 0,
        photo: randomEmp.photo,
        status: 'synchronized',
        matricula: randomEmp.matricula,
        digitalSignature: Math.random().toString(36).substring(2, 15),
        type: type
      };
      
      onPunch(record);
      
      setTimeout(() => {
        setRecognizing(false);
        setLastMatch(null);
      }, 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-8 overflow-hidden">
      <div className="w-full flex justify-between items-center text-white/40">
        <button onClick={onExit} className="text-[10px] font-black uppercase tracking-widest border border-white/10 px-4 py-2 rounded-xl">SAIR</button>
        <p className="text-[10px] font-black uppercase text-orange-400">TOTEM CORPORATIVO ATIVO</p>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-8 border-white/5 shadow-2xl bg-black">
         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] opacity-60" />
         
         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`w-64 h-80 border-2 rounded-[100px] transition-all duration-500 ${recognizing ? 'border-orange-500 scale-105 bg-orange-500/10' : 'border-white/20 border-dashed'}`}>
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-8 bg-slate-900 px-4 py-1 rounded-full border border-white/10 whitespace-nowrap">
                  <span className="text-[9px] font-black text-orange-500 uppercase">
                    {recognizing ? 'IDENTIFICANDO...' : 'POSICIONE O ROSTO'}
                  </span>
               </div>
            </div>
         </div>

         {lastMatch && (
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white animate-in zoom-in duration-300">
              <div className="w-32 h-32 rounded-[40px] border-4 border-emerald-500 overflow-hidden mb-4">
                 <img src={lastMatch.photo} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-black text-center mb-1">{lastMatch.name}</h3>
              <p className="text-emerald-400 font-black uppercase text-[10px] tracking-widest">REGISTRADO COM SUCESSO!</p>
           </div>
         )}
      </div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-3">
         <button onClick={() => handlePunchType('entrada')} className="py-5 bg-white rounded-3xl font-black text-slate-900 uppercase text-[10px] shadow-xl">Entrada</button>
         <button onClick={() => handlePunchType('inicio_intervalo')} className="py-5 bg-orange-500 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl">Início Intervalo</button>
         <button onClick={() => handlePunchType('fim_intervalo')} className="py-5 bg-orange-500 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl">Fim Intervalo</button>
         <button onClick={() => handlePunchType('saida')} className="py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] shadow-xl">Saída</button>
      </div>
    </div>
  );
};

export default KioskMode;
