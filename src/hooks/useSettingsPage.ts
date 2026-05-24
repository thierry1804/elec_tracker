import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  loadAiSettings,
  saveAiSettings,
  clearAiSettings,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from '../lib/aiSettings';
import { getLastSaveTime } from '../lib/storage';
import { useSettings } from '../context/SettingsContext';
import {
  downloadBackup,
  parseImportFile,
  type ExportPayload,
} from '../lib/exportImport';
import { getStoredTheme, setStoredTheme, type Theme } from '../lib/theme';
import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
} from '../lib/reminders';
import { useApp } from '../context/AppContext';

export type SettingsTabId = 'general' | 'compteurs' | 'alertes' | 'donnees' | 'avance';

export function useSettingsPage() {
  const { data, replaceData, mergeAndSetData } = useApp();
  const { settings: currentSettings, updateSettings } = useSettings();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [saved, setSaved] = useState(false);
  const [lastSave, setLastSave] = useState<string | null>(() => getLastSaveTime());
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [clipboardOk, setClipboardOk] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? 'system');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [reminderByHabit, setReminderByHabit] = useState(false);
  const [budgetMensuelAr, setBudgetMensuelAr] = useState('');
  const [objectifKwhMois, setObjectifKwhMois] = useState('');
  const [uniteAffichage, setUniteAffichage] = useState<'ar' | 'kar'>('ar');
  const [arrondiMontant, setArrondiMontant] = useState<'entier' | 'decimales'>('entier');
  const [periodeGraphiques, setPeriodeGraphiques] = useState<'7' | '30' | '90' | 'tout'>('30');
  const [noteDuMois, setNoteDuMois] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  useEffect(() => {
    setLastSave(getLastSaveTime());
  }, [data]);

  useEffect(() => {
    const s = loadReminderSettings();
    setReminderEnabled(s.enabled);
    setReminderDaysBefore(s.daysBefore);
    setReminderByHabit(s.reminderByHabit ?? false);
  }, []);

  useEffect(() => {
    setBudgetMensuelAr(currentSettings.budgetMensuelAr != null ? String(currentSettings.budgetMensuelAr) : '');
    setObjectifKwhMois(currentSettings.objectifKwhMois != null ? String(currentSettings.objectifKwhMois) : '');
    setUniteAffichage(currentSettings.uniteAffichage ?? 'ar');
    setArrondiMontant(currentSettings.arrondiMontant ?? 'entier');
    setPeriodeGraphiques(currentSettings.periodeGraphiques ?? '30');
    setNoteDuMois(currentSettings.evenementsParMois?.[currentMonthKey] ?? '');
  }, [currentMonthKey, currentSettings]);

  useEffect(() => {
    const s = loadAiSettings();
    if (s) {
      setApiKey(s.apiKey ? '••••••••••••' : '');
      setBaseUrl(s.baseUrl || DEFAULT_BASE_URL);
      setModel(s.model || DEFAULT_MODEL);
    }
  }, []);

  const handleReminderToggle = async (checked: boolean) => {
    if (checked) {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        setReminderEnabled(true);
        saveReminderSettings({ enabled: true, daysBefore: reminderDaysBefore, reminderByHabit });
      }
    } else {
      setReminderEnabled(false);
      saveReminderSettings({ enabled: false, daysBefore: reminderDaysBefore, reminderByHabit });
    }
  };

  const handleReminderDaysChange = (value: number) => {
    const days = Math.max(0, Math.min(30, value));
    setReminderDaysBefore(days);
    saveReminderSettings({ enabled: reminderEnabled, daysBefore: days, reminderByHabit });
  };

  const handleReminderByHabitChange = (checked: boolean) => {
    setReminderByHabit(checked);
    saveReminderSettings({
      enabled: reminderEnabled,
      daysBefore: reminderDaysBefore,
      reminderByHabit: checked,
    });
  };

  const handleThemeChange = (next: Theme) => {
    setStoredTheme(next);
    setTheme(next);
  };

  const handleBudgetChange = (value: string) => {
    setBudgetMensuelAr(value);
    const n = parseFloat(value.replace(',', '.'));
    updateSettings({ budgetMensuelAr: Number.isFinite(n) && n >= 0 ? n : undefined });
  };

  const handleObjectifKwhChange = (value: string) => {
    setObjectifKwhMois(value);
    const n = parseFloat(value.replace(',', '.'));
    updateSettings({ objectifKwhMois: Number.isFinite(n) && n >= 0 ? n : undefined });
  };

  const handleUniteAffichageChange = (value: 'ar' | 'kar') => {
    setUniteAffichage(value);
    updateSettings({ uniteAffichage: value });
  };

  const handleArrondiMontantChange = (value: 'entier' | 'decimales') => {
    setArrondiMontant(value);
    updateSettings({ arrondiMontant: value });
  };

  const handlePeriodeGraphiquesChange = (value: '7' | '30' | '90' | 'tout') => {
    setPeriodeGraphiques(value);
    updateSettings({ periodeGraphiques: value });
  };

  const handleNoteDuMoisChange = (value: string) => {
    setNoteDuMois(value);
    const evenements = { ...(currentSettings.evenementsParMois ?? {}) };
    if (value.trim()) {
      evenements[currentMonthKey] = value;
    } else {
      delete evenements[currentMonthKey];
    }
    updateSettings({ evenementsParMois: Object.keys(evenements).length > 0 ? evenements : undefined });
  };

  const switchCompteur = (compteurActifId: string | undefined) => {
    updateSettings({ compteurActifId });
    window.location.reload();
  };

  const handleExport = () => downloadBackup(data);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImportError(null);
    setImportPayload(null);
    if (!file) return;
    try {
      const payload = await parseImportFile(file);
      setImportPayload(payload);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import impossible.');
    }
  };

  const handleImportReplace = () => {
    if (!importPayload) return;
    replaceData(importPayload.data);
    setImportPayload(null);
  };

  const handleImportMerge = () => {
    if (!importPayload) return;
    mergeAndSetData(importPayload.data);
    setImportPayload(null);
  };

  const handleImportCancel = () => {
    setImportPayload(null);
    setImportError(null);
  };

  const handleAiSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() === '') {
      clearAiSettings();
      setApiKey('');
      setBaseUrl(DEFAULT_BASE_URL);
      setModel(DEFAULT_MODEL);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    const keyToSave = apiKey === '••••••••••••' ? loadAiSettings()?.apiKey : apiKey.trim();
    if (keyToSave) {
      saveAiSettings({
        apiKey: keyToSave,
        baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
        model: model.trim() || DEFAULT_MODEL,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClearAi = () => {
    clearAiSettings();
    setApiKey('');
    setBaseUrl(DEFAULT_BASE_URL);
    setModel(DEFAULT_MODEL);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasKey = !!loadAiSettings()?.apiKey;

  return {
    data,
    currentSettings,
    updateSettings,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    saved,
    lastSave,
    importPayload,
    importError,
    clipboardOk,
    setClipboardOk,
    theme,
    reminderEnabled,
    reminderDaysBefore,
    reminderByHabit,
    budgetMensuelAr,
    objectifKwhMois,
    uniteAffichage,
    arrondiMontant,
    periodeGraphiques,
    noteDuMois,
    fileInputRef,
    hasKey,
    handleReminderToggle,
    handleReminderDaysChange,
    handleReminderByHabitChange,
    handleThemeChange,
    handleBudgetChange,
    handleObjectifKwhChange,
    handleUniteAffichageChange,
    handleArrondiMontantChange,
    handlePeriodeGraphiquesChange,
    handleNoteDuMoisChange,
    switchCompteur,
    handleExport,
    handleImportFile,
    handleImportReplace,
    handleImportMerge,
    handleImportCancel,
    handleAiSubmit,
    handleClearAi,
  };
}

export function formatLastSave(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
