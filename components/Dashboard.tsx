
import React, { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, RefreshCw, Bell, Clock, ShieldCheck, X, AlertTriangle, CheckCircle2, Fingerprint, Building2, Check } from 'lucide-react';
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
  const [showOfflineModal, setShowOfflineModal] = useState(false);

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
    setIsSyncing(true);
    try {
      const { syncedCount } = await syncOfflineRecords(db);
      const queue = getOfflineRecords();
      setOfflineRecords(queue);
      if (syncedCount > 0) {
        setSyncToast(`Sucesso! ${syncedCount} marcação(ões) enviada(s) para a nuvem da empresa.`);
        setTimeout(() => setSyncToast(null), 4000);
        setShowOfflineModal(false);
      } else if (queue.length > 0) {
        // Ainda possui marcações pendentes de envio
        setShowOfflineModal(true);
      } else {
        setSyncToast("Todas as suas marcações já estão sincronizadas na nuvem.");
        setTimeout(() => setSyncToast(null), 3000);
      }
    } catch (e) {
      console.warn("Falha ao sincronizar marcações offline:", e);
      setShowOfflineModal(true);
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
      { type: 'ENTRADA', time: scheduled[0]?.time || '08:00', done: false, actual: '', isOffline: false, icon: 'clock' },
      { type: 'INTERVALO', time: scheduled[1]?.time || '12:00', done: false, actual: '', isOffline: false, icon: 'clock' },
      { type: 'RETORNO', time: scheduled[2]?.time || '13:00', done: false, actual: '', isOffline: false, icon: 'clock' },
      { type: 'FIM DO EXPEDIENTE', time: scheduled[3]?.time || '17:00', done: false, actual: '', isOffline: false, icon: 'building' },
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

  const currentBalance = useMemo(() => {
    if (user.isExemptPointControl) return { text: 'Dispensado', isPositive: true, subtext: 'Cargo de Confiança' };

    const today = new Date().toDateString();
    const todayRecords = records
      .filter(r => new Date(r.timestamp).toDateString() === today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let workedMin = 0;
    if (todayRecords.length >= 2) {
      const e1 = new Date(todayRecords[0].timestamp).getTime();
      const s1 = new Date(todayRecords[1].timestamp).getTime();
      workedMin += Math.max(0, Math.floor((s1 - e1) / 60000));
    }
    if (todayRecords.length >= 4) {
      const e2 = new Date(todayRecords[2].timestamp).getTime();
      const s2 = new Date(todayRecords[3].timestamp).getTime();
      workedMin += Math.max(0, Math.floor((s2 - e2) / 60000));
    }

    const expectedDailyMin = user.hoursPerWeek ? Math.floor((user.hoursPerWeek / 5) * 60) : 480;

    if (todayRecords.length >= 4) {
      const diff = workedMin - expectedDailyMin;
      const sign = diff >= 0 ? '+' : '-';
      const absH = Math.floor(Math.abs(diff) / 60);
      const absM = Math.abs(diff) % 60;
      return {
        text: `${sign}${String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}h`,
        isPositive: diff >= 0,
        subtext: diff >= 0 ? 'Horas Extras' : 'A Compensar'
      };
    }

    if (workedMin > 0) {
      const hours = Math.floor(workedMin / 60);
      const mins = workedMin % 60;
      return {
        text: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}h`,
        isPositive: true,
        subtext: 'Trabalhado Hoje'
      };
    }

    return { text: '+00:00h', isPositive: true, subtext: 'Banco de Horas' };
  }, [records, user]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-1.5 sm:p-4 space-y-2.5 sm:space-y-4 pb-28 sm:pb-32 overflow-y-auto no-scrollbar">
      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Olá, {user.name.split(' ')[0]} 👋</p>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Painel de Ponto</h2>
          {user.isExemptPointControl && (
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-lg text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1">
              👑 Cargo de Gerência
            </span>
          )}
        </div>
      </div>

      {/* BANNER MODO OFFLINE */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex items-center justify-between animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center text-sm sm:text-base shadow-sm shrink-0">
              <WifiOff size={16} />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Modo Ponto Offline Ativo
              </p>
              <p className="text-[8px] sm:text-[9px] font-bold text-amber-700/80 dark:text-amber-400/80 line-clamp-2">
                Suas batidas são salvas com segurança no aparelho e sincronizadas com o RH assim que o sinal voltar.
              </p>
            </div>
          </div>
          {offlineRecords.length > 0 && (
            <button
              onClick={() => setShowOfflineModal(true)}
              className="ml-2 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[8.5px] font-black uppercase shrink-0 active:scale-95 shadow-sm"
            >
              Fila ({offlineRecords.length})
            </button>
          )}
        </div>
      )}

      {/* BANNER BATIDAS OFFLINE PENDENTES DE SINCRONIZAÇÃO */}
      {offlineRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/60 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">
                {offlineRecords.length} marcação(ões) offline no aparelho
              </p>
              <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase">
                {isOnline ? 'Pronto para sincronização na nuvem' : 'Salvo no dispositivo (Portaria 671 MTP)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowOfflineModal(true)}
              className="px-2 py-1 text-[8.5px] font-black uppercase text-amber-600 dark:text-amber-400 hover:underline"
            >
              Fila
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl font-black text-[8.5px] uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all bg-orange-600 hover:bg-orange-700 text-white active:scale-95"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Enviando...' : 'Sincronizar'}
            </button>
          </div>
        </div>
      )}

      {/* TOAST DE SINCRONIZAÇÃO */}
      {syncToast && (
        <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-md flex items-center justify-between text-[9px] font-black uppercase tracking-wider animate-in fade-in">
          <span>✅ {syncToast}</span>
          <button onClick={() => setSyncToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* LEMBRETE INTELIGENTE DE PONTO */}
      {activeReminder && (
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-[28px] shadow-lg shadow-orange-500/15 flex items-center justify-between animate-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg text-white shadow-inner shrink-0">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-white/25 px-2 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider">
                  Lembrete
                </span>
                <span className="text-[9px] font-black opacity-90">{activeReminder.scheduledTime}</span>
              </div>
              <p className="text-[11px] font-black uppercase tracking-tight mt-0.5">
                {activeReminder.slotLabel}: {activeReminder.minutesLeft === 0 ? 'Horário atingido agora!' : `Faltam ${activeReminder.minutesLeft} min`}
              </p>
            </div>
          </div>
          <button 
            onClick={onPunchClick}
            className="bg-white text-orange-600 px-3 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-wider shadow-md active:scale-95 transition-all whitespace-nowrap"
          >
            Registrar
          </button>
        </div>
      )}

      {user.isExemptPointControl && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 p-3 rounded-2xl flex items-start gap-2.5 text-purple-900 dark:text-purple-200 animate-in fade-in">
          <span className="text-xl">👑</span>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">
              Dispensado de Controle de Jornada (Art. 62, II da CLT)
            </p>
            <p className="text-[8px] font-bold opacity-80 leading-relaxed">
              Cargo de confiança: registro facultativo sem desconto de banco de horas ou faltas.
            </p>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-3 rounded-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3 ${alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/30' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30'}`}>
              <span className="text-base">{alert.type === 'warning' ? '⚠️' : '🔔'}</span>
              <p className="text-[9px] font-black uppercase tracking-wider">{alert.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* BLOCO PRINCIPAL COMPACTO PARA CABER PERFEITAMENTE NO CELULAR */}
      <div className="bg-white dark:bg-slate-900 rounded-[30px] sm:rounded-[40px] p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-3.5 sm:space-y-4">
        {/* Relógio e Data */}
        <div className="text-center space-y-1">
          <p className="text-[38px] sm:text-[44px] font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(time)}
          </p>
        </div>

        {/* 1. Botão Registrar com a Digital (Conforme a foto) */}
        <button 
          onClick={onPunchClick}
          className="w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-gradient-to-b from-orange-500 via-orange-500 to-orange-600 p-2 shadow-2xl shadow-orange-500/35 relative group active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-full h-full rounded-full border-[3.5px] border-white/20 flex flex-col items-center justify-center text-white space-y-1">
            <Fingerprint size={42} strokeWidth={1.8} className="text-white drop-shadow-sm transition-transform group-hover:scale-105" />
            <div className="text-center leading-tight mt-0.5">
              <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-wider block text-white drop-shadow-xs">
                Registrar
              </span>
              <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-wider block text-white drop-shadow-xs">
                Ponto
              </span>
            </div>
            <span className="text-[8.5px] sm:text-[9px] font-bold text-orange-100 uppercase tracking-widest opacity-90 pt-0.5">
              {!isOnline ? 'Modo Offline' : 'Ponto Agora'}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-15 -z-10"></div>
        </button>

        {/* 2. LINHA DO TEMPO - HOJE (Abaixo do botão Registrar) */}
        <div className="w-full pt-3 pb-0.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Linha do Tempo - Hoje
            </p>
            <span className="text-[7.5px] sm:text-[8px] font-black text-orange-700 bg-orange-100/70 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-full uppercase">
              {timeline.filter(t => t.done).length} de {timeline.length} Registros
            </span>
          </div>
          <div className="flex justify-between items-center relative px-1 sm:px-2">
            <div className="absolute left-5 right-5 h-0.5 bg-slate-100 dark:bg-slate-800 top-3.5 -z-0"></div>
            {timeline.map((rec, i) => {
              const doneCount = timeline.filter(t => t.done).length;
              const isLatestDone = rec.done && i === doneCount - 1 && doneCount > 1;

              return (
                <div key={i} className="flex flex-col items-center space-y-1.5 relative z-10">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    rec.done 
                      ? isLatestDone
                        ? 'bg-orange-500 border-orange-200 text-white shadow-sm'
                        : 'bg-emerald-500 border-emerald-100 text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 shadow-2xs'
                  }`}>
                    {rec.done ? (
                      <Check size={14} strokeWidth={3} />
                    ) : rec.icon === 'building' ? (
                      <Building2 size={13} strokeWidth={2} />
                    ) : (
                      <Clock size={13} strokeWidth={2} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-[7.5px] sm:text-[8px] font-black uppercase leading-tight ${rec.done ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                      {rec.type}
                    </p>
                    <p className={`text-[9px] sm:text-[10px] font-mono font-bold leading-tight ${rec.done ? 'text-slate-700 dark:text-slate-300 font-black' : 'text-slate-400'}`}>
                      {rec.done ? rec.actual : rec.time}
                    </p>
                    {rec.isOffline && (
                      <span className="text-[6.5px] font-black text-amber-500 uppercase block">Offline</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. SALDO ATUAL (Abaixo da Linha do Tempo) */}
        <div className="w-full pt-1">
          <div className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between border ${
            currentBalance.isPositive 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' 
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                currentBalance.isPositive 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-rose-500 text-white'
              }`}>
                ⏱️
              </div>
              <div className="text-left">
                <p className={`text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider ${
                  currentBalance.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  Saldo Atual de Horas
                </p>
                <p className={`text-[7.5px] sm:text-[8px] font-bold uppercase ${
                  currentBalance.isPositive ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'
                }`}>
                  {currentBalance.subtext}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                currentBalance.isPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
              }`}>
                {currentBalance.text}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE FILA DE PONTOS OFFLINE COM STATUS E BOTÃO DE RECONEXÃO */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white">
                    Fila de Ponto Offline
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400">Portaria 671 MTP - REP-P</p>
                </div>
              </div>
              <button onClick={() => setShowOfflineModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-1">
              <p className="text-[9px] font-black uppercase text-amber-800 dark:text-amber-300">
                🔒 Seus registros estão 100% seguros
              </p>
              <p className="text-[8px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                As marcações foram assinadas com carimbo digital criptografado e salvas no aparelho. Assim que restabelecer a conexão (Wi-Fi ou 4G/5G), elas sobem automaticamente para o sistema do RH.
              </p>
            </div>

            {/* LISTA DAS BATIDAS PENDENTES */}
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
              {offlineRecords.map((rec, i) => (
                <div key={rec.id || i} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-white uppercase">
                      <span>{rec.type === 'entrada' ? '🟢 Entrada' : rec.type === 'saida' ? '🔴 Saída' : '🟡 Intervalo'}</span>
                      <span className="text-orange-500 font-mono">
                        {new Date(rec.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[8px] font-mono text-slate-400 truncate max-w-[180px]">
                      {rec.digitalSignature}
                    </p>
                  </div>
                  <span className="text-[8px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                    Aguardando Sinal
                  </span>
                </div>
              ))}

              {offlineRecords.length === 0 && (
                <p className="text-center text-[10px] text-slate-400 py-4 font-bold uppercase">
                  Nenhuma batida pendente na fila local.
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Testando Conexão e Enviando...' : 'Testar Conexão e Sincronizar Agora'}
              </button>
              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[9px] font-black uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

