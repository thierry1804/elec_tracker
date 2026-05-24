import { usePrevision } from '../context/PrevisionContext';
import { useLayoutActions } from '../context/LayoutContext';
import { loadReminderSettings } from '../lib/reminders';

const LAST_INAPP_KEY = 'electracker_reminder_inapp_last';

function alreadyShownToday(): boolean {
  const last = localStorage.getItem(LAST_INAPP_KEY);
  return last === new Date().toISOString().slice(0, 10);
}

function markShownToday(): void {
  localStorage.setItem(LAST_INAPP_KEY, new Date().toISOString().slice(0, 10));
}

export default function ReminderInAppBanner() {
  const { joursRestants } = usePrevision();
  const layoutActions = useLayoutActions();
  const settings = loadReminderSettings();

  if (!settings.enabled) return null;
  if (joursRestants === null) return null;
  if (joursRestants > settings.daysBefore) return null;

  const notifGranted =
    'Notification' in window && Notification.permission === 'granted';
  if (notifGranted) return null;

  if (alreadyShownToday()) return null;
  markShownToday();

  const message =
    joursRestants <= 0
      ? 'Votre crédit devrait être épuisé. Rechargez dès que possible.'
      : `Environ ${joursRestants} jour${joursRestants !== 1 ? 's' : ''} avant épuisement du crédit. Pensez à recharger.`;

  return (
    <div className="alert-banner alert-warning alert-banner-row" role="alert">
      <span className="alert-banner-text">{message}</span>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => layoutActions?.openAchat()}
      >
        + Achat
      </button>
    </div>
  );
}
