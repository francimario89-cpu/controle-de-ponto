import { PointRecord } from '../types';
import { collection, addDoc } from 'firebase/firestore';

const OFFLINE_QUEUE_KEY = 'pontoexato_offline_queue';

export interface StoredOfflineRecord {
  id: string;
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
 * Salva uma nova batida de ponto offline no dispositivo
 */
export function saveOfflineRecord(record: {
  userName: string;
  matricula: string;
  timestamp?: Date;
  address: string;
  latitude: number;
  longitude: number;
  photo: string;
  digitalSignature: string;
  type?: 'entrada' | 'saida' | 'inicio_intervalo' | 'fim_intervalo';
  companyCode: string;
  mood?: string;
}): PointRecord {
  const currentQueue = getOfflineRecords();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const date = record.timestamp || new Date();

  const storedItem: StoredOfflineRecord = {
    id,
    userName: record.userName,
    matricula: record.matricula,
    timestamp: date.toISOString(),
    address: record.address.includes('Offline') ? record.address : `${record.address} (Gravado Offline)`,
    latitude: record.latitude,
    longitude: record.longitude,
    photo: record.photo,
    status: 'pending',
    digitalSignature: record.digitalSignature,
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
 */
export async function syncOfflineRecords(db: any): Promise<{ syncedCount: number; errors: number }> {
  const queue = getOfflineRecords();
  if (queue.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      const docPayload = {
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
      removeOfflineRecord(item.id);
      syncedCount++;
    } catch (err) {
      console.error(`Falha ao sincronizar registro offline ${item.id}:`, err);
      errors++;
    }
  }

  return { syncedCount, errors };
}
