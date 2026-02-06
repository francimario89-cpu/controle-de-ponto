
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

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => { if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setError("Erro ao acessar câmera."));
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Raio da Terra em metros
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

  const capture = () => {
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude, longitude } = p.coords;

      // Validação de Geofencing
      if (geofenceConfig?.enabled) {
        const dist = calculateDistance(latitude, longitude, geofenceConfig.lat, geofenceConfig.lng);
        if (dist > geofenceConfig.radius) {
          setError(`Fora do Perímetro! Você está a ${Math.round(dist)}m da empresa. Limite: ${geofenceConfig.radius}m.`);
          setLoading(false);
          return;
        }
      }

      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        
        onCapture(data, { 
          lat: latitude, 
          lng: longitude, 
          address: "Localização Validada via GPS" 
        });
      }
    }, (err) => {
      setError("Ative o GPS para registrar o ponto.");
      setLoading(false);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-8">
      <div className="w-full flex justify-between items-center text-white">
        <button onClick={onCancel} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
        <p className="text-[10px] font-black tracking-widest uppercase opacity-60">
          {isFirstAccess ? 'Cadastro Facial' : 'Registro Biométrico'}
        </p>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-4 border-white/20 bg-slate-900">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        
        {/* Overlay de Guia */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 rounded-[100px]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-64 h-80 border-2 border-dashed border-white/30 rounded-[100px]"></div>
        </div>

        {error && (
          <div className="absolute inset-x-6 bottom-10 bg-red-600 text-white p-4 rounded-3xl text-center animate-bounce shadow-2xl">
            <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={capture} 
          disabled={loading} 
          className={`w-20 h-20 rounded-full bg-white border-8 border-white/20 flex items-center justify-center transition-all ${loading ? 'opacity-50' : 'active:scale-90'}`}
        >
          {loading ? (
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div className="w-12 h-12 rounded-full border-4 border-orange-500"></div>
          )}
        </button>
        <p className="text-white/40 text-[9px] text-center uppercase tracking-[0.3em]">
          Posicione seu rosto no centro para validar
        </p>
      </div>
    </div>
  );
};

export default PunchCamera;
