import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  loadAiSettings,
  saveAiSettings,
  clearAiSettings,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from '../lib/aiSettings';
import { getLastSaveTime, loadSettings, saveSettings } from '../lib/storage';
import {
  downloadBackup,
  parseImportFile,
  type ExportPayload,
} from '../lib/exportImport';
import { exportRelevesCSV, exportAchatsCSV } from '../lib/csvExport';
import { downloadReportHtml } from '../lib/reportExport';
import { getStoredTheme, setStoredTheme, type Theme } from '../lib/theme';
import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
} from '../lib/reminders';
import { useApp } from '../context/AppContext';
import './Modal.css';

interface SettingsModalProps {
  onClose: () => void;
}

const PLACEHOLDER_KEY = 'sk-...';

const IconSun = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const IconMonitor = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconMoon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconSave = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconTarget = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconBell = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconSparkles = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const IconPowerOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function formatLastSave(iso: string | null): string {
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

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { data, replaceData, mergeAndSetData } = useApp();
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [saved, setSaved] = useState(false);
  const [lastSave, setLastSave] = useState<string | null>(() => getLastSaveTime());
  const [importPayload, setImportPayload] = useState<ExportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? 'system');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [reminderByHabit, setReminderByHabit] = useState(false);
  const [budgetMensuelAr, setBudgetMensuelAr] = useState<string>('');
  const [objectifKwhMois, setObjectifKwhMois] = useState<string>('');
  const [uniteAffichage, setUniteAffichage] = useState<'ar' | 'kar'>('ar');
  const [arrondiMontant, setArrondiMontant] = useState<'entier' | 'decimales'>('entier');
  const [periodeGraphiques, setPeriodeGraphiques] = useState<'7' | '30' | '90' | 'tout'>('30');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const s = loadSettings();
    setBudgetMensuelAr(s.budgetMensuelAr != null ? String(s.budgetMensuelAr) : '');
    setObjectifKwhMois(s.objectifKwhMois != null ? String(s.objectifKwhMois) : '');
    setUniteAffichage(s.uniteAffichage ?? 'ar');
    setArrondiMontant(s.arrondiMontant ?? 'entier');
    setPeriodeGraphiques(s.periodeGraphiques ?? '30');
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
    const prev = loadSettings();
    saveSettings({
      ...prev,
      budgetMensuelAr: Number.isFinite(n) && n >= 0 ? n : undefined,
    });
  };

  const handleObjectifKwhChange = (value: string) => {
    setObjectifKwhMois(value);
    const n = parseFloat(value.replace(',', '.'));
    const prev = loadSettings();
    saveSettings({
      ...prev,
      objectifKwhMois: Number.isFinite(n) && n >= 0 ? n : undefined,
    });
  };

  const handleUniteAffichageChange = (value: 'ar' | 'kar') => {
    setUniteAffichage(value);
    const prev = loadSettings();
    saveSettings({ ...prev, uniteAffichage: value });
  };

  const handleArrondiMontantChange = (value: 'entier' | 'decimales') => {
    setArrondiMontant(value);
    const prev = loadSettings();
    saveSettings({ ...prev, arrondiMontant: value });
  };

  const handlePeriodeGraphiquesChange = (value: '7' | '30' | '90' | 'tout') => {
    setPeriodeGraphiques(value);
    const prev = loadSettings();
    saveSettings({ ...prev, periodeGraphiques: value });
  };

  useEffect(() => {
    const s = loadAiSettings();
    if (s) {
      setApiKey(s.apiKey ? '••••••••••••' : '');
      setBaseUrl(s.baseUrl || DEFAULT_BASE_URL);
      setModel(s.model || DEFAULT_MODEL);
    }
  }, []);

  const handleExport = () => {
    downloadBackup(data);
  };

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
    onClose();
  };

  const handleImportMerge = () => {
    if (!importPayload) return;
    mergeAndSetData(importPayload.data);
    setImportPayload(null);
    onClose();
  };

  const handleImportCancel = () => {
    setImportPayload(null);
    setImportError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() === '') {
      clearAiSettings();
      setApiKey('');
      setBaseUrl(DEFAULT_BASE_URL);
      setModel(DEFAULT_MODEL);
      setSaved(true);
      setTimeout(() => onClose(), 600);
      return;
    }
    const keyToSave =
      apiKey === '••••••••••••' ? loadAiSettings()?.apiKey : apiKey.trim();
    if (keyToSave) {
      saveAiSettings({
        apiKey: keyToSave,
        baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
        model: model.trim() || DEFAULT_MODEL,
      });
      setSaved(true);
      setTimeout(() => onClose(), 800);
    }
  };

  const handleClear = () => {
    clearAiSettings();
    setApiKey('');
    setBaseUrl(DEFAULT_BASE_URL);
    setModel(DEFAULT_MODEL);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  const hasKey = !!loadAiSettings()?.apiKey;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal modal-settings" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2>Paramètres</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-form">
          {/* Section Apparence */}
          <section className="settings-section settings-card" aria-labelledby="theme-heading">
            <h3 id="theme-heading" className="settings-card-title settings-card-title-with-icon">
              <IconSun />
              Apparence
            </h3>
            <p className="settings-hint">Choisir le thème de l'application</p>
            <div
              className="theme-toggle theme-toggle-three"
              role="group"
              aria-label="Thème"
            >
              <button
                type="button"
                className={`theme-toggle-option ${theme === 'light' ? 'theme-toggle-option-active' : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-pressed={theme === 'light'}
                title="Clair"
              >
                <IconSun />
                <span>Clair</span>
              </button>
              <button
                type="button"
                className={`theme-toggle-option ${theme === 'system' ? 'theme-toggle-option-active' : ''}`}
                onClick={() => handleThemeChange('system')}
                aria-pressed={theme === 'system'}
                title="Système"
              >
                <IconMonitor />
                <span>Système</span>
              </button>
              <button
                type="button"
                className={`theme-toggle-option ${theme === 'dark' ? 'theme-toggle-option-active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-pressed={theme === 'dark'}
                title="Sombre"
              >
                <IconMoon />
                <span>Sombre</span>
              </button>
            </div>
          </section>

          {/* Section Rappels */}
          <section className="settings-section settings-card" aria-labelledby="rappels-heading">
            <h3 id="rappels-heading" className="settings-card-title settings-card-title-with-icon">
              <IconBell />
              Rappels
            </h3>
            <p className="settings-hint">Notification à l'ouverture de l'app si le crédit arrive à épuisement.</p>
            <label className="reminder-toggle-label">
              <input
                type="checkbox"
                className="reminder-toggle-input"
                checked={reminderEnabled}
                onChange={(e) => handleReminderToggle(e.target.checked)}
                aria-describedby="rappels-days-hint"
              />
              <span className="reminder-toggle-track" aria-hidden>
                <span className="reminder-toggle-thumb" />
              </span>
              <span className="reminder-toggle-text">Me rappeler de recharger</span>
            </label>
            <div className="reminder-days-inline">
              <label htmlFor="reminder-days" className="reminder-days-label">Jours avant épuisement</label>
              <input
                id="reminder-days"
                type="number"
                min={0}
                max={30}
                className="reminder-days-input"
                value={reminderDaysBefore}
                onChange={(e) => handleReminderDaysChange(parseInt(e.target.value, 10) || 0)}
                aria-describedby="rappels-days-hint"
              />
            </div>
            <p id="rappels-days-hint" className="settings-hint settings-hint-inline">Alerte si jours restants ≤ ce nombre (défaut : 3).</p>
            <label className="reminder-toggle-label" style={{ marginTop: '0.75rem' }}>
              <input
                type="checkbox"
                className="reminder-toggle-input"
                checked={reminderByHabit}
                onChange={(e) => handleReminderByHabitChange(e.target.checked)}
              />
              <span className="reminder-toggle-track" aria-hidden>
                <span className="reminder-toggle-thumb" />
              </span>
              <span className="reminder-toggle-text">Rappel basé sur l'habitude (prochaine recharge suggérée)</span>
            </label>
          </section>

          {/* Section Objectif mensuel */}
          <section className="settings-section settings-card" aria-labelledby="objectif-heading">
            <h3 id="objectif-heading" className="settings-card-title settings-card-title-with-icon">
              <IconTarget />
              Objectif mensuel
            </h3>
            <p className="settings-hint settings-hint-inline">
              Optionnel : budget ou plafond de consommation pour l’indicateur du tableau de bord.
            </p>
            <div className="objective-fields">
              <div className="objective-field-row">
                <label htmlFor="settings-budget" className="objective-field-label">Budget (Ar / mois)</label>
                <input
                  id="settings-budget"
                  type="text"
                  inputMode="numeric"
                  className="objective-field-input"
                  value={budgetMensuelAr}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  placeholder="ex: 50000"
                />
              </div>
              <div className="objective-field-row">
                <label htmlFor="settings-objectif-kwh" className="objective-field-label">Objectif consommation (kWh / mois)</label>
                <input
                  id="settings-objectif-kwh"
                  type="text"
                  inputMode="decimal"
                  className="objective-field-input"
                  value={objectifKwhMois}
                  onChange={(e) => handleObjectifKwhChange(e.target.value)}
                  placeholder="ex: 120"
                />
              </div>
            </div>
          </section>

          {/* Section Affichage */}
          <section className="settings-section settings-card" aria-labelledby="affichage-heading">
            <h3 id="affichage-heading" className="settings-card-title settings-card-title-with-icon">
              <IconMonitor />
              Affichage
            </h3>
            <p className="settings-hint settings-hint-inline">
              Unité des montants et période par défaut des graphiques.
            </p>
            <div className="ai-settings-fields">
              <div className="ai-field-row">
                <label htmlFor="settings-unite">Unité des montants</label>
                <select
                  id="settings-unite"
                  className="objective-field-input"
                  value={uniteAffichage}
                  onChange={(e) => handleUniteAffichageChange(e.target.value as 'ar' | 'kar')}
                  style={{ maxWidth: '10rem' }}
                >
                  <option value="ar">Ar</option>
                  <option value="kar">kAr</option>
                </select>
              </div>
              <div className="ai-field-row">
                <label htmlFor="settings-arrondi">Arrondi des montants</label>
                <select
                  id="settings-arrondi"
                  className="objective-field-input"
                  value={arrondiMontant}
                  onChange={(e) => handleArrondiMontantChange(e.target.value as 'entier' | 'decimales')}
                  style={{ maxWidth: '10rem' }}
                >
                  <option value="entier">Entier</option>
                  <option value="decimales">Décimales</option>
                </select>
              </div>
              <div className="ai-field-row">
                <label htmlFor="settings-periode">Période des graphiques</label>
                <select
                  id="settings-periode"
                  className="objective-field-input"
                  value={periodeGraphiques}
                  onChange={(e) => handlePeriodeGraphiquesChange(e.target.value as '7' | '30' | '90' | 'tout')}
                  style={{ maxWidth: '10rem' }}
                >
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="tout">Tout</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section Sauvegarde */}
          <section className="settings-section settings-card" aria-labelledby="sauvegarde-heading">
            <h3 id="sauvegarde-heading" className="settings-card-title settings-card-title-with-icon">
              <IconSave />
              Sauvegarde
            </h3>
            <p className="settings-hint backup-last-save">
              Dernière sauvegarde : <strong>{formatLastSave(lastSave)}</strong>
            </p>
            <div className="backup-actions">
              <button type="button" className="btn btn-secondary backup-btn" onClick={handleExport}>
                <IconDownload />
                <span>Exporter (JSON)</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary backup-btn"
                onClick={() => exportRelevesCSV(data.releves)}
              >
                <IconDownload />
                <span>Export relevés CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary backup-btn"
                onClick={() => exportAchatsCSV(data.achats)}
              >
                <IconDownload />
                <span>Export achats CSV</span>
              </button>
              <label className="btn btn-secondary backup-btn backup-btn-import">
                <IconUpload />
                <span>Importer</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                  aria-label="Choisir un fichier de sauvegarde"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary backup-btn"
                onClick={() => downloadReportHtml(data)}
              >
                <IconDownload />
                <span>Export rapport (HTML)</span>
              </button>
            </div>
            {importError && (
              <p className="settings-error" role="alert">
                {importError}
              </p>
            )}
            {importPayload && (
              <div className="import-summary">
                <p>
                  Fichier valide : <strong>{importPayload.data.releves.length}</strong> relevé
                  {importPayload.data.releves.length !== 1 ? 's' : ''},{' '}
                  <strong>{importPayload.data.achats.length}</strong> achat
                  {importPayload.data.achats.length !== 1 ? 's' : ''}.
                </p>
                <p className="settings-hint">Remplacer écrase toutes les données actuelles. Fusionner ajoute les entrées sans doublon (par id).</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleImportCancel}>
                    Annuler
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleImportMerge}>
                    Fusionner
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleImportReplace}>
                    Remplacer
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section Prévision IA */}
          <section className="settings-section settings-card" aria-labelledby="prevision-heading">
            <h3 id="prevision-heading" className="settings-card-title settings-card-title-with-icon">
              <IconSparkles />
              Prévision IA
            </h3>
            <form onSubmit={handleSubmit}>
              <p className="settings-hint settings-hint-inline">
                Optionnel : clé API (OpenAI ou compatible) pour améliorer la prévision avec l’IA.
                Sans clé, la prévision reste calculée localement comme aujourd’hui.
              </p>
              <div className="ai-settings-fields">
                <div className="ai-field-row">
                  <label htmlFor="settings-api-key">Clé API (token)</label>
                  <input
                    id="settings-api-key"
                    type="password"
                    autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={PLACEHOLDER_KEY}
                  />
                </div>
                <div className="ai-field-row">
                  <label htmlFor="settings-api-url">URL de l’API (optionnel)</label>
                  <input
                    id="settings-api-url"
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={DEFAULT_BASE_URL}
                  />
                </div>
                <div className="ai-field-row">
                  <label htmlFor="settings-api-model">Modèle (optionnel)</label>
                  <input
                    id="settings-api-model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={DEFAULT_MODEL}
                  />
                </div>
              </div>
              <div className="ai-actions">
                {hasKey && (
                  <button
                    type="button"
                    className="btn btn-secondary ai-action-btn ai-action-btn-icon-only"
                    onClick={handleClear}
                    title="Désactiver l'IA"
                    aria-label="Désactiver l'IA"
                  >
                    <IconPowerOff />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary ai-action-btn ai-action-btn-icon-only"
                  onClick={onClose}
                  title="Annuler"
                  aria-label="Annuler"
                >
                  <IconX />
                </button>
                <button
                  type="submit"
                  className="btn btn-primary ai-action-btn ai-action-btn-icon-only"
                  title={saved ? 'Enregistré' : 'Enregistrer'}
                  aria-label={saved ? 'Enregistré' : 'Enregistrer'}
                >
                  <IconCheck />
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
