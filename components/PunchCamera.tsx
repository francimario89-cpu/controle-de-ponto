
import React, { useRef, useEffect, useState } from 'react';

interface PunchCameraProps {
  onCapture: (photo: string, location: { lat: number; lng: number; address: string }) => void;
  onCancel: () => void;
}

const PunchCamera: React.FC<PunchCameraProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
  }, []);

  const handleCapture = () => {
    setIsCapturing(true);
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    if (video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');

      // Simulate getting location
      navigator.geolocation.getCurrentPosition((pos) => {
        onCapture(dataUrl, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: "Avenida Getúlio Vargas, 665, Belo Horizonte, MG"
        });
      }, () => {
        onCapture(dataUrl, {
          lat: -19.935,
          lng: -43.929,
          address: "Avenida Getúlio Vargas, 665, Belo Horizonte, MG"
        });
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-8">
      <div className="w-full flex justify-between items-center text-white">
        <button onClick={onCancel} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg font-bold">Foto Registro de Ponto</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 w-full max-w-sm rounded-3xl overflow-hidden relative border-4 border-white/20">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none rounded-[100px] border-dotted"></div>
      </div>

      <div className="py-8">
        <button 
          onClick={handleCapture}
          disabled={isCapturing}
          className="w-20 h-20 rounded-full bg-white border-8 border-white/20 flex items-center justify-center transition-transform active:scale-90"
        >
          <div className="w-10 h-10 rounded-full border-4 border-slate-300"></div>
        </button>
      </div>

      <p className="text-white/40 text-xs text-center">Posicione seu rosto dentro da moldura para registrar o ponto.</p>
    </div>
  );
};

export default PunchCamera;
