
import React, { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, RefreshCw, Bell, Clock } from 'lucide-react';
import { PointRecord, User } from '../types';
import { getOfflineRecords, syncOfflineRecords, StoredOfflineRecord } from '../utils/offlineStorage';
import { parseWorkSlots, checkAndTriggerPunchReminders, InAppPunchReminder } from '../utils/reminderService';
import { db } from '../firebase';

interface DashboardProps {
  onPunchClick: () => void;
  lastPunch?: PointRecord;
  records?: PointRecord[]; 
  onNavigate: (v: any) => void;
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ onPunchClick, lastPunch, records = [], onNavigate, user }) => {
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRecords, setOfflineRecords] = useState<StoredOfflineRecord[]>(getOfflineRecords());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<InAppPunchReminder | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sincronização automática em segundo plano quando a conexão volta
      handleAutoSync();
    };
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

  const handleAutoSync = async () => {
    const queue = getOfflineRecords();
    if (queue.length === 0) return;
    setIsSyncing(true);
    try {
      const { syncedCount } = await syncOfflineRecords(db);
      setOfflineRecords(getOfflineRecords());
      if (syncedCount > 0) {
        setSyncToast(`${syncedCount} ponto(s) offline sincronizado(s) automaticamente!`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    } catch (e) {
      console.error("Erro na auto-sincronização:", e);
    }
    setIsSyncing(false);
  };

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      alert("Você ainda está sem internet. Conecte-se a uma rede WiFi ou 4G/5G para sincronizar.");
      return;
    }
    setIsSyncing(true);
    try {
      const { syncedCount } = await syncOfflineRecords(db);
      setOfflineRecords(getOfflineRecords());
      if (syncedCount > 0) {
        setSyncToast(`Sucesso! ${syncedCount} marcação(ões) enviada(s) para a nuvem.`);
        setTimeout(() => setSyncToast(null), 4000);
      } else {
        setSyncToast("Todas as marcações já estão sincronizadas.");
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (e) {
      alert("Falha na sincronização.");
    }
    setIsSyncing(false);
  };

  // Monitorar lembretes de batida a cada 20 segundos
  useEffect(() => {
    if (!user || user.isExemptPointControl) return;

    const checkReminders = () => {
      const today = new Date().toDateString();
      const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === today);
      let foundReminder: InAppPunchReminder | null = null;
      checkAndTriggerPunchReminders(user, todayRecords, (rem) => {
        foundReminder = rem;
      });
      setActiveReminder(foundReminder);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, [user, records]);

  const timeline = useMemo(() => {
    const today = new Date().toDateString();
    const todayRecords = records
      .filter(r => new Date(r.timestamp).toDateString() === today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const scheduled = parseWorkSlots(user.workShift);
    const slots = [
      { type: scheduled[0]?.label || 'Entrada', time: scheduled[0]?.time || '08:00', done: false, actual: '', isOffline: false },
      { type: scheduled[1]?.label || 'Intervalo', time: scheduled[1]?.time || '12:00', done: false, actual: '', isOffline: false },
      { type: scheduled[2]?.label || 'Retorno', time: scheduled[2]?.time || '13:00', done: false, actual: '', isOffline: false },
      { type: scheduled[3]?.label || 'Saída', time: scheduled[3]?.time || '17:00', done: false, actual: '', isOffline: false },
    ];

    todayRecords.forEach((rec, idx) => {
      if (slots[idx]) {
        slots[idx].done = true;
        slots[idx].actual = new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        slots[idx].isOffline = Boolean(rec.isOffline);
      }
    });

    return slots;
  }, [records, user.workShift]);

  const alerts = useMemo(() => {
    const today = new Date().toDateString();
    const todayRecords = records.filter(r => new Date(r.timestamp).toDateString() === today);
    const currentHour = new Date().getHours();
    
    const messages = [];

    if (todayRecords.length === 1 && currentHour >= 13) {
      messages.push({ id: 'missed_lunch', text: 'Você esqueceu de registrar o início do intervalo?', type: 'warning' });
    }
    if (todayRecords.length === 3 && currentHour >= 19) {
      messages.push({ id: 'missed_exit', text: 'Não esqueça de registrar sua saída hoje!', type: 'info' });
    }

    return messages;
  }, [records]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 space-y-6 pb-36 overflow-y-auto no-scrollbar">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Olá, {user.name.split(' ')[0]} 👋</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Painel de Ponto</h2>
          {user.isExemptPointControl && (
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
              👑 Cargo de Gerência
            </span>
          )}
        </div>
      </div>

      {/* BANNER MODO OFFLINE */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-base shadow-sm">
              <WifiOff size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Modo Ponto Offline Ativo
              </p>
              <p className="text-[9px] font-bold text-amber-700/80 dark:text-amber-400/80">
                Você pode registrar seu ponto normalmente. As marcações serão gravadas no aparelho e sincronizadas automaticamente assim que o sinal voltar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BANNER BATIDAS OFFLINE PENDENTES DE SINCRONIZAÇÃO */}
      {offlineRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 p-4 rounded-3xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                {offlineRecords.length} marcação(ões) pendente(s) de envio
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">
                {isOnline ? 'Conexão disponível para envio imediato' : 'Aguardando conexão com a internet'}
              </p>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className={`px-4 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all ${isOnline ? 'bg-orange-600 text-white active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Enviando...' : 'Sincronizar'}
          </button>
        </div>
      )}

      {/* TOAST DE SINCRONIZAÇÃO */}
      {syncToast && (
        <div className="p-4 bg-emerald-500 text-white rounded-3xl shadow-lg flex items-center justify-between text-[10px] font-black uppercase tracking-wider animate-in fade-in">
          <span>✅ {syncToast}</span>
          <button onClick={() => setSyncToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* LEMBRETE INTELIGENTE DE PONTO */}
      {activeReminder && (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-5 rounded-[32px] shadow-xl shadow-orange-500/20 flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl text-white shadow-inner">
              <Bell size={22} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/25 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                  Lembrete de Horário
                </span>
                <span className="text-[10px] font-black opacity-90">{activeReminder.scheduledTime}</span>
              </div>
              <p className="text-xs font-black uppercase tracking-tight mt-0.5">
                {activeReminder.slotLabel}: {activeReminder.minutesLeft === 0 ? 'Horário atingido agora!' : `Faltam ${activeReminder.minutesLeft} minuto(s)`}
              </p>
              <p className="text-[9px] font-bold text-white/80">
                Evite atrasos registrando sua marcação no horário correto.
              </p>
            </div>
          </div>
          <button 
            onClick={onPunchClick}
            className="bg-white text-orange-600 px-4 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-wider shadow-lg active:scale-95 transition-all whitespace-nowrap"
          >
            Registrar Já
          </button>
        </div>
      )}

      {user.isExemptPointControl && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 p-4 rounded-3xl flex items-start gap-3 text-purple-900 dark:text-purple-200 animate-in fade-in">
          <span className="text-2xl">👑</span>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">
              Dispensado de Controle de Jornada (Art. 62, II da CLT)
            </p>
            <p className="text-[9px] font-bold opacity-80 leading-relaxed">
              Você ocupa cargo de gerência/confiança. O registro de horários é facultativo e não há desconto de banco de horas ou faltas.
            </p>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-3xl flex items-center gap-3 animate-in slide-in-from-top-4 ${alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30'}`}>
              <span className="text-lg">{alert.type === 'warning' ? '⚠️' : '🔔'}</span>
              <p className="text-[10px] font-black uppercase tracking-wider">{alert.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[44px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[42px] font-black text-slate-800 dark:text-white tracking-tighter leading-none">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(time)}
          </p>
        </div>

        <button 
          onClick={onPunchClick}
          className="w-48 h-48 rounded-full bg-orange-500 p-2 shadow-2xl shadow-orange-200 dark:shadow-none relative group active:scale-90 transition-all"
        >
          <div className="w-full h-full rounded-full border-4 border-white/20 flex flex-col items-center justify-center text-white space-y-1">
            <span className="text-4xl">☝️</span>
            <span className="text-[11px] font-black uppercase tracking-widest">
              {!isOnline ? 'Registrar Ponto' : 'Registrar'}
            </span>
            <span className="text-[10px] font-bold opacity-60 uppercase">
              {!isOnline ? 'Modo Offline' : 'Ponto Agora'}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20 -z-10"></div>
        </button>

        <div className="flex gap-4 w-full pt-4">
           <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Horária</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{user.workShift || '08:00h'}</p>
           </div>
           <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-3xl text-center">
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Saldo Atual</p>
              <p className="text-sm font-black text-emerald-600">+00:15h</p>
           </div>
        </div>
      </div>

      {/* NOVO CARD CENTRAL DE JUSTIFICATIVA */}
      <div onClick={() => onNavigate('requests')} className="bg-orange-600 p-6 rounded-[35px] shadow-lg shadow-orange-200 dark:shadow-none flex items-center justify-between group active:scale-95 transition-all cursor-pointer">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl text-white">📝</div>
            <div>
               <p className="text-[11px] font-black text-white uppercase tracking-widest">Justificativa para o RH</p>
               <p className="text-[9px] font-bold text-white/70 uppercase">Faltas, Atestados ou Ajustes</p>
            </div>
         </div>
         <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Linha do Tempo - Hoje</p>
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 top-4 -z-0"></div>
          {timeline.map((rec, i) => (
            <div key={i} className="flex flex-col items-center space-y-3 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all ${rec.done ? 'bg-orange-500 border-orange-50 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 text-slate-300'}`}>
                {rec.done ? <span className="text-[10px]">✓</span> : <span className="text-[8px] font-black">{i+1}</span>}
              </div>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase ${rec.done ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{rec.type}</p>
                <p className={`text-[10px] font-bold ${rec.done ? 'text-orange-600' : 'text-slate-400'}`}>
                  {rec.done ? rec.actual : rec.time}
                </p>
                {rec.isOffline && (
                  <span className="text-[7px] font-black text-amber-500 uppercase block">Offline</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

