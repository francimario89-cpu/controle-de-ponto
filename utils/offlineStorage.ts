import { PointRecord } from '../types';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

const OFFLINE_QUEUE_KEY = 'pontoexato_offline_queue';
const LAST_SYNC_KEY = 'pontoexato_last_sync_time';

export interface StoredOfflineRecord {
  id: string;
  uniqueId: string; // Anti-duplicidade: PONTO-20260929-0802-8F72A
  userName: string;
  matricula: string;
  timestamp: string; // ISO string for safe storage
  address: string;
  latitude: number;
  longitude: number;
  photo: string;
  status: 'pending';
  digitalSignature: string;
  type: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo';
  companyCode: string;
  mood?: string;
  isOffline: true;
  offlineSavedAt: string;
}

/**
 * Gera um ID único inviolável para proteção contra duplicidade (Idempotência)
 * Exemplo: PONTO-20260929-0802-8F72A
 */
export function generatePunchId(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const randomHex = Math.random().toString(16).substring(2, 7).toUpperCase();
  
  return `PONTO-${yyyy}${mm}${dd}-${hh}${min}-${randomHex}`;
}

/**
 * Retorna a data e hora da última sincronização bem-sucedida
 */
export function getLastSyncTime(): string {
  try {
    const saved = localStorage.getItem(LAST_SYNC_KEY);
    if (saved) return saved;
    return new Date().toLocaleDateString('pt-BR') + ' — ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recente';
  }
}

/**
 * Atualiza o carimbo da última sincronização realizada
 */
export function setLastSyncTime(date: Date = new Date()) {
  try {
    const formatted = date.toLocaleDateString('pt-BR') + ' — ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem(LAST_SYNC_KEY, formatted);
  } catch (e) {
    console.error('Erro ao salvar timestamp de sincronização:', e);
  }
}

/**
 * Retorna todos os registros salvos offline no dispositivo
 */
export function getOfflineRecords(): StoredOfflineRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler fila offline:', e);
    return [];
  }
}

/**
 * Salva uma nova batida de ponto offline no dispositivo com ID único anti-duplicidade
 */
export function saveOfflineRecord(record: {
  userName: string;
  matricula: string;
  timestamp?: Date;
  address: string;
  latitude: number;
  longitude: number;
  photo: string;
  digitalSignature?: string;
  uniqueId?: string;
  type?: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo';
  companyCode: string;
  mood?: string;
}): PointRecord {
  const currentQueue = getOfflineRecords();
  const date = record.timestamp || new Date();
  const uniqueId = record.uniqueId || generatePunchId(date);
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const signature = record.digitalSignature || `PX-${record.matricula || 'EMP'}-${uniqueId}`;

  const storedItem: StoredOfflineRecord = {
    id,
    uniqueId,
    userName: record.userName,
    matricula: record.matricula,
    timestamp: date.toISOString(),
    address: record.address.includes('Offline') ? record.address : `${record.address} (Gravado Offline)`,
    latitude: record.latitude,
    longitude: record.longitude,
    photo: record.photo,
    status: 'pending',
    digitalSignature: signature,
    type: record.type || 'entrada',
    companyCode: record.companyCode,
    mood: record.mood,
    isOffline: true,
    offlineSavedAt: new Date().toISOString(),
  };

  currentQueue.push(storedItem);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));

  // Dispara evento para atualização instantânea na interface
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pontoexato_offline_change', {
      detail: { count: currentQueue.length, latest: storedItem }
    }));
  }

  return {
    ...storedItem,
    timestamp: date,
  };
}

/**
 * Remove um registro específico da fila após sincronização bem-sucedida
 */
export function removeOfflineRecord(id: string) {
  try {
    const currentQueue = getOfflineRecords();
    const updated = currentQueue.filter(r => r.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pontoexato_offline_change', {
        detail: { count: updated.length }
      }));
    }
  } catch (e) {
    console.error('Erro ao remover registro offline:', e);
  }
}

/**
 * Limpa todos os registros offline da fila
 */
export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pontoexato_offline_change', { detail: { count: 0 } }));
  }
}

/**
 * Sincroniza todos os registros da fila offline com o banco de dados Firebase
 * Enforce idempotência e proteção contra duplicação: se o uniqueId já existir no banco, descarta a duplicação.
 */
export async function syncOfflineRecords(
  db: any,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<{ syncedCount: number; errors: number; total: number }> {
  const queue = getOfflineRecords();
  const total = queue.length;
  if (total === 0) {
    setLastSyncTime(new Date());
    return { syncedCount: 0, errors: 0, total: 0 };
  }

  let syncedCount = 0;
  let errors = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    try {
      // 1. PROTEÇÃO CONTRA DUPLICIDADE:
      // Verifica se já existe um registro gravado com este uniqueId no Firestore
      let alreadyExists = false;
      try {
        const checkQuery = query(
          collection(db, "records"),
          where("uniqueId", "==", item.uniqueId)
        );
        const checkSnap = await getDocs(checkQuery);
        if (!checkSnap.empty) {
          alreadyExists = true;
        }
      } catch (err) {
        // Se a query falhar ou regras restringirem, prossegue com segurança
      }

      if (!alreadyExists) {
        const docPayload = {
          uniqueId: item.uniqueId,
          userName: item.userName,
          matricula: item.matricula,
          timestamp: new Date(item.timestamp),
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
          photo: item.photo,
          status: 'synchronized',
          digitalSignature: item.digitalSignature,
          type: item.type,
          companyCode: item.companyCode,
          mood: item.mood || 'feliz',
          isOffline: true,
          offlineSavedAt: item.offlineSavedAt,
          syncedAt: new Date(),
        };

        await addDoc(collection(db, "records"), docPayload);
      }

      // Remove da fila local
      removeOfflineRecord(item.id);
      syncedCount++;

      // Atualiza progresso
      if (onProgress) {
        const pct = Math.round(((i + 1) / total) * 100);
        onProgress(pct, i + 1, total);
      }
    } catch (err) {
      console.error(`Falha ao sincronizar registro offline ${item.id}:`, err);
      errors++;
    }
  }

  // Registra timestamp da sincronização
  setLastSyncTime(new Date());

  // Reporta status do dispositivo para painel administrativo do RH
  if (queue[0]) {
    try {
      const remainingQueue = getOfflineRecords();
      const statusDocRef = doc(db, "device_sync_status", `${queue[0].companyCode}_${queue[0].matricula}`);
      await setDoc(statusDocRef, {
        userName: queue[0].userName,
        matricula: queue[0].matricula,
        companyCode: queue[0].companyCode,
        lastSyncAt: new Date().toISOString(),
        pendingCount: remainingQueue.length,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web App',
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        status: remainingQueue.length > 0 ? 'pending' : 'online',
        updatedAt: new Date()
      }, { merge: true });
    } catch (e) {
      // Ignora erro de status se offline
    }
  }

  return { syncedCount, errors, total };
}
