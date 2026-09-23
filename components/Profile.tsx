
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Bell, BellRing, Wifi, WifiOff, RefreshCw, CheckCircle2, Volume2, Clock } from 'lucide-react';
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
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-24 h-24 rounded-[35px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800">
            <img src={user.photo || `https://ui-avatars.com/api/?name=${user.name}&background=f97316&color=fff`} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mt-4 uppercase">{user.name}</h2>
          <p className="text-orange-600 text-[10px] font-black uppercase tracking-[0.2em]">{user.roleFunction || 'Colaborador'}</p>
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
    </div>
  );
};

export default Profile;

