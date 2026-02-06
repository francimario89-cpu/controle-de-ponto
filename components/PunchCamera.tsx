
import React, { useRef, useEffect, useState } from 'react';

interface PunchCameraProps {
  onCapture: (photo: string, location: { lat: number; lng: number; address: string }) => void;
  onCancel: () => void;
  isFirstAccess?: boolean;
  geofenceConfig?: { enabled: boolean; lat: number; lng: number; radius: number };
}

const PunchCamera: React.FC<PunchCameraProps> = ({ onCapture, onCancel, isFirstAccess, geofenceConfig }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livenessStage, setLivenessStage] = useState(0); 

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Câmera Bloqueada. Verifique as permissões."));
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startValidation = () => {
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude, longitude } = p.coords;

      // TRAVA DE GEOFENCE OBRIGATÓRIA
      if (geofenceConfig?.enabled) {
        const dist = calculateDistance(latitude, longitude, geofenceConfig.lat, geofenceConfig.lng);
        if (dist > geofenceConfig.radius) {
          setError(`REGISTRO BLOQUEADO: Você está fora da área da empresa (${Math.round(dist)}m de distância).`);
          setLoading(false);
          return;
        }
      } else if (!isFirstAccess) {
        // Se a empresa não configurou geofence, mas não é primeiro acesso, avisamos que geofence é recomendado
        console.warn("Geofence desativado. Registro liberado sem travas geográficas.");
      }

      // Se passou na geofence (ou é primeiro acesso), inicia prova de vida
      setTimeout(() => setLivenessStage(1), 1000);
      setTimeout(() => setLivenessStage(2), 2500);
      setTimeout(() => {
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
          const data = canvas.toDataURL('image/jpeg', 0.8);
          onCapture(data, { lat: latitude, lng: longitude, address: isFirstAccess ? "Cadastro Facial" : "Ponto Autorizado via GPS" });
        }
      }, 4000);

    }, (err) => {
      setError("ERRO DE GPS: O registro de ponto exige a localização ativa.");
      setLoading(false);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-8 overflow-hidden">
      <div className="w-full flex justify-between items-center text-white">
        <button onClick={onCancel} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full animate-pulse ${isFirstAccess ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
           <p className="text-[10px] font-black tracking-widest uppercase opacity-60">
             {isFirstAccess ? 'Gravação de Identidade' : 'Validação Facial'}
           </p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-8 border-white/5 bg-slate-900 shadow-2xl">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${loading ? 'brightness-125 blur-[1px]' : 'brightness-75'}`} />
        
        {loading && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_var(--primary-color)] animate-[scan_2s_linear_infinite]"></div>
             <div className="absolute inset-0 bg-primary/5"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center p-12">
           <div className={`w-full h-full border-2 rounded-[100px] transition-all duration-500 ${loading ? 'border-primary scale-105' : 'border-white/20 border-dashed'}`}></div>
        </div>

        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-3 px-6 text-center">
           <div className={`px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 transition-all ${loading ? 'bg-primary text-white scale-110' : 'bg-black/40 text-white/60'}`}>
              <p className="text-[11px] font-black uppercase tracking-widest">
                {!loading ? (isFirstAccess ? 'Centralize seu rosto para gravar' : 'Posicione seu rosto') : 
                 livenessStage === 0 ? 'Verificando GPS...' :
                 livenessStage === 1 ? 'Pisque lentamente 😉' : 
                 'Sorria para confirmar! 😁'}
              </p>
           </div>
        </div>

        {error && (
          <div className="absolute inset-0 bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center animate-in zoom-in duration-300">
            <span className="text-4xl mb-4">📍</span>
            <p className="text-white font-black uppercase text-xs tracking-widest leading-relaxed mb-6">{error}</p>
            <button onClick={onCancel} className="bg-white text-red-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px]">Tentar Novamente</button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {!error && (
          <button 
            onClick={startValidation} 
            disabled={loading} 
            className={`w-full py-6 rounded-[32px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 active:scale-95'}`}
          >
            {loading ? 'Processando...' : (isFirstAccess ? 'Gravar Face Agora' : 'Registrar Presença')}
          </button>
        )}
        <p className="text-white/20 text-[8px] text-center uppercase tracking-[0.3em] leading-relaxed">
          {isFirstAccess ? 'Esta foto será utilizada para validar todos seus pontos futuros.' : 'Registro validado por Geofence e Prova de Vida v4.0'}
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 5%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default PunchCamera;
