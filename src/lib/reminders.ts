const REMINDER_KEY = 'electracker_reminder';
const LAST_NOTIFIED_KEY = 'electracker_reminder_last_notified';
const LAST_NOTIFIED_HABIT_KEY = 'electracker_reminder_last_notified_habit';

export interface ReminderSettings {
  enabled: boolean;
  daysBefore: number;
  /** Rappel basé sur l'habitude de recharge (prochaine date suggérée). */
  reminderByHabit?: boolean;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  daysBefore: 3,
  reminderByHabit: false,
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      daysBefore:
        typeof parsed.daysBefore === 'number' && parsed.daysBefore >= 0
          ? parsed.daysBefore
          : DEFAULT_SETTINGS.daysBefore,
      reminderByHabit:
        typeof parsed.reminderByHabit === 'boolean' ? parsed.reminderByHabit : DEFAULT_SETTINGS.reminderByHabit,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

function getLastNotifiedDate(): string | null {
  return localStorage.getItem(LAST_NOTIFIED_KEY);
}

function setLastNotifiedToday(): void {
  localStorage.setItem(LAST_NOTIFIED_KEY, new Date().toISOString().slice(0, 10));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function tryShowReminder(joursRestants: number | null): void {
  const settings = loadReminderSettings();
  if (!settings.enabled || joursRestants === null) return;
  if (joursRestants > settings.daysBefore) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0, 10);
  if (getLastNotifiedDate() === today) return;

  try {
    new Notification('ElecTracker — Pensez à recharger', {
      body:
        joursRestants <= 0
          ? 'Votre crédit devrait être épuisé. Rechargez dès que possible.'
          : `Environ ${joursRestants} jour${joursRestants !== 1 ? 's' : ''} avant épuisement du crédit. Pensez à recharger.`,
      icon: '/favicon.svg',
    });
    setLastNotifiedToday();
  } catch {
    // ignore
  }
}

function getLastNotifiedHabitDate(): string | null {
  return localStorage.getItem(LAST_NOTIFIED_HABIT_KEY);
}

function setLastNotifiedHabitToday(): void {
  localStorage.setItem(LAST_NOTIFIED_HABIT_KEY, new Date().toISOString().slice(0, 10));
}

/**
 * Affiche une notification si le rappel "habitude" est activé et que la date du jour
 * est proche de la prochaine recharge suggérée (même jour ou 1 jour avant).
 */
export function tryShowReminderHabit(prochaineRechargeHabitude: Date | null): void {
  const settings = loadReminderSettings();
  if (!settings.reminderByHabit || !prochaineRechargeHabitude) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prochaine = new Date(prochaineRechargeHabitude);
  prochaine.setHours(0, 0, 0, 0);
  const diffJours = Math.round((prochaine.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffJours > 1) return;

  const todayStr = today.toISOString().slice(0, 10);
  if (getLastNotifiedHabitDate() === todayStr) return;

  try {
    const dateLabel = prochaine.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    new Notification('ElecTracker — Recharge suggérée (habitude)', {
      body: `Prochaine recharge suggérée (habitude) : ${dateLabel}.`,
      icon: '/favicon.svg',
    });
    setLastNotifiedHabitToday();
  } catch {
    // ignore
  }
}
