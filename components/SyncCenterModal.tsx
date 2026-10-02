import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, X, ArrowUpCircle, Clock } from 'lucide-react';
import { StoredOfflineRecord, getOfflineRecords, syncOfflineRecords, getLastSyncTime } from '../utils/offlineStorage';
import { db } from '../firebase';

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncCompleted?: (count: number) => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({ isOpen, onClose, onSyncCompleted }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineRecords, setOfflineRecords] = useState<StoredOfflineRecord[]>(getOfflineRecords());
  const [lastSync, setLastSync] = useState(getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => {
      setOfflineRecords(getOfflineRecords());
      setLastSync(getLastSyncTime());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pontoexato_offline_change', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pontoexato_offline_change', handleQueueChange);
    };
  }, []);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncMessage("Verificando conexão com o servidor...");

    try {
      const { syncedCount, errors, total } = await syncOfflineRecords(db, (pct, current, count) => {
        setSyncProgress(pct);
        setSyncMessage(`Enviando registro ${current} de ${count}...`);
      });

      setSyncProgress(100);
      const remaining = getOfflineRecords();
      setOfflineRecords(remaining);
      setLastSync(getLastSyncTime());

      if (syncedCount > 0) {
        setSyncMessage(`✅ ${syncedCount} ponto(s) sincronizado(s) com sucesso!`);
        if (onSyncCompleted) onSyncCompleted(syncedCount);
      } else if (remaining.length === 0) {
        setSyncMessage("🟢 Todos os pontos já estão sincronizados!");
      } else {
        setSyncMessage("⚠️ Sem sinal de internet. Conecte-se para concluir o envio.");
      }
    } catch (e) {
      setSyncMessage("Falha ao comunicar com o servidor.");
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = offlineRecords.length;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[36px] w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md">
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                Sincronização de Ponto
              </h2>
              <p className="text-[9px] font-bold text-slate-400">Fila Local & Conectividade em Nuvem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        {/* STATUS DA CONEXÃO & ÚLTIMA SINCRONIZAÇÃO */}
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border dark:border-slate-700/60 space-y-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Status da Conexão</p>
            <div className="flex items-center gap-1.5 font-black">
              {isOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-600 dark:text-emerald-400 uppercase">🟢 Online</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-rose-600 dark:text-rose-400 uppercase">🔴 Sem Internet</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border dark:border-slate-700/60 space-y-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Última Sincronização</p>
            <p className="font-black text-slate-800 dark:text-white font-mono text-[9px] truncate">
              {lastSync}
            </p>
          </div>
        </div>

        {/* STATUS GERAL DE PENDÊNCIA */}
        {pendingCount === 0 ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider">
                🟢 0 Registros Pendentes
              </p>
              <p className="text-[9px] font-medium opacity-80">
                Todas as suas marcações estão 100% sincronizadas com a nuvem do RH.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 rounded-2xl space-y-1 text-amber-900 dark:text-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">
                🟠 Sincronização Pendente
              </span>
              <span className="text-[8px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full font-black uppercase">
                {pendingCount} aguardando envio
              </span>
            </div>
            <p className="text-[8px] font-medium opacity-90 leading-relaxed">
              Os registros estão salvos com segurança neste aparelho e protegidos contra perda. Assim que houver sinal, a sincronização é automática.
            </p>
          </div>
        )}

        {/* BARRA DE PROGRESSO (SE ESTIVER SINCRONIZANDO) */}
        {isSyncing && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-orange-700 dark:text-orange-300">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> {syncMessage || 'Sincronizando pontos...'}
              </span>
              <span className="font-mono">{syncProgress}%</span>
            </div>
            <div className="w-full bg-orange-200 dark:bg-orange-950 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-orange-600 h-full transition-all duration-300 rounded-full" 
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* FEEDBACK MENSAGEM */}
        {syncMessage && !isSyncing && (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center text-[10px] font-bold text-slate-800 dark:text-white">
            {syncMessage}
          </div>
        )}

        {/* TABELA DE REGISTROS NA FILA LOCAL */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 max-h-56">
          <div className="flex justify-between items-center px-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              Fila Local no Dispositivo ({pendingCount})
            </span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">ID Único Inviolável</span>
          </div>

          {offlineRecords.map((item) => {
            const dateObj = new Date(item.timestamp);
            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const typeLabel = item.type === 'entrada' ? 'Entrada' : item.type === 'saida' ? 'Saída' : 'Intervalo';

            return (
              <div 
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border dark:border-slate-700/60 flex items-center justify-between text-[10px]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{dateStr}</span>
                    <span className="font-black text-slate-900 dark:text-white font-mono text-xs">{timeStr}</span>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase">
                      {typeLabel}
                    </span>
                  </div>
                  <p className="text-[8px] font-mono text-slate-400 truncate max-w-[210px]" title={item.uniqueId}>
                    🔐 {item.uniqueId}
                  </p>
                </div>

                <span className="text-[8px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-black uppercase shrink-0">
                  🟠 Pendente
                </span>
              </div>
            );
          })}

          {pendingCount === 0 && (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-1.5 opacity-60">
              <ShieldCheck size={28} />
              <p className="text-[9px] font-black uppercase tracking-wider">
                Fila vazia • Nenhum registro pendente
              </p>
            </div>
          )}
        </div>

        {/* INFORMAÇÃO DE SEGURANÇA E DEDICAÇÃO DE ID */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-[8px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <ShieldCheck size={12} className="text-orange-500" /> Proteção Anti-Duplicidade
          </p>
          <p className="leading-relaxed">
            Cada marcação recebe um código único que impede envios duplicados caso haja oscilações de sinal no momento da sincronização.
          </p>
        </div>

        {/* BOTÃO PRINCIPAL DE SINCRONIZAR */}
        <div className="pt-1 flex flex-col gap-2">
          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Sincronizando Pontos...' : (pendingCount > 0 ? `Sincronizar Agora (${pendingCount})` : 'Verificar Sincronização')}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-[9px] font-black uppercase tracking-wider"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
