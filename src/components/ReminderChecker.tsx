import { useEffect } from 'react';
import { usePrevision } from '../context/PrevisionContext';
import { useApp } from '../context/AppContext';
import { getRelevesTries } from '../lib/calculs';
import { getJoursDepuisReleve, useCompteurMode } from '../lib/compteurMode';
import { tryShowReminder, tryShowReminderHabit, tryShowReminderPostpaye } from '../lib/reminders';
import { getRechargeTypique } from '../lib/analytics';

/**
 * Runs when prevision is available: if reminder is enabled and joursRestants <= daysBefore,
 * shows a browser notification (at most once per day).
 * If reminderByHabit is enabled, also shows a notification when close to suggested recharge date.
 */
export default function ReminderChecker() {
  const { joursRestants } = usePrevision();
  const { data } = useApp();
  const mode = useCompteurMode();
  const tries = getRelevesTries(data.releves);
  const dernier = tries.length > 0 ? tries[tries.length - 1] : undefined;
  const joursDepuis = getJoursDepuisReleve(dernier?.date);

  useEffect(() => {
    if (mode === 'postpaye') tryShowReminderPostpaye(joursDepuis);
    else tryShowReminder(joursRestants ?? null);
  }, [mode, joursRestants, joursDepuis]);

  useEffect(() => {
    if (mode === 'postpaye') return;
    const recharge = getRechargeTypique(data.achats);
    tryShowReminderHabit(recharge?.prochaineRechargeHabitude ?? null);
  }, [mode, data.achats]);

  return null;
}
