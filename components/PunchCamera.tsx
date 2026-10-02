
import React, { useRef, useEffect, useState } from 'react';
import { MapPin, RefreshCw, AlertTriangle, ShieldAlert, ArrowLeft, CheckCircle2, Wifi, Info } from 'lucide-react';

interface PunchCameraProps {
  onCapture: (photo: string, location: { lat: number; lng: number; address: string }, mood: string) => void;
  onCancel: () => void;
  isFirstAccess?: boolean;
  geofenceConfig?: { enabled: boolean; lat: number; lng: number; radius: number };
  authorizedIP?: string;
}

interface CameraErrorInfo {
  type: 'gps_denied' | 'gps_off' | 'gps_timeout' | 'geofence' | 'network' | 'camera' | 'general';
  title: string;
  message: string;
  suggestion: string;
  allowBypass: boolean;
}

const PunchCamera: React.FC<PunchCameraProps> = ({ onCapture, onCancel, isFirstAccess, geofenceConfig, authorizedIP }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);
  const [livenessStage, setLivenessStage] = useState(0); 
  const [selectedMood, setSelectedMood] = useState('feliz');
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

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
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => { 
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s; 
      })
      .catch(() => {
        setErrorInfo({
          type: 'camera',
          title: 'Câmera Bloqueada',
          message: 'Não foi possível acessar a câmera frontal deste aparelho.',
          suggestion: 'Toque no ícone de cadeado ou configurações ao lado do link do site e permita o acesso à Câmera.',
          allowBypass: false
        });
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const proceedWithCapture = (coords: { lat: number; lng: number; address: string }) => {
    setLoading(true);
    setErrorInfo(null);
    // 3. Prova de Vida (Liveness)
    setTimeout(() => setLivenessStage(1), 800);
    setTimeout(() => setLivenessStage(2), 2200);
    setTimeout(() => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.82);
        onCapture(data, coords, selectedMood);
      }
    }, 3600);
  };

  const getPositionWithTimeout = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  const startValidation = async () => {
    setLoading(true);
    setErrorInfo(null);

    // 1. Validar IP (WiFi da Empresa) apenas se estiver configurado e o dispositivo estiver online
    if (authorizedIP && navigator.onLine) {
      try {
        setLivenessStage(-1); // Estágio de Verificação de Rede
        const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
        const data = await response.json();
        const userIP = data.ip;

        if (userIP !== authorizedIP) {
          setErrorInfo({
            type: 'network',
            title: 'Rede Wi-Fi Não Autorizada',
            message: `Você deve estar conectado à rede Wi-Fi da empresa para bater o ponto.`,
            suggestion: `Conecte-se à rede Wi-Fi oficial da empresa e tente novamente. (Seu IP: ${userIP} | IP Autorizado: ${authorizedIP})`,
            allowBypass: false
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Não foi possível verificar IP público; prosseguindo com validação GPS:", e);
      }
    }

    const isGeofenceMandatory = Boolean(geofenceConfig?.enabled);

    // 2. Verificar se navegador suporta Geolocalização
    if (!('geolocation' in navigator)) {
      if (isGeofenceMandatory) {
        setErrorInfo({
          type: 'general',
          title: 'GPS Não Suportado',
          message: 'Este navegador não possui suporte a geolocalização.',
          suggestion: 'Por favor, utilize o navegador Google Chrome atualizado para registrar seu ponto.',
          allowBypass: false
        });
        setLoading(false);
        return;
      } else {
        proceedWithCapture({
          lat: 0,
          lng: 0,
          address: "Ponto Autorizado (Dispositivo sem GPS)"
        });
        return;
      }
    }

    // 3. Checagem prévia de permissão se suportada
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setErrorInfo({
            type: 'gps_denied',
            title: 'Permissão de GPS Bloqueada',
            message: 'O navegador está bloqueando o acesso à localização deste aparelho.',
            suggestion: 'Toque no ícone ao lado do link do site (🔒 ou configurações no topo do navegador) > Permissões > Ative a "Localização" e tente novamente.',
            allowBypass: !isGeofenceMandatory
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        // Query de permissão pode falhar em alguns navegadores móveis, segue normalmente
      }
    }

    setLivenessStage(0); // "Verificando GPS..."
    let position: GeolocationPosition | null = null;
    let lastError: GeolocationPositionError | null = null;

    try {
      // Tentativa 1: Alta precisão com cache recente (até 60s) e timeout de 9 segundos
      position = await getPositionWithTimeout({
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000
      });
    } catch (err: any) {
      lastError = err;
      console.warn("Tentativa de alta precisão GPS falhou:", err);

      // Se o erro NÃO for recusa explícita de permissão (code 1), tenta baixa precisão (Wi-Fi/Torres móveis)
      if (err?.code !== 1) {
        try {
          // Tentativa 2: Baixa precisão (funciona rapidamente dentro de escritórios/prédios)
          position = await getPositionWithTimeout({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 180000
          });
          lastError = null;
        } catch (fallbackErr: any) {
          lastError = fallbackErr;
          console.warn("Tentativa de localização via rede também falhou:", fallbackErr);
        }
      }
    }

    // Se obteve coordenadas com sucesso:
    if (position) {
      const { latitude, longitude, accuracy } = position.coords;

      // Validação de Geofence (Cerca Virtual) se habilitada pela empresa
      if (geofenceConfig?.enabled) {
        const dist = calculateDistance(latitude, longitude, geofenceConfig.lat, geofenceConfig.lng);
        if (dist > geofenceConfig.radius) {
          setErrorInfo({
            type: 'geofence',
            title: 'Fora do Perímetro da Empresa',
            message: `Você está a ${Math.round(dist)}m de distância da empresa. O raio máximo autorizado é de ${geofenceConfig.radius}m.`,
            suggestion: 'Aproxime-se do local de trabalho autorizado para registrar sua presença.',
            allowBypass: false
          });
          setLoading(false);
          return;
        }
      }

      const accuracyText = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
      const addressText = isFirstAccess 
        ? "Cadastro Facial" 
        : (!navigator.onLine 
            ? "Ponto Offline (GPS Validado)" 
            : `Ponto Autorizado via GPS [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]${accuracyText}`);

      proceedWithCapture({
        lat: latitude,
        lng: longitude,
        address: addressText
      });
      return;
    }

    // Se o dispositivo estiver offline e o GPS falhar por falta de sinal
    if (!navigator.onLine) {
      proceedWithCapture({
        lat: 0,
        lng: 0,
        address: "Ponto Offline (Salvo no Dispositivo)"
      });
      return;
    }

    // Classificação precisa do erro para orientar o colaborador
    const errCode = lastError?.code;
    if (errCode === 1) { // PERMISSION_DENIED
      setErrorInfo({
        type: 'gps_denied',
        title: 'Permissão de GPS Negada',
        message: 'O navegador está configurado para bloquear a localização deste site.',
        suggestion: 'No topo da tela, toque no ícone de opções/cadeado ao lado do link do site, entre em "Configurações do Site / Permissões" e ative a "Localização".',
        allowBypass: !isGeofenceMandatory
      });
    } else if (errCode === 2) { // POSITION_UNAVAILABLE
      setErrorInfo({
        type: 'gps_off',
        title: 'GPS Desativado no Celular',
        message: 'A localização do seu aparelho está desligada.',
        suggestion: 'Deslize a barra de notificações do topo da tela do celular e toque no botão "Localização" ou "GPS" para ativá-lo.',
        allowBypass: !isGeofenceMandatory
      });
    } else if (errCode === 3) { // TIMEOUT
      setErrorInfo({
        type: 'gps_timeout',
        title: 'Sinal de GPS Fraco ou Instável',
        message: 'Não foi possível obter o sinal de satélite a tempo (comum em salas fechadas ou subsolos).',
        suggestion: 'Ligue o Wi-Fi para auxiliar na localização ou aproxime-se de uma janela para obter sinal.',
        allowBypass: !isGeofenceMandatory
      });
    } else {
      setErrorInfo({
        type: 'general',
        title: 'Falha no Sinal de Localização',
        message: 'Não foi possível obter a confirmação do GPS no momento.',
        suggestion: 'Verifique se a localização e a internet estão ativas no aparelho e tente novamente.',
        allowBypass: !isGeofenceMandatory
      });
    }

    setLoading(false);
  };

  const handleBypassRegistration = () => {
    proceedWithCapture({
      lat: 0,
      lng: 0,
      address: "Ponto Autorizado (Sinal GPS Fraco/Indisponível)"
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-6 md:p-8 overflow-hidden">
      <div className="w-full flex justify-between items-center text-white max-w-sm">
        <button 
          onClick={onCancel} 
          className="bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all"
        >
          Cancelar
        </button>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full animate-pulse ${isFirstAccess ? 'bg-indigo-500' : isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
           <p className="text-[10px] font-black tracking-widest uppercase opacity-80 flex items-center gap-1.5">
             {isFirstAccess ? 'Gravação de Identidade' : isOfflineMode ? '📴 Modo Offline Ativo' : 'Validação Facial'}
           </p>
        </div>
        <div className="w-10"></div>
      </div>

      <div className="relative w-full max-w-sm aspect-[3/4] rounded-[48px] overflow-hidden border-8 border-white/5 bg-slate-900 shadow-2xl">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${loading ? 'brightness-125 blur-[1px]' : 'brightness-75'}`} 
        />
        
        {loading && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-1 bg-[#f97316] shadow-[0_0_20px_#f97316] animate-[scan_2s_linear_infinite]"></div>
             <div className="absolute inset-0 bg-orange-500/5"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
           <div className={`w-full h-full border-2 rounded-[90px] transition-all duration-500 ${loading ? 'border-orange-500 scale-105' : 'border-white/20 border-dashed'}`}></div>
        </div>

        {!loading && !errorInfo && (
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
          <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 px-6 text-center">
             <div className="px-5 py-3 rounded-2xl backdrop-blur-md border border-white/10 bg-orange-500 text-white shadow-xl scale-105 transition-all">
                <p className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  {livenessStage === -1 ? 'Validando Wi-Fi...' :
                   livenessStage === 0 ? 'Conectando ao GPS...' :
                   livenessStage === 1 ? 'Pisque lentamente 😉' : 
                   'Sorria para confirmar! 😁'}
                </p>
             </div>
          </div>
        )}

        {/* Modal de Erro com Diagnóstico Claro e Ações Diretas */}
        {errorInfo && (
          <div className="absolute inset-0 bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center animate-in zoom-in-95 duration-300 overflow-y-auto">
            <div className="w-full flex justify-end">
              <button 
                onClick={onCancel}
                className="text-white/70 hover:text-white p-1 text-xs font-black uppercase"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center my-auto w-full max-w-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-white mb-1 shadow-inner">
                {errorInfo.type === 'gps_denied' ? (
                  <ShieldAlert size={28} />
                ) : errorInfo.type === 'gps_off' || errorInfo.type === 'gps_timeout' ? (
                  <MapPin size={28} />
                ) : (
                  <AlertTriangle size={28} />
                )}
              </div>

              <h3 className="text-white font-black uppercase text-xs tracking-wider">
                {errorInfo.title}
              </h3>

              <p className="text-white/90 font-medium text-[10px] leading-relaxed px-1">
                {errorInfo.message}
              </p>

              {/* Caixa com Instrução Passo a Passo */}
              <div className="w-full bg-black/25 rounded-2xl p-3 border border-white/15 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 text-[9px] font-black uppercase">
                  <Info size={12} />
                  <span>Como resolver:</span>
                </div>
                <p className="text-white text-[9px] font-medium leading-relaxed whitespace-pre-line">
                  {errorInfo.suggestion}
                </p>
              </div>

              {/* Botões de Ação Direta */}
              <div className="w-full pt-2 flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setErrorInfo(null);
                    startValidation();
                  }} 
                  className="w-full bg-white text-red-700 hover:bg-slate-100 active:scale-95 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw size={13} />
                  <span>Tentar Novamente</span>
                </button>

                {errorInfo.allowBypass && (
                  <button
                    onClick={handleBypassRegistration}
                    className="w-full bg-orange-500/90 hover:bg-orange-500 active:scale-95 text-white py-2.5 rounded-2xl font-black uppercase text-[9px] tracking-wider border border-white/20 shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 size={13} />
                    <span>Registrar com Sinal Fraco</span>
                  </button>
                )}

                <button 
                  onClick={onCancel} 
                  className="text-white/70 hover:text-white py-1 text-[9px] font-black uppercase tracking-wider underline underline-offset-2"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>

            <div className="text-[7px] text-white/50 uppercase tracking-widest pt-2">
              Segurança WiFi & GPS v5.2
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {!errorInfo && (
          <button 
            onClick={startValidation} 
            disabled={loading} 
            className={`w-full py-5 rounded-[28px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all ${
              loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white hover:bg-orange-500 hover:text-white text-slate-900 active:scale-95'
            }`}
          >
            {loading ? 'Validando Presença...' : (isFirstAccess ? 'Gravar Face Agora' : 'Confirmar e Registrar')}
          </button>
        )}
        <div className="flex flex-col items-center gap-0.5 opacity-30">
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
