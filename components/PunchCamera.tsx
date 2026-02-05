
import React, { useRef, useEffect, useState } from 'react';

interface PunchCameraProps {
  onCapture: (photo: string, location: { lat: number; lng: number; address: string }) => void;
  onCancel: () => void;
  isFirstAccess?: boolean;
}

const PunchCamera: React.FC<PunchCameraProps> = ({ onCapture, onCancel, isFirstAccess }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(s => { if (videoRef.current) videoRef.current.srcObject = s; });
  }, []);

  const capture = () => {
    setLoading(true);
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const data = canvas.toDataURL('image/jpeg');
      navigator.geolocation.getCurrentPosition(p => {
        onCapture(data, { lat: p.coords.latitude, lng: p.coords.longitude, address: "Localização Capturada via GPS" });
      }, () => onCapture(data, { lat: 0, lng: 0, address: "Localização Padrão" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-8">
      <div className="w-full flex justify-between text-white"><button onClick={onCancel}>Sair</button><p className="text-xs font-bold">{isFirstAccess ? 'CADASTRO FACIAL' : 'REGISTRO DE PONTO'}</p><div></div></div>
      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-4 border-white/20">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-[40px] border-black/40 rounded-[100px] pointer-events-none"></div>
      </div>
      <button onClick={capture} disabled={loading} className="w-20 h-20 rounded-full bg-white border-8 border-white/20 flex items-center justify-center active:scale-90 transition-transform">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500"></div>
      </button>
      <p className="text-white/40 text-[9px] text-center uppercase tracking-widest">{isFirstAccess ? 'Olhe para a câmera para cadastrar sua face' : 'Biometria Facial Ativa'}</p>
    </div>
  );
};

export default PunchCamera;
