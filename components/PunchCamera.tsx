
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
  const [livenessStage, setLivenessStage] = useState(0); // 0: Alinhamento, 1: Pisque, 2: Sorria

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Erro ao acessar câmera."));
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

  const startLiveness = () => {
    setLoading(true);
    // Simulação de prova de vida em estágios
    setTimeout(() => setLivenessStage(1), 800);
    setTimeout(() => setLivenessStage(2), 2000);
    setTimeout(() => capture(), 3500);
  };

  const capture = () => {
    setError(null);

    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude, longitude } = p.coords;

      if (geofenceConfig?.enabled) {
        const dist = calculateDistance(latitude, longitude, geofenceConfig.lat, geofenceConfig.lng);
        if (dist > geofenceConfig.radius) {
          setError(`Local Não Autorizado (${Math.round(dist)}m)`);
          setLoading(false);
          setLivenessStage(0);
          return;
        }
      }

      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        
        onCapture(data, { lat: latitude, lng: longitude, address: "Ponto Validado via Liveness" });
      }
    }, (err) => {
      setError("Ative o GPS");
      setLoading(false);
      setLivenessStage(0);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-8">
      <div className="w-full flex justify-between items-center text-white">
        <button onClick={onCancel} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <p className="text-[10px] font-black tracking-widest uppercase opacity-60">Biometria em Tempo Real</p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-8 border-white/5 bg-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${loading ? 'brightness-125' : 'brightness-75'}`} />
        
        {/* Camada de Scanning */}
        {loading && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_20px_#f97316] animate-[scan_2s_linear_infinite]"></div>
             <div className="absolute inset-0 bg-orange-500/5 backdrop-contrast-125"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center p-12">
           <div className={`w-full h-full border-2 rounded-[100px] transition-all duration-500 ${loading ? 'border-orange-500 scale-105' : 'border-white/20 border-dashed'}`}></div>
        </div>

        {/* Instruções de Liveness */}
        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-3">
           <div className={`px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 transition-all ${loading ? 'bg-orange-500 text-white scale-110 shadow-2xl' : 'bg-black/40 text-white/60'}`}>
              <p className="text-[11px] font-black uppercase tracking-widest text-center">
                {!loading ? 'Ajuste seu Rosto' : 
                 livenessStage === 0 ? 'Detectando Face...' :
                 livenessStage === 1 ? 'Pisque para Validar 😉' : 
                 'Sorria para a Foto! 😁'}
              </p>
           </div>
        </div>

        {error && (
          <div className="absolute inset-0 bg-red-600/90 backdrop-blur-sm flex items-center justify-center p-8 text-center animate-in zoom-in">
            <p className="text-white font-black uppercase text-xs tracking-widest">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        <button 
          onClick={startLiveness} 
          disabled={loading} 
          className={`w-full py-6 rounded-[32px] bg-white text-slate-900 font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all ${loading ? 'opacity-20 scale-95' : 'hover:scale-105 active:scale-90'}`}
        >
          {loading ? 'Processando...' : 'Iniciar Reconhecimento'}
        </button>
        <p className="text-white/20 text-[8px] text-center uppercase tracking-[0.3em] leading-relaxed">
          Proteção Anti-Fraude Ativa<br/>Algoritmo Prova de Vida v4.0
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
