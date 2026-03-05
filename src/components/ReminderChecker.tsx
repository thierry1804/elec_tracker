import { useEffect } from 'react';
import { usePrevision } from '../context/PrevisionContext';
import { useApp } from '../context/AppContext';
import { tryShowReminder, tryShowReminderHabit } from '../lib/reminders';
import { getRechargeTypique } from '../lib/analytics';

/**
 * Runs when prevision is available: if reminder is enabled and joursRestants <= daysBefore,
 * shows a browser notification (at most once per day).
 * If reminderByHabit is enabled, also shows a notification when close to suggested recharge date.
 */
export default function ReminderChecker() {
  const { joursRestants } = usePrevision();
  const { data } = useApp();

  useEffect(() => {
    tryShowReminder(joursRestants ?? null);
  }, [joursRestants]);

  useEffect(() => {
    const recharge = getRechargeTypique(data.achats);
    tryShowReminderHabit(recharge?.prochaineRechargeHabitude ?? null);
  }, [data.achats]);

  return null;
}
