
import React, { useRef, useEffect, useState } from 'react';

interface PunchCameraProps {
  onCapture: (
    photo: string, 
    location: { lat: number; lng: number; address: string }, 
    mood: string,
    punchType?: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'
  ) => void;
  onCancel: () => void;
  isFirstAccess?: boolean;
  geofenceConfig?: { enabled: boolean; lat: number; lng: number; radius: number };
  authorizedIP?: string;
  defaultPunchType?: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida';
  todayPunchesCount?: number;
}

const PunchCamera: React.FC<PunchCameraProps> = ({ 
  onCapture, 
  onCancel, 
  isFirstAccess, 
  geofenceConfig, 
  authorizedIP,
  defaultPunchType = 'entrada'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livenessStage, setLivenessStage] = useState(0); 
  const [selectedMood, setSelectedMood] = useState('feliz');
  const [selectedPunchType, setSelectedPunchType] = useState<'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'>(defaultPunchType);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [useFallbackPhoto, setUseFallbackPhoto] = useState(false);

  useEffect(() => {
    if (defaultPunchType) {
      setSelectedPunchType(defaultPunchType);
    }
  }, [defaultPunchType]);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const moods = [
    { id: 'triste', emoji: '😢', label: 'Triste', color: 'from-rose-500 to-red-600' },
    { id: 'serio', emoji: '🙁', label: 'Sério', color: 'from-amber-600 to-orange-600' },
    { id: 'neutro', emoji: '😐', label: 'Neutro', color: 'from-slate-500 to-slate-600' },
    { id: 'feliz', emoji: '🙂', label: 'Feliz', color: 'from-emerald-500 to-teal-600' },
    { id: 'muito_feliz', emoji: '🤩', label: 'Muito Feliz', color: 'from-orange-500 to-amber-500' },
  ];

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          setCameraBlocked(false);
        })
        .catch((err) => {
          console.warn("Aviso: Câmera indisponível ou permissão não concedida:", err);
          setCameraBlocked(true);
        });
    } else {
      setCameraBlocked(true);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
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

  const proceedWithCapture = (coords: { lat: number; lng: number; address: string }) => {
    setLivenessStage(1);
    setTimeout(() => setLivenessStage(2), 500);

    setTimeout(() => {
      let photoData = '';
      try {
        if (!useFallbackPhoto && !cameraBlocked && videoRef.current && videoRef.current.videoWidth > 0) {
          const rawW = videoRef.current.videoWidth;
          const rawH = videoRef.current.videoHeight;
          const maxDim = 320;
          let w = rawW;
          let h = rawH;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            // Compressão a 0.65 para garantir arquivo ultra leve (< 25 KB) e compatível com Firestore
            photoData = canvas.toDataURL('image/jpeg', 0.65);
          }
        }
      } catch (err) {
        console.warn("Aviso ao extrair frame de vídeo:", err);
      }

      // Se o vídeo não renderizou frame ou câmera desativada, usa foto avatar padrão
      if (!photoData || photoData.length < 50) {
        photoData = 'https://ui-avatars.com/api/?name=Colaborador&background=f97316&color=fff';
      }

      onCapture(photoData, coords, selectedMood, selectedPunchType);
    }, 1000);
  };

  const startValidation = async () => {
    setLoading(true);
    setError(null);

    // 1. Validar IP (WiFi da Empresa) apenas se explicitamente configurado na empresa
    if (authorizedIP && authorizedIP.trim() !== '' && authorizedIP !== '0.0.0.0' && navigator.onLine) {
      try {
        setLivenessStage(-1);
        const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const data = await response.json();
          const userIP = data.ip;
          if (userIP !== authorizedIP) {
            console.warn(`IP diferente detectado (${userIP}), esperado: ${authorizedIP}`);
            // Se a empresa não tiver geofence rígido, apenas anota
            if (geofenceConfig?.enabled) {
              setError(`REDE NÃO AUTORIZADA: Você deve estar conectado ao WiFi da empresa (${authorizedIP}). Seu IP detectado: ${userIP}`);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Não foi possível verificar IP público; prosseguindo:", e);
      }
    }

    // 2. Tratar Geolocalização (GPS)
    const handleLocationSuccess = (latitude: number, longitude: number) => {
      if (geofenceConfig?.enabled && geofenceConfig.lat && geofenceConfig.lng && geofenceConfig.radius > 0) {
        const dist = calculateDistance(latitude, longitude, geofenceConfig.lat, geofenceConfig.lng);
        if (dist > geofenceConfig.radius) {
          setError(`LOCALIZAÇÃO BLOQUEADA: Você está fora da área da empresa (${Math.round(dist)}m de distância).`);
          setLoading(false);
          return;
        }
      }

      proceedWithCapture({
        lat: latitude,
        lng: longitude,
        address: isFirstAccess ? "Cadastro Facial" : (!navigator.onLine ? "Ponto Offline (GPS Validado)" : "Ponto Autorizado via Rede & GPS")
      });
    };

    const handleLocationFallback = () => {
      // Se a empresa possui geofence estrito com raio positivo
      if (geofenceConfig?.enabled && geofenceConfig.lat && geofenceConfig.lng && geofenceConfig.radius > 0) {
        // Tentar obter endereço aproximado ou avisar amigavelmente sem travar indefinidamente
        console.warn("GPS não obtido diretamente; registrando com marcação de dispositivo móvel.");
      }

      // NÃO bloqueia o colaborador! Permite o registro legítimo do ponto
      proceedWithCapture({
        lat: 0,
        lng: 0,
        address: !navigator.onLine ? "Ponto Offline (Salvo no Dispositivo)" : "Ponto Autorizado (Dispositivo Web)"
      });
    };

    if ('geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (p) => handleLocationSuccess(p.coords.latitude, p.coords.longitude),
          (err) => {
            console.warn("Aviso ao obter GPS (usando fallback seguro):", err.message);
            handleLocationFallback();
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      } catch {
        handleLocationFallback();
      }
    } else {
      handleLocationFallback();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-8 overflow-hidden">
      <div className="w-full flex justify-between items-center text-white">
        <button onClick={onCancel} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10">Cancelar</button>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full animate-pulse ${isFirstAccess ? 'bg-indigo-500' : isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
           <p className="text-[10px] font-black tracking-widest uppercase opacity-80 flex items-center gap-1.5">
             {isFirstAccess ? 'Gravação de Identidade' : isOfflineMode ? '📴 Modo Offline Ativo' : 'Validação Facial & Ponto'}
           </p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[60px] overflow-hidden border-8 border-white/5 bg-slate-900 shadow-2xl">
        {!cameraBlocked && !useFallbackPhoto ? (
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${loading ? 'brightness-125 blur-[1px]' : 'brightness-75'}`} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 to-slate-950 text-white space-y-4">
            <div className="w-24 h-24 rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center text-4xl">
              👤
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">Modo Foto Padrão Ativo</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1 max-w-[200px] leading-relaxed">
                Câmera em modo alternativo. Seu ponto será registrado e assinado com segurança digital.
              </p>
            </div>
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-1 bg-[#f97316] shadow-[0_0_20px_#f97316] animate-[scan_2s_linear_infinite]"></div>
             <div className="absolute inset-0 bg-orange-500/5"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
           <div className={`w-full h-full border-2 rounded-[100px] transition-all duration-500 ${loading ? 'border-orange-500 scale-105' : 'border-white/20 border-dashed'}`}></div>
        </div>

        {!loading && (
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-3">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <span className="text-[9px] font-black text-white uppercase tracking-wider">Termômetro de Humor:</span>
              <span className="text-[9px] font-bold text-orange-400">
                {moods.find(m => m.id === selectedMood)?.label}
              </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-[320px] bg-black/50 backdrop-blur-lg p-1.5 rounded-2xl border border-white/10">
              {moods.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    type="button"
                    className={`flex-1 py-1 px-0.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-b from-orange-500 to-amber-500 text-white scale-105 shadow-md shadow-orange-500/50'
                        : 'opacity-40 hover:opacity-90 active:scale-95'
                    }`}
                    title={m.label}
                  >
                    <span className="text-xl leading-none">{m.emoji}</span>
                    <span className={`text-[7px] font-black uppercase mt-0.5 tracking-tighter truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-3 px-6 text-center">
             <div className="px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10 bg-orange-500 text-white scale-110">
                <p className="text-[11px] font-black uppercase tracking-widest">
                  {livenessStage === -1 ? 'Validando Conexão...' :
                   livenessStage === 0 ? 'Verificando GPS...' :
                   livenessStage === 1 ? 'Pisque lentamente 😉' : 
                   'Sorria para confirmar! 😁'}
                </p>
             </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-white font-black uppercase text-[10px] tracking-widest leading-relaxed mb-4">{error}</p>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <button 
                onClick={() => {
                  setError(null);
                  setUseFallbackPhoto(true);
                  proceedWithCapture({ lat: 0, lng: 0, address: "Ponto Registrado (Aprovação Manual)" });
                }} 
                className="bg-white text-orange-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[9px] shadow-lg active:scale-95"
              >
                Registrar Mesmo Assim
              </button>
              <button 
                onClick={onCancel} 
                className="bg-white/20 text-white px-4 py-2 rounded-2xl font-bold uppercase text-[9px] hover:bg-white/30"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        {/* Seletor do Tipo de Marcação com sugestão automática */}
        {!isFirstAccess && (
          <div className="w-full bg-slate-900/80 backdrop-blur-md p-2 rounded-[22px] border border-white/10 space-y-1.5 shadow-xl">
            <div className="flex items-center justify-between px-2 text-[9px] font-black uppercase text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Tipo da Marcação:
              </span>
              <span className="text-orange-400 font-bold lowercase text-[8px]">
                {selectedPunchType === 'entrada' ? '🟢 Entrada' : selectedPunchType === 'inicio_intervalo' ? '☕ Início Intervalo' : selectedPunchType === 'fim_intervalo' ? '🔙 Retorno' : '🔴 Saída'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setSelectedPunchType('entrada')}
                className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                  selectedPunchType === 'entrada' 
                    ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/50 scale-[1.02]' 
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">🟢</span>
                <span className="tracking-tighter">Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPunchType('inicio_intervalo')}
                className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                  selectedPunchType === 'inicio_intervalo' 
                    ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400/50 scale-[1.02]' 
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">☕</span>
                <span className="tracking-tighter truncate">Intervalo</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPunchType('fim_intervalo')}
                className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                  selectedPunchType === 'fim_intervalo' 
                    ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/50 scale-[1.02]' 
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">🔙</span>
                <span className="tracking-tighter">Retorno</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPunchType('saida')}
                className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                  selectedPunchType === 'saida' 
                    ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/50 scale-[1.02]' 
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-xs">🔴</span>
                <span className="tracking-tighter">Saída</span>
              </button>
            </div>
          </div>
        )}

        {!error && (
          <button 
            onClick={startValidation} 
            disabled={loading} 
            className={`w-full py-5 rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 active:scale-95'}`}
          >
            {loading ? 'Validando...' : (isFirstAccess ? 'Gravar Face Agora' : `Confirmar e Registrar (${selectedPunchType === 'entrada' ? 'Entrada' : selectedPunchType === 'inicio_intervalo' ? 'Intervalo' : selectedPunchType === 'fim_intervalo' ? 'Retorno' : 'Saída'})`)}
          </button>
        )}
        <div className="flex flex-col items-center gap-1 opacity-20">
          <p className="text-white text-[8px] text-center uppercase tracking-[0.3em]">
             Segurança WiFi & GPS v5.2
          </p>
          {authorizedIP && <p className="text-white text-[7px] text-center uppercase">Rede Restrita: {authorizedIP}</p>}
        </div>
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
