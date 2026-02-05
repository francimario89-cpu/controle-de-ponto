
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
  const [lastPunchTime, setLastPunchTime] = useState<Date | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; });
    
    const interval = setInterval(() => {
      if (!recognizing && employees.length > 0) {
        setRecognizing(true);
        
        setTimeout(() => {
          // No mundo real, aqui a IA compararia o rosto com o banco. 
          // Aqui escolhemos um funcionário real da sua lista do Firebase.
          const randomEmp = employees[Math.floor(Math.random() * employees.length)];
          setLastMatch(randomEmp);
          
          const now = new Date();
          const record: PointRecord = {
            id: Math.random().toString(36).substr(2, 9),
            userName: randomEmp.name,
            timestamp: now,
            address: "Ponto Estratégico - Recepção Central",
            latitude: -19.93,
            longitude: -43.93,
            photo: randomEmp.photo,
            status: 'synchronized',
            matricula: randomEmp.matricula
          };
          
          onPunch(record);
          setLastPunchTime(now);
          
          setTimeout(() => {
            setRecognizing(false);
            setLastMatch(null);
          }, 4000);
        }, 2500);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [employees, recognizing]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-between p-8 overflow-hidden">
      <div className="w-full flex justify-between items-center text-white/40">
        <button onClick={onExit} className="text-[10px] font-black uppercase tracking-widest border border-white/10 px-4 py-2 rounded-xl active:bg-white/10">Sair Modo Totem</button>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Biometria Ativa</p>
          <p className="text-[8px] opacity-50 uppercase tracking-tighter">Firestore Cloud Sync</p>
        </div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-8 border-white/5 shadow-2xl bg-black">
         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] opacity-60" />
         
         <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className={`absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_20px_#f97316] ${recognizing ? 'animate-[scan_2s_ease-in-out_infinite]' : 'hidden'}`}></div>
            <div className={`w-64 h-80 border-2 rounded-[100px] transition-all duration-500 ${recognizing ? 'border-orange-500 scale-105 bg-orange-500/5' : 'border-white/20 border-dashed'}`}>
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-8 bg-slate-900 px-4 py-1 rounded-full border border-white/10">
                  <span className="text-[10px] font-black text-orange-500 uppercase">
                    {recognizing ? 'Analisando Face...' : 'Aguardando Rosto'}
                  </span>
               </div>
            </div>
         </div>

         {lastMatch && (
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white animate-in zoom-in duration-300">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-[40px] border-4 border-orange-500 overflow-hidden shadow-2xl">
                   <img src={lastMatch.photo} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-3 -right-3 bg-emerald-500 rounded-2xl p-2 shadow-lg scale-110">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
              <h3 className="text-2xl font-black text-center mb-1 tracking-tight">{lastMatch.name}</h3>
              <p className="text-orange-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-8">PONTO REGISTRADO!</p>
              <div className="text-center bg-white/5 border border-white/10 rounded-3xl p-6 w-full">
                 <p className="text-4xl font-black tracking-tighter mb-1">
                   {lastPunchTime?.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                 </p>
                 <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Sincronizado com RH</p>
              </div>
           </div>
         )}
      </div>

      <div className="w-full max-w-sm text-center">
         <div className="mb-6">
            <p className="text-4xl font-black text-white tracking-tighter mb-1">
              {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
            </p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: 'long'})}
            </p>
         </div>
         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 w-1/3 animate-[loading_3s_linear_infinite]"></div>
         </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default KioskMode;
