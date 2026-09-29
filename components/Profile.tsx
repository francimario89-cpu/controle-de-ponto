
import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Bell, BellRing, Wifi, WifiOff, RefreshCw, CheckCircle2, Volume2, Clock, Camera, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { User, Company } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getReminderConfig, saveReminderConfig, requestNotificationPermission, sendTestReminderNotification, ReminderConfig } from '../utils/reminderService';
import { getOfflineRecords, syncOfflineRecords, StoredOfflineRecord } from '../utils/offlineStorage';

interface ProfileProps {
  user: User;
  company?: Company | null;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, company, onLogout }) => {
  const [showPassModal, setShowPassModal] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Foto de Perfil
  const [currentPhoto, setCurrentPhoto] = useState(user.photo || '');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lembretes de Ponto
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(getReminderConfig());
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const [testSent, setTestSent] = useState(false);

  // Status Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRecords, setOfflineRecords] = useState<StoredOfflineRecord[]>(getOfflineRecords());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPhoto(user.photo || '');
  }, [user.photo]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const processAndSavePhoto = async (imageSrc: string) => {
    setIsUploadingPhoto(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Falha ao processar imagem');

      // Crop centralizado quadrado
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      const base64Photo = canvas.toDataURL('image/jpeg', 0.85);

      // 1. Atualizar state local
      setCurrentPhoto(base64Photo);

      // 2. Atualizar localStorage
      const updatedUser = { ...user, photo: base64Photo, hasFacialRecord: true };
      localStorage.setItem('fortime_user', JSON.stringify(updatedUser));

      // 3. Atualizar Firestore se disponível
      if (user.matricula && user.companyCode) {
        try {
          const q = query(
            collection(db, "employees"),
            where("matricula", "==", user.matricula),
            where("companyCode", "==", user.companyCode)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            await updateDoc(doc(db, "employees", snap.docs[0].id), {
              photo: base64Photo,
              hasFacialRecord: true
            });
          }
        } catch (err) {
          console.warn("Aviso ao salvar foto no Firestore:", err);
        }
      }

      // 4. Notificar outros componentes
      window.dispatchEvent(new CustomEvent('pontoexato_user_updated', {
        detail: { photo: base64Photo, hasFacialRecord: true }
      }));

      setPhotoToast('Foto de perfil atualizada com sucesso!');
      setTimeout(() => setPhotoToast(null), 4000);
      setShowPhotoModal(false);
      stopCamera();
    } catch (err) {
      console.error("Erro ao processar foto:", err);
      alert("Erro ao processar imagem. Tente uma foto diferente.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processAndSavePhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera do dispositivo. Verifique as permissões.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();
        processAndSavePhoto(dataUrl);
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Deseja remover sua foto de perfil e voltar ao avatar padrão?")) return;
    setIsUploadingPhoto(true);
    try {
      setCurrentPhoto('');
      const updatedUser = { ...user, photo: '', hasFacialRecord: false };
      localStorage.setItem('fortime_user', JSON.stringify(updatedUser));

      if (user.matricula && user.companyCode) {
        try {
          const q = query(
            collection(db, "employees"),
            where("matricula", "==", user.matricula),
            where("companyCode", "==", user.companyCode)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            await updateDoc(doc(db, "employees", snap.docs[0].id), {
              photo: '',
              hasFacialRecord: false
            });
          }
        } catch (err) {}
      }

      window.dispatchEvent(new CustomEvent('pontoexato_user_updated', {
        detail: { photo: '', hasFacialRecord: false }
      }));

      setPhotoToast('Foto de perfil removida com sucesso!');
      setTimeout(() => setPhotoToast(null), 3000);
      setShowPhotoModal(false);
      stopCamera();
    } catch (err) {
      alert("Erro ao remover foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOfflineChange = () => setOfflineRecords(getOfflineRecords());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pontoexato_offline_change', handleOfflineChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pontoexato_offline_change', handleOfflineChange);
    };
  }, []);

  const handleToggleReminders = async (enabled: boolean) => {
    if (enabled && notifPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }
    const updated = { ...reminderConfig, enabled };
    setReminderConfig(updated);
    saveReminderConfig(updated);
  };

  const handleChangeMinutes = (minutes: number) => {
    const updated = { ...reminderConfig, minutesBefore: minutes };
    setReminderConfig(updated);
    saveReminderConfig(updated);
  };

  const handleToggleSound = (sound: boolean) => {
    const updated = { ...reminderConfig, sound };
    setReminderConfig(updated);
    saveReminderConfig(updated);
  };

  const handleTestNotification = async () => {
    const sent = await sendTestReminderNotification(user.name);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  };

  const handleSyncOffline = async () => {
    if (!navigator.onLine) {
      alert("Você está sem conexão com a internet. Conecte-se para sincronizar.");
      return;
    }
    setIsSyncing(true);
    try {
      const { syncedCount } = await syncOfflineRecords(db);
      setOfflineRecords(getOfflineRecords());
      if (syncedCount > 0) {
        setSyncSuccessMsg(`${syncedCount} marcação(ões) sincronizada(s) com sucesso!`);
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      } else {
        setSyncSuccessMsg("Nenhuma batida pendente de sincronização.");
        setTimeout(() => setSyncSuccessMsg(null), 3000);
      }
    } catch (e) {
      alert("Erro durante a sincronização.");
    }
    setIsSyncing(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPass) return alert("Digite a nova senha!");
    setLoading(true);
    try {
      const q = query(collection(db, "employees"), where("matricula", "==", user.matricula), where("companyCode", "==", user.companyCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), { password: newPass });
        alert("SENHA ALTERADA COM SUCESSO!");
        setShowPassModal(false);
        setNewPass('');
      }
    } catch (e) { alert("ERRO AO ALTERAR SENHA."); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <header className="px-4 py-4 flex items-center border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h1 className="flex-1 text-center font-bold text-slate-800 dark:text-white text-sm">Meus Dados & Preferências</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* INPUT DE ARQUIVO OCULTO */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept="image/*" 
          className="hidden" 
        />

        {/* TOAST DE FEEDBACK DE FOTO */}
        {photoToast && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between text-[10px] font-black uppercase tracking-wider animate-in fade-in">
            <span>✅ {photoToast}</span>
            <button onClick={() => setPhotoToast(null)}>✕</button>
          </div>
        )}

        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="relative group cursor-pointer" onClick={() => setShowPhotoModal(true)}>
            <div className="w-24 h-24 rounded-[35px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 relative">
              <img 
                src={currentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f97316&color=fff`} 
                alt={user.name}
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera size={22} />
              </div>
            </div>
            
            {/* BOTÃO DE CÂMERA SOBRE A FOTO */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPhotoModal(true);
              }}
              className="absolute -bottom-1 -right-1 w-9 h-9 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 active:scale-95 transition-all"
              title="Trocar Foto de Perfil"
            >
              <Camera size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="mt-3 text-[9px] font-black uppercase text-orange-600 dark:text-orange-400 hover:underline tracking-wider flex items-center gap-1"
          >
            <Camera size={12} />
            {currentPhoto ? 'Alterar Foto de Perfil' : 'Adicionar Foto de Perfil'}
          </button>

          <h2 className="text-lg font-black text-slate-800 dark:text-white mt-2 uppercase">{user.name}</h2>
          <p className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em]">{user.roleFunction || 'Colaborador'}</p>
          {(user.isTemporary || user.contractType) && (
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-full">
              <span className="text-[10px]">🏷️</span>
              <span className="text-[8px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                {user.contractType || 'Contrato Temporário (Lei 6.019/74)'}
              </span>
            </div>
          )}
        </div>

        {/* DADOS CADASTRAIS */}
        <div className="px-6 space-y-3">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-400 uppercase">Matrícula</p>
             <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{user.matricula || '-'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-400 uppercase">Cargo / Função</p>
             <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{user.roleFunction || '-'}</p>
          </div>
          {(user.contractType || user.isTemporary) && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
              <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">Regime Contratual</p>
              <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{user.contractType || 'Contrato de Trabalho Temporário'}</p>
              {user.contractEndDate && (
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1">
                  Vigência: <span className="font-semibold text-slate-700 dark:text-slate-200">{user.contractEndDate}</span>
                </p>
              )}
            </div>
          )}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-400 uppercase">Jornada de Trabalho</p>
             <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{user.workShift || '08:00 - 12:00 / 14:00 - 18:00'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
             <p className="text-[9px] font-black text-slate-400 uppercase">Empresa</p>
             <p className="text-sm font-black uppercase text-slate-800 dark:text-white">{company?.name || '-'}</p>
          </div>
        </div>

        {/* LEMBRETES DE PONTO */}
        <div className="px-6 pt-6">
          <div className="p-5 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/40 rounded-[32px] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-tight">Lembretes de Batida</h3>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Evita esquecimento de marcações</p>
                </div>
              </div>
              <button 
                onClick={() => handleToggleReminders(!reminderConfig.enabled)}
                className={`w-12 h-7 rounded-full transition-all relative p-1 ${reminderConfig.enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-all ${reminderConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {reminderConfig.enabled && (
              <div className="space-y-3 pt-2 border-t border-orange-200/60 dark:border-orange-800/30">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                    <Clock size={12} className="text-orange-500" /> Lembrar com antecedência de:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { min: 0, label: 'Na hora' },
                      { min: 5, label: '5 min' },
                      { min: 10, label: '10 min' },
                      { min: 15, label: '15 min' },
                    ].map(item => (
                      <button
                        key={item.min}
                        onClick={() => handleChangeMinutes(item.min)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${reminderConfig.minutesBefore === item.min ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border dark:border-slate-800'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 uppercase">
                    <Volume2 size={13} className="text-orange-500" /> Tocar som suave ao alertar
                  </span>
                  <input 
                    type="checkbox" 
                    checked={reminderConfig.sound} 
                    onChange={e => handleToggleSound(e.target.checked)}
                    className="w-4 h-4 text-orange-600 rounded accent-orange-500"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleTestNotification}
                    className="w-full py-2.5 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-2xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                  >
                    <BellRing size={14} />
                    {testSent ? '🔔 Notificação Enviada!' : 'Testar Notificação e Áudio Agora'}
                  </button>

                  <p className="text-[8px] text-slate-400 text-center uppercase tracking-wider">
                    Permissão do Navegador: {notifPermission === 'granted' ? '✅ Ativa e Autorizada' : notifPermission === 'denied' ? '⚠️ Bloqueada nas permissões' : 'ℹ️ Pendente de autorização'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STATUS OFFLINE & SINCRONIZAÇÃO */}
        <div className="px-6 pt-4">
          <div className="p-5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isOnline ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                  {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-tight">
                    {isOnline ? 'Conexão Online' : 'Modo Offline Ativo'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    {isOnline ? 'Sincronização em tempo real ativa' : 'Pontos são gravados no aparelho'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${isOnline ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between border-t dark:border-slate-800 text-[10px]">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                Pontos pendentes no dispositivo:
              </span>
              <span className={`font-black px-2 py-0.5 rounded-lg ${offlineRecords.length > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {offlineRecords.length}
              </span>
            </div>

            {offlineRecords.length > 0 && (
              <button
                onClick={handleSyncOffline}
                disabled={isSyncing || !isOnline}
                className={`w-full py-3 rounded-2xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all ${isOnline ? 'bg-emerald-600 text-white active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando Pontos...' : 'Sincronizar Pontos com a Nuvem'}
              </button>
            )}

            {syncSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[9px] font-black uppercase">
                <CheckCircle2 size={14} />
                <span>{syncSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* AÇÕES DE CONTA */}
        <div className="p-6 space-y-3">
           <button onClick={() => setShowPassModal(true)} className="w-full py-5 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl active:scale-95 transition-all">
             🔒 Alterar Minha Senha de Acesso
           </button>
           <button onClick={() => { if(confirm("Sair do app?")) onLogout(); }} className="w-full py-5 bg-slate-100 dark:bg-slate-900 text-red-600 rounded-[28px] font-black text-xs uppercase active:scale-95 transition-all">
             Sair do Aplicativo
           </button>
        </div>
      </div>

      {showPassModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-10 shadow-2xl space-y-4 border dark:border-slate-800">
              <h2 className="text-sm font-black text-orange-600 text-center uppercase">Trocar Senha</h2>
              <div className="relative w-full">
                <input 
                  type={showPass ? "text" : "password"} 
                  placeholder="NOVA SENHA" 
                  value={newPass} 
                  onChange={e => setNewPass(e.target.value)} 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-black text-center pr-12 text-slate-800 dark:text-white" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setShowPassModal(false)} className="flex-1 py-4 border dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400">Voltar</button>
                 <button onClick={handleUpdatePassword} disabled={loading} className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase">Atualizar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE FOTO DE PERFIL */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[44px] w-full max-w-sm p-8 shadow-2xl space-y-5 border dark:border-slate-800 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm shadow-sm">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">Foto de Perfil</h3>
                  <p className="text-[8px] font-bold text-slate-400">Identificação do Colaborador</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  stopCamera();
                  setShowPhotoModal(false);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {isCameraActive ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black border-2 border-orange-500 shadow-inner">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                  <div className="absolute inset-0 border-2 border-white/20 rounded-full m-8 pointer-events-none border-dashed animate-pulse"></div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={stopCamera}
                    className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={captureFromCamera}
                    disabled={isUploadingPhoto}
                    className="flex-[2] py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Camera size={14} />
                    {isUploadingPhoto ? 'Salvando...' : 'Capturar Foto'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* PREVIEW DA FOTO ATUAL */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-orange-100 dark:border-orange-950 shadow-xl bg-slate-100 dark:bg-slate-800">
                    <img 
                      src={currentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f97316&color=fff`} 
                      alt={user.name}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">
                    {currentPhoto ? 'Foto cadastrada' : 'Nenhuma foto personalizada'}
                  </p>
                </div>

                {/* BOTÕES DE ESCOLHA */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={isUploadingPhoto}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> Tirar Foto com a Câmera
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> Escolher da Galeria / Arquivo
                  </button>

                  {currentPhoto && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto}
                      className="w-full py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} /> Remover Foto (Usar Iniciais)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

