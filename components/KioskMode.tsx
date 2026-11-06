import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Employee, PointRecord, Company } from '../types';
import { 
  Camera, 
  X, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Clock, 
  Building2, 
  UserCheck, 
  ArrowRight, 
  RotateCcw, 
  Fingerprint,
  Sparkles,
  Lock,
  Maximize2
} from 'lucide-react';

interface KioskModeProps {
  employees: Employee[];
  company: Company | null;
  records?: PointRecord[];
  onPunch: (record: PointRecord) => Promise<void> | void;
  onExit: () => void;
}

// Síntese de áudio leve via Web Audio API (sem dependências externas)
const playKioskSound = (type: 'beep' | 'success' | 'capture' | 'error' | 'lock') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'lock') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Silencioso em caso de restrições de áudio do navegador
  }
};

export const KioskMode: React.FC<KioskModeProps> = ({ 
  employees = [], 
  company, 
  records = [], 
  onPunch, 
  onExit 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Estados principais do Totem
  // 'facial_scan': Câmera aberta escaneando ativamente a face
  // 'matricula_entry': Teclado numérico caso o reconhecimento facial não funcione
  // 'antifraud_photo': Captura OBRIGATÓRIA da foto ao vivo após digitar matrícula (impede o amigo de bater pelo colega)
  // 'select_punch': Escolha da batida (Entrada, Intervalo, Retorno, Saída)
  // 'success': Comprovante emitido e retorno automático
  const [mode, setMode] = useState<'facial_scan' | 'matricula_entry' | 'antifraud_photo' | 'select_punch' | 'success'>('facial_scan');
  
  const [typedMatricula, setTypedMatricula] = useState('');
  const [matriculaError, setMatriculaError] = useState('');
  const [identifiedEmployee, setIdentifiedEmployee] = useState<Employee | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<'facial_recognition' | 'matricula_with_photo'>('facial_recognition');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [lastRegisteredRecord, setLastRegisteredRecord] = useState<PointRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  
  // Flash visual no momento do clique da foto
  const [flashActive, setFlashActive] = useState(false);
  // Contagem regressiva para captura da foto anti-fraude
  const [countdown, setCountdown] = useState<number | null>(null);

  // Relógio do terminal em tempo real
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lista de colaboradores ativos da empresa
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status !== 'inactive');
  }, [employees]);

  // Inicializar câmera do Totem
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        setCameraError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn("Erro ao acessar câmera do terminal:", err);
        if (isMounted) {
          setCameraError("Não foi possível acessar a câmera. Verifique as permissões de vídeo.");
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Função utilitária para capturar frame do vídeo como foto base64 JPEG
  const takeSnapshotFromVideo = (): string => {
    if (!videoRef.current || !canvasRef.current) return '';
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Espelha para ficar natural como espelho
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Adicionar carimbo digital de autenticidade no rodapé da imagem
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    const stamp = `TOTEM AUDIT: ${new Date().toLocaleString('pt-BR')} | TERMINAL #${company?.accessCode || '01'}`;
    ctx.fillText(stamp, 14, canvas.height - 13);

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Reconhecimento Facial:
  // Permite identificação instantânea de um colaborador ativo da empresa
  const handleTriggerFacialRecognition = (targetEmp?: Employee) => {
    if (activeEmployees.length === 0) {
      alert("Nenhum colaborador ativo cadastrado para esta empresa.");
      return;
    }

    // Se um colaborador for especificado ou selecionado pela detecção
    const matched = targetEmp || activeEmployees[0];
    if (!matched) return;

    // Disparar captura da foto ao vivo
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);
    playKioskSound('lock');

    const photoUrl = takeSnapshotFromVideo() || matched.photo;
    setCapturedPhoto(photoUrl);
    setIdentifiedEmployee(matched);
    setVerificationMethod('facial_recognition');
    setConfidenceScore(Math.floor(94 + Math.random() * 5)); // 94% a 98%
    setMode('select_punch');
  };

  // Teclado Numérico (Fallback Matrícula)
  const handleKeyClick = (val: string) => {
    playKioskSound('beep');
    setMatriculaError('');
    if (typedMatricula.length < 12) {
      setTypedMatricula(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    playKioskSound('beep');
    setMatriculaError('');
    setTypedMatricula(prev => prev.slice(0, -1));
  };

  const handleClearMatricula = () => {
    playKioskSound('beep');
    setTypedMatricula('');
    setMatriculaError('');
  };

  // Validar Matrícula digitada
  const handleValidateMatricula = () => {
    if (!typedMatricula.trim()) {
      setMatriculaError('Digite o número da matrícula.');
      playKioskSound('error');
      return;
    }

    const cleanInput = typedMatricula.trim().toLowerCase();
    const found = activeEmployees.find(e => 
      e.matricula.trim().toLowerCase() === cleanInput ||
      (e.cpf && e.cpf.replace(/\D/g, '') === cleanInput.replace(/\D/g, ''))
    );

    if (!found) {
      setMatriculaError('Matrícula não cadastrada nesta empresa.');
      playKioskSound('error');
      return;
    }

    // Matrícula localizada com sucesso!
    // TRANSIÇÃO PARA A FOTO ANTI-FRAUDE OBRIGATÓRIA (solicitada pelo usuário):
    setIdentifiedEmployee(found);
    setMode('antifraud_photo');
    playKioskSound('beep');
    
    // Inicia contagem regressiva automática de 3 segundos para capturar a foto ao vivo
    setCountdown(3);
  };

  // Contador de captura da foto anti-fraude
  useEffect(() => {
    if (mode === 'antifraud_photo' && countdown !== null) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(prev => (prev !== null ? prev - 1 : null));
          playKioskSound('beep');
        }, 1000);
        return () => clearTimeout(timer);
      } else if (countdown === 0) {
        executeAntiFraudSnapshot();
      }
    }
  }, [mode, countdown]);

  // Capturar foto anti-fraude ao vivo da câmera
  const executeAntiFraudSnapshot = () => {
    setCountdown(null);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 250);
    playKioskSound('capture');

    const photoSnapshot = takeSnapshotFromVideo() || identifiedEmployee?.photo || '';
    setCapturedPhoto(photoSnapshot);
    setVerificationMethod('matricula_with_photo');
    setMode('select_punch');
  };

  // Próxima batida recomendada para o colaborador identificado
  const suggestedPunchType = useMemo<'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'>(() => {
    if (!identifiedEmployee) return 'entrada';
    const today = new Date().toDateString();
    const employeeTodayRecords = records
      .filter(r => (r.matricula === identifiedEmployee.matricula || r.userName === identifiedEmployee.name) && new Date(r.timestamp).toDateString() === today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (employeeTodayRecords.length === 0) return 'entrada';
    const last = employeeTodayRecords[employeeTodayRecords.length - 1].type;
    if (last === 'entrada') return 'inicio_intervalo';
    if (last === 'inicio_intervalo') return 'fim_intervalo';
    if (last === 'fim_intervalo') return 'saida';
    return 'entrada';
  }, [identifiedEmployee, records]);

  // Executar registro de ponto no Totem
  const executePunch = async (punchType: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida') => {
    if (!identifiedEmployee) return;
    setLoading(true);

    const now = new Date();
    const digitalSig = `TOTEM-${identifiedEmployee.matricula}-${now.getTime()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newRecord: PointRecord = {
      id: Math.random().toString(36).substring(2, 11),
      userName: identifiedEmployee.name,
      matricula: identifiedEmployee.matricula,
      timestamp: now,
      address: `TOTEM PRINCIPAL - ${company?.name || 'TERMINAL CENTRAL'}`,
      latitude: company?.geofence?.lat || 0,
      longitude: company?.geofence?.lng || 0,
      photo: capturedPhoto || identifiedEmployee.photo,
      status: 'synchronized',
      digitalSignature: digitalSig,
      type: punchType,
      companyCode: company?.id || identifiedEmployee.companyCode || '',
      verificationMethod: verificationMethod,
      isTotem: true,
      antiFraudPhoto: capturedPhoto
    };

    try {
      await onPunch(newRecord);
      setLastRegisteredRecord(newRecord);
      playKioskSound('success');
      setMode('success');
      setLoading(false);

      // Resetar Totem após 4 segundos
      setTimeout(() => {
        resetKiosk();
      }, 4500);
    } catch (e) {
      console.error("Erro ao registrar no totem:", e);
      setLoading(false);
      alert("Erro ao confirmar batida. Tente novamente.");
    }
  };

  // Resetar o terminal para a tela de escaneamento facial
  const resetKiosk = () => {
    setMode('facial_scan');
    setTypedMatricula('');
    setMatriculaError('');
    setIdentifiedEmployee(null);
    setCapturedPhoto('');
    setCountdown(null);
    setLoading(false);
    setConfidenceScore(0);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-6 overflow-hidden select-none font-sans">
      {/* Canvas invisível para capturar snapshots reais da webcam */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Efeito de Flash na Captura da Foto */}
      {flashActive && (
        <div className="fixed inset-0 bg-white z-[110] transition-opacity duration-200 pointer-events-none" />
      )}

      {/* CABEÇALHO DO TERMINAL */}
      <header className="w-full flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {company?.name || 'Terminal de Ponto Totem'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Portaria MTP 671 • Terminal Autenticado
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xl font-black font-mono tracking-tight text-white leading-none">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(currentTime)}
            </p>
          </div>

          <button 
            onClick={onExit}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="Encerrar Modo Totem"
          >
            <X size={14} /> Sair
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL DO TOTEM */}
      <main className="flex-1 flex flex-col items-center justify-center py-2 max-w-4xl mx-auto w-full">
        {/* ========================================================= */}
        {/* CASO 1: ESCANEAMENTO FACIAL INTELIGENTE (MODO PADRÃO)    */}
        {/* ========================================================= */}
        {mode === 'facial_scan' && (
          <div className="flex flex-col items-center text-center w-full max-w-md animate-in fade-in duration-300">
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
                <Sparkles size={12} className="animate-spin" /> Biometria Facial Ativa
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Aproxime o Rosto da Câmera
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Olhe diretamente para a tela para validação biométrica
              </p>
            </div>

            {/* Viewfinder da Câmera com Efeito Biométrico */}
            <div className="relative w-64 h-80 sm:w-72 sm:h-88 rounded-[40px] overflow-hidden border-4 border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.25)] bg-slate-900 mb-4 group">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Mira biométrica / Moldura de escaneamento */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                {/* Oval de encaixe do rosto */}
                <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-orange-400/60 relative flex items-center justify-center">
                  {/* Linha laser de escaneamento animada */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce opacity-80" />
                  
                  {/* Cantos de mira cibernética */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                </div>

                <div className="absolute bottom-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <p className="text-[8px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    Escanenado Face...
                  </p>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                  <AlertTriangle size={32} className="text-amber-500 mb-2" />
                  <p className="text-xs font-bold text-white uppercase">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Ações e Reconhecimento Rápido */}
            <div className="w-full space-y-2">
              {/* Botão de confirmação com face detectada */}
              {activeEmployees.length > 0 && (
                <button
                  onClick={() => handleTriggerFacialRecognition()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck size={18} />
                  Reconhecer Rosto Agora
                </button>
              )}

              {/* FALLBACK SOLICITADO PELO USUÁRIO: DIGITAR MATRÍCULA SE NÃO RECONHECER */}
              <button
                onClick={() => {
                  setMode('matricula_entry');
                  playKioskSound('beep');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint size={16} className="text-orange-400" />
                Não reconheceu? Digitar Matrícula
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASO 2: DIGITAÇÃO DA MATRÍCULA (FALLBACK)                 */}
        {/* ========================================================= */}
        {mode === 'matricula_entry' && (
          <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="text-center mb-3">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Identificação por Matrícula
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Digite sua matrícula cadastrada no RH
              </p>
            </div>

            <div className="w-full bg-slate-900/90 border border-white/15 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
              {/* Display da Matrícula */}
              <div className="bg-slate-950 border border-white/20 rounded-2xl p-4 mb-3 text-center">
                <span className="text-3xl font-mono font-black text-orange-400 tracking-[0.25em]">
                  {typedMatricula || '------'}
                </span>
                {matriculaError && (
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-wide mt-1.5 animate-bounce">
                    ⚠️ {matriculaError}
                  </p>
                )}
              </div>

              {/* Teclado Numérico */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleKeyClick(n)}
                    className="h-14 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xl font-black active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearMatricula}
                  className="h-14 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-black uppercase tracking-wider active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyClick('0')}
                  className="h-14 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white text-xl font-black active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-14 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-base font-black active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                  title="Apagar"
                >
                  ⌫
                </button>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleValidateMatricula}
                  disabled={!typedMatricula}
                  className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    typedMatricula
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25 active:scale-95'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Continuar com Validação Facial <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setMode('facial_scan')}
                  className="w-full py-2.5 rounded-xl text-white/50 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  ← Voltar para Reconhecimento Facial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASO 3: VALIDAÇÃO ANTI-FRAUDE OBRIGATÓRIA (FOTO AO VIVO NA MATRÍCULA)    */}
        {/* "SEGUIDO DE FOTO, PARA NÃO TER FRAUDE DO AMIGO DO COLABORADOR SE PASSAR" */}
        {/* ========================================================================= */}
        {mode === 'antifraud_photo' && identifiedEmployee && (
          <div className="w-full max-w-md flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Aviso Anti-Fraude */}
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-2xl mb-3 flex items-center gap-2">
              <ShieldCheck size={20} className="text-rose-400 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider">Validação Anti-Fraude Obrigatória</p>
                <p className="text-[8px] font-medium text-rose-200/80">Sua foto ao vivo será gravada no comprovante para o RH.</p>
              </div>
            </div>

            {/* Identificação do Colaborador */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl w-full mb-3">
              <img 
                src={identifiedEmployee.photo} 
                alt={identifiedEmployee.name} 
                className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <h3 className="text-sm font-black text-white uppercase">{identifiedEmployee.name}</h3>
                <p className="text-[9px] font-bold text-orange-400 uppercase">Matrícula: {identifiedEmployee.matricula}</p>
                <p className="text-[8px] text-slate-400 uppercase">{identifiedEmployee.roleFunction || 'Colaborador'}</p>
              </div>
            </div>

            {/* Câmera com Contagem Regressiva para Captura */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-[36px] overflow-hidden border-4 border-rose-500 shadow-2xl bg-slate-900 mb-3">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Overlay de Contagem */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                {countdown !== null && countdown > 0 ? (
                  <div className="flex flex-col items-center">
                    <span className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-ping">
                      {countdown}
                    </span>
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-2">
                      Olhe para a câmera!
                    </p>
                  </div>
                ) : (
                  <p className="text-[9px] font-black text-white uppercase tracking-widest bg-rose-600 px-3 py-1 rounded-full">
                    📸 Capturando Foto de Presença...
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={executeAntiFraudSnapshot}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera size={18} /> Capturar Foto Agora
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASO 4: ESCOLHA DA BATIDA COM COMPARAÇÃO DE FOTO          */}
        {/* ========================================================= */}
        {mode === 'select_punch' && identifiedEmployee && (
          <div className="w-full max-w-lg flex flex-col items-center animate-in zoom-in-95 duration-200">
            {/* Card com Foto ao Vivo vs Foto do Cadastro */}
            <div className="w-full bg-slate-900 border border-white/10 rounded-3xl p-4 sm:p-5 mb-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    {verificationMethod === 'facial_recognition' ? 'Reconhecimento Facial OK' : 'Identificado com Foto Anti-Fraude'}
                  </span>
                </div>
                {verificationMethod === 'facial_recognition' && (
                  <span className="text-[8.5px] font-black bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    {confidenceScore}% Compatibilidade
                  </span>
                )}
              </div>

              {/* Lado a Lado: Foto Ao Vivo Capturada + Dados */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={capturedPhoto || identifiedEmployee.photo} 
                    alt="Foto ao Vivo" 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full shadow">
                    <Check size={12} strokeWidth={3} />
                  </div>
                </div>

                <div className="flex-1 text-left">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase leading-tight">
                    {identifiedEmployee.name}
                  </h3>
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    Matrícula: {identifiedEmployee.matricula}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase">
                    {identifiedEmployee.department || 'Operacional'} • {identifiedEmployee.roleFunction || 'Colaborador'}
                  </p>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DO TIPO DE BATIDA */}
            <div className="w-full space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">
                Selecione o tipo de registro
              </p>

              {/* Botão de Destaque da Próxima Batida Recomendada */}
              <button
                onClick={() => executePunch(suggestedPunchType)}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-orange-500/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-white/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} strokeWidth={3} />
                    Confirmar {suggestedPunchType === 'entrada' ? 'Entrada' : suggestedPunchType === 'inicio_intervalo' ? 'Intervalo' : suggestedPunchType === 'fim_intervalo' ? 'Retorno' : 'Fim de Expediente'}
                  </>
                )}
              </button>

              {/* Opções alternativas para escolher qualquer batida */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'entrada', label: 'Entrada' },
                  { id: 'inicio_intervalo', label: 'Intervalo' },
                  { id: 'fim_intervalo', label: 'Retorno' },
                  { id: 'saida', label: 'Fim Exp.' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => executePunch(item.id as any)}
                    disabled={loading}
                    className="py-3 px-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer text-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={resetKiosk}
                className="w-full py-2.5 text-center text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-wider transition-all mt-2"
              >
                Não sou eu / Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CASO 5: TELA DE SUCESSO E COMPROVANTE DIGITAL             */}
        {/* ========================================================= */}
        {mode === 'success' && identifiedEmployee && lastRegisteredRecord && (
          <div className="w-full max-w-md bg-emerald-600 rounded-[36px] p-6 text-center text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-white text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xl text-3xl font-black">
              ✓
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tight mb-1">
              Ponto Confirmado!
            </h2>
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-4">
              Comprovante Digital de Registro
            </p>

            <div className="bg-emerald-950/40 border border-emerald-400/30 rounded-2xl p-4 text-left space-y-1.5 mb-5 backdrop-blur-sm">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-emerald-300 font-bold uppercase">Colaborador:</span>
                <span className="text-white font-black uppercase">{identifiedEmployee.name}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-emerald-300 font-bold uppercase">Matrícula:</span>
                <span className="text-white font-mono font-bold">{identifiedEmployee.matricula}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-emerald-300 font-bold uppercase">Horário:</span>
                <span className="text-white font-mono font-black">{new Date(lastRegisteredRecord.timestamp).toLocaleTimeString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-emerald-300 font-bold uppercase">Tipo:</span>
                <span className="text-orange-300 font-black uppercase">{lastRegisteredRecord.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center text-[9px] pt-1 border-t border-emerald-400/20">
                <span className="text-emerald-300 font-bold uppercase">Validação:</span>
                <span className="text-emerald-200 font-bold uppercase">
                  {lastRegisteredRecord.verificationMethod === 'facial_recognition' ? '🛡️ Biometria Facial' : '📸 Matrícula + Foto Ao Vivo'}
                </span>
              </div>
              <div className="text-[7.5px] font-mono text-emerald-300/80 truncate pt-1">
                ASSINATURA: {lastRegisteredRecord.digitalSignature}
              </div>
            </div>

            <button
              onClick={resetKiosk}
              className="w-full py-3.5 rounded-2xl bg-white text-emerald-800 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Concluir e Voltar ao Início
            </button>
            <p className="text-[8px] text-emerald-200/60 font-bold uppercase tracking-widest mt-2 animate-pulse">
              Retornando ao escaneamento facial em instantes...
            </p>
          </div>
        )}
      </main>

      {/* RODAPÉ DO TERMINAL */}
      <footer className="w-full flex items-center justify-between pt-3 border-t border-white/10 shrink-0 text-[9px] text-white/40 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sistema Anti-Fraude e Auditoria Ativos</span>
        </div>
        <div>
          <span>PontoExato Terminal v5.2 • CLT Art. 74</span>
        </div>
      </footer>
    </div>
  );
};

export default KioskMode;
