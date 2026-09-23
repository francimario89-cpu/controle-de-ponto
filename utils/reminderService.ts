import { PointRecord, User } from '../types';

const REMINDERS_CONFIG_KEY = 'pontoexato_reminders_config';

export interface ReminderConfig {
  enabled: boolean;
  minutesBefore: number; // 0, 5, 10, 15
  sound: boolean;
}

export interface WorkSlot {
  type: 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida';
  label: string;
  time: string; // "HH:MM"
  hour: number;
  minute: number;
}

export interface InAppPunchReminder {
  id: string;
  slotLabel: string;
  scheduledTime: string;
  minutesLeft: number;
}

/**
 * Retorna as configurações de lembrete do colaborador
 */
export function getReminderConfig(): ReminderConfig {
  try {
    const raw = localStorage.getItem(REMINDERS_CONFIG_KEY);
    if (!raw) {
      return { enabled: true, minutesBefore: 5, sound: true };
    }
    return { enabled: true, minutesBefore: 5, sound: true, ...JSON.parse(raw) };
  } catch {
    return { enabled: true, minutesBefore: 5, sound: true };
  }
}

/**
 * Salva as configurações de lembrete
 */
export function saveReminderConfig(config: Partial<ReminderConfig>) {
  const current = getReminderConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(REMINDERS_CONFIG_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pontoexato_reminders_change', { detail: updated }));
  }
}

/**
 * Toca um sinal sonoro suave via Web Audio API (sem dependência de arquivos externos)
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tom 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Tom 2 (harmonioso ascendente)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio pode ser bloqueado se não houver interação prévia
  }
}

/**
 * Solicita permissão nativa para notificações do navegador
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

/**
 * Extrai os 4 horários da jornada do colaborador
 */
export function parseWorkSlots(workShift?: string): WorkSlot[] {
  const defaultSlots: WorkSlot[] = [
    { type: 'entrada', label: 'Entrada', time: '08:00', hour: 8, minute: 0 },
    { type: 'inicio_intervalo', label: 'Início do Intervalo', time: '12:00', hour: 12, minute: 0 },
    { type: 'fim_intervalo', label: 'Retorno do Intervalo', time: '13:00', hour: 13, minute: 0 },
    { type: 'saida', label: 'Fim do Expediente', time: '17:00', hour: 17, minute: 0 },
  ];

  if (!workShift) return defaultSlots;

  // Tenta extrair padrões de horário (ex: "08:00 - 12:00 / 14:00 - 18:00" ou "08:00 - 18:00")
  const times = workShift.match(/\b\d{2}:\d{2}\b/g);
  if (!times || times.length === 0) return defaultSlots;

  if (times.length === 4) {
    return [
      { type: 'entrada', label: 'Entrada', time: times[0], hour: parseInt(times[0].slice(0, 2)), minute: parseInt(times[0].slice(3, 5)) },
      { type: 'inicio_intervalo', label: 'Início do Intervalo', time: times[1], hour: parseInt(times[1].slice(0, 2)), minute: parseInt(times[1].slice(3, 5)) },
      { type: 'fim_intervalo', label: 'Retorno do Intervalo', time: times[2], hour: parseInt(times[2].slice(0, 2)), minute: parseInt(times[2].slice(3, 5)) },
      { type: 'saida', label: 'Fim do Expediente', time: times[3], hour: parseInt(times[3].slice(0, 2)), minute: parseInt(times[3].slice(3, 5)) },
    ];
  }

  if (times.length === 2) {
    const h1 = parseInt(times[0].slice(0, 2));
    const m1 = parseInt(times[0].slice(3, 5));
    const h2 = parseInt(times[1].slice(0, 2));
    const m2 = parseInt(times[1].slice(3, 5));

    return [
      { type: 'entrada', label: 'Entrada', time: times[0], hour: h1, minute: m1 },
      { type: 'inicio_intervalo', label: 'Início do Intervalo', time: '12:00', hour: 12, minute: 0 },
      { type: 'fim_intervalo', label: 'Retorno do Intervalo', time: '13:00', hour: 13, minute: 0 },
      { type: 'saida', label: 'Fim do Expediente', time: times[1], hour: h2, minute: m2 },
    ];
  }

  return defaultSlots;
}

// Chave para evitar notificações duplicadas no mesmo dia
const NOTIFIED_CACHE_KEY = 'pontoexato_notified_today';

function hasBeenNotifiedToday(slotKey: string): boolean {
  try {
    const today = new Date().toDateString();
    const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
    if (!raw) return false;
    const cache = JSON.parse(raw);
    return cache[slotKey] === today;
  } catch {
    return false;
  }
}

function markAsNotifiedToday(slotKey: string) {
  try {
    const today = new Date().toDateString();
    const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[slotKey] = today;
    localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silencioso
  }
}

/**
 * Verifica os horários de batida e dispara alerta ou notificação se estiver dentro da janela
 */
export function checkAndTriggerPunchReminders(
  user: User,
  todayRecords: PointRecord[],
  onAlertFound?: (reminder: InAppPunchReminder) => void
) {
  const config = getReminderConfig();
  if (!config.enabled) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slots = parseWorkSlots(user.workShift);

  slots.forEach((slot, index) => {
    // Se o colaborador já registrou este slot hoje, não precisa notificar
    const isSlotDone = todayRecords.length > index;
    if (isSlotDone) return;

    const slotMinutes = slot.hour * 60 + slot.minute;
    const diffMinutes = slotMinutes - currentMinutes;

    // Se estiver dentro da janela de lembrete (ex: entre 0 e config.minutesBefore minutos)
    const isWithinWindow = diffMinutes >= 0 && diffMinutes <= config.minutesBefore;

    if (isWithinWindow) {
      const slotKey = `${user.matricula || user.email}_${slot.type}_${slot.time}`;

      // Notificação in-app
      if (onAlertFound) {
        onAlertFound({
          id: slotKey,
          slotLabel: slot.label,
          scheduledTime: slot.time,
          minutesLeft: diffMinutes,
        });
      }

      // Notificação push/navegador se ainda não disparou hoje
      if (!hasBeenNotifiedToday(slotKey)) {
        markAsNotifiedToday(slotKey);

        if (config.sound) {
          playNotificationChime();
        }

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const minutesText = diffMinutes === 0 ? 'agora mesmo' : `em ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
          try {
            const notification = new Notification('⏰ Lembrete de Ponto - PontoExato', {
              body: `Olá, ${user.name.split(' ')[0]}! Horário da sua batida de ${slot.label} (${slot.time}) é ${minutesText}. Registre seu ponto para evitar atrasos.`,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: slotKey,
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (e) {
            console.warn('Não foi possível exibir a notificação nativa:', e);
          }
        }
      }
    }
  });
}

/**
 * Envia uma notificação de teste imediata para verificar áudio e push do navegador
 */
export async function sendTestReminderNotification(userName: string): Promise<boolean> {
  const perm = await requestNotificationPermission();
  playNotificationChime();

  if (perm === 'granted') {
    try {
      new Notification('⏰ Teste de Lembrete - PontoExato', {
        body: `Perfeito, ${userName.split(' ')[0]}! Os lembretes de ponto estão funcionando no seu dispositivo. Você será alertado antes de cada batida.`,
        icon: '/icon.svg',
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
