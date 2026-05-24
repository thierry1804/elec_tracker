import { useState } from 'react';
import { useSettingsPage, formatLastSave, type SettingsTabId } from '../../hooks/useSettingsPage';
import { useEmbeddedAi } from '../../context/EmbeddedAiContext';
import { MODELS } from '../../lib/ai/models';
import { buildFullAiContext } from '../../lib/ai/buildContext';
import type { ModelTier } from '../../types';
import { exportRelevesCSV, exportAchatsCSV } from '../../lib/csvExport';
import { downloadReportHtml } from '../../lib/reportExport';
import { downloadReportPdf } from '../../lib/pdfExport';
import { generateTextSummary, copyToClipboard } from '../../lib/clipboardSummary';
import DeleteConfirmButton from '../DeleteConfirmButton';
import { IconTrash } from '../nav/NavIcons';
import '../Modal.css';
import './Settings.css';

const REPORT_TIMEOUT_MS = 35_000;

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

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconBraces = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 3H7a2 2 0 0 0-2 2v5c0 1-1 2-2 2 1 0 2 1 2 2v5a2 2 0 0 0 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1 1-2 2-2-1 0-2-1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);

const IconTable = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const IconFileReport = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="14" y2="17" />
  </svg>
);

export interface SettingsPageContentProps {
  activeTab: SettingsTabId;
}

export default function SettingsPageContent({ activeTab }: SettingsPageContentProps) {
  const embeddedAi = useEmbeddedAi();
  const [reportLoading, setReportLoading] = useState<'html' | 'pdf' | null>(null);
  const {
    data,
    currentSettings,
    updateSettings,
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
  } = useSettingsPage();

  const handleReportExport = async (format: 'html' | 'pdf') => {
    setReportLoading(format);
    try {
      let synthesis = null;
      if (embeddedAi.isReady) {
        const context = buildFullAiContext(data, null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
        try {
          const result = await embeddedAi.runTask('report', context, controller.signal);
          if (result?.task === 'report') synthesis = result.result;
        } finally {
          clearTimeout(timeout);
        }
      }
      if (format === 'html') {
        downloadReportHtml(data, synthesis);
      } else {
        downloadReportPdf(data, synthesis);
      }
    } finally {
      setReportLoading(null);
    }
  };

  const modelReady = embeddedAi.status === 'ready';
  const modelDownloading = embeddedAi.status === 'downloading';
  const isCheckingWebGpu = embeddedAi.status === 'checking';
  const progressPct = embeddedAi.progress
    ? Math.round(embeddedAi.progress.progress * 100)
    : 0;

  return (
    <div
      className="settings-panel"
      role="tabpanel"
      id={`settings-panel-${activeTab}`}
      aria-labelledby={`settings-tab-${activeTab}`}
    >
      <div className="settings-form">
        {activeTab === 'general' && (
          <>
            <section className="settings-section settings-card" aria-labelledby="theme-heading">
              <h3 id="theme-heading" className="settings-card-title settings-card-title-with-icon">
                <IconSun />
                Apparence
              </h3>
              <p className="settings-hint">Choisir le thème de l'application</p>
              <div
                className="theme-toggle theme-toggle-three theme-toggle-icons"
                role="group"
                aria-label="Thème d’affichage"
              >
                <button
                  type="button"
                  className={`theme-toggle-option theme-toggle-option--icon ${theme === 'light' ? 'theme-toggle-option-active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                  aria-pressed={theme === 'light'}
                  aria-label="Thème clair"
                  title="Clair"
                >
                  <IconSun />
                </button>
                <button
                  type="button"
                  className={`theme-toggle-option theme-toggle-option--icon ${theme === 'system' ? 'theme-toggle-option-active' : ''}`}
                  onClick={() => handleThemeChange('system')}
                  aria-pressed={theme === 'system'}
                  aria-label="Thème selon le système"
                  title="Système"
                >
                  <IconMonitor />
                </button>
                <button
                  type="button"
                  className={`theme-toggle-option theme-toggle-option--icon ${theme === 'dark' ? 'theme-toggle-option-active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                  aria-pressed={theme === 'dark'}
                  aria-label="Thème sombre"
                  title="Sombre"
                >
                  <IconMoon />
                </button>
              </div>
            </section>

            <section className="settings-section settings-card" aria-labelledby="affichage-heading">
              <h3 id="affichage-heading" className="settings-card-title settings-card-title-with-icon">
                <IconMonitor />
                Affichage
              </h3>
              <p className="settings-hint settings-hint-inline">
                Unité des montants et période par défaut des graphiques.
              </p>
              <div className="ai-settings-fields settings-field-grid">
                <div className="ai-field-row">
                  <label htmlFor="settings-unite">Unité des montants</label>
                  <select
                    id="settings-unite"
                    className="objective-field-input settings-field-narrow"
                    value={uniteAffichage}
                    onChange={(e) => handleUniteAffichageChange(e.target.value as 'ar' | 'kar')}
                  >
                    <option value="ar">Ar</option>
                    <option value="kar">kAr</option>
                  </select>
                </div>
                <div className="ai-field-row">
                  <label htmlFor="settings-arrondi">Arrondi des montants</label>
                  <select
                    id="settings-arrondi"
                    className="objective-field-input settings-field-narrow"
                    value={arrondiMontant}
                    onChange={(e) => handleArrondiMontantChange(e.target.value as 'entier' | 'decimales')}
                  >
                    <option value="entier">Entier</option>
                    <option value="decimales">Décimales</option>
                  </select>
                </div>
                <div className="ai-field-row">
                  <label htmlFor="settings-periode">Période des graphiques</label>
                  <select
                    id="settings-periode"
                    className="objective-field-input settings-field-narrow"
                    value={periodeGraphiques}
                    onChange={(e) => handlePeriodeGraphiquesChange(e.target.value as '7' | '30' | '90' | 'tout')}
                  >
                    <option value="7">7 jours</option>
                    <option value="30">30 jours</option>
                    <option value="90">90 jours</option>
                    <option value="tout">Tout</option>
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'compteurs' && (
          <section className="settings-section settings-card" aria-labelledby="compteur-heading">
            <h3 id="compteur-heading" className="settings-card-title settings-card-title-with-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              Compteur
            </h3>
            <p className="settings-hint settings-hint-inline">
              Gérez plusieurs compteurs (maison, bureau, etc.).
            </p>
            <div className="ai-settings-fields">
              <div className="ai-field-row">
                <label htmlFor="settings-compteur">Compteur actif</label>
                <select
                  id="settings-compteur"
                  className="objective-field-input settings-field-medium"
                  value={currentSettings.compteurActifId ?? ''}
                  onChange={(e) => {
                    switchCompteur(e.target.value || undefined);
                  }}
                >
                  <option value="">Principal (défaut)</option>
                  {(currentSettings.compteurs ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
              <div className="settings-compteur-add">
                <input
                  type="text"
                  className="objective-field-input"
                  placeholder="Nom du nouveau compteur"
                  id="new-compteur-name"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const input = document.getElementById('new-compteur-name') as HTMLInputElement;
                    const nom = input?.value.trim();
                    if (!nom) return;
                    const id = `compteur-${Date.now()}`;
                    const compteurs = [...(currentSettings.compteurs ?? []), { id, nom }];
                    updateSettings({ compteurs });
                    input.value = '';
                  }}
                >
                  + Ajouter
                </button>
              </div>
              {(currentSettings.compteurs ?? []).length > 0 && (
                <div className="settings-compteur-list">
                  {(currentSettings.compteurs ?? []).map((c) => (
                    <div key={c.id} className="settings-compteur-row">
                      <span>{c.nom}</span>
                      <DeleteConfirmButton
                        itemLabel={c.nom}
                        undoMessage={`Compteur « ${c.nom} » supprimé`}
                        onConfirm={() => {
                          const compteurs = (currentSettings.compteurs ?? []).filter((x) => x.id !== c.id);
                          const patch: Partial<typeof currentSettings> = { compteurs };
                          if (currentSettings.compteurActifId === c.id) patch.compteurActifId = undefined;
                          updateSettings(patch);
                          if (currentSettings.compteurActifId === c.id) window.location.reload();
                        }}
                        icon={<IconTrash />}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'alertes' && (
          <>
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
              <div className="reminder-days-field">
                <label htmlFor="reminder-days" className="reminder-days-label">
                  Jours avant épuisement
                </label>
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
              <label className="reminder-toggle-label settings-toggle-spaced">
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

            <section className="settings-section settings-card" aria-labelledby="notes-heading">
              <h3 id="notes-heading" className="settings-card-title settings-card-title-with-icon">
                <IconFileReport />
                Notes du mois
              </h3>
              <p className="settings-hint settings-hint-inline">
                Annotez le mois en cours (ex. invités, clim, panne, voyage) pour expliquer un pic de consommation.
              </p>
              <textarea
                className="objective-field-input settings-textarea-full"
                rows={3}
                value={noteDuMois}
                onChange={(e) => handleNoteDuMoisChange(e.target.value)}
                placeholder="ex: Climatisation toute la semaine, invités..."
              />
              {noteDuMois.trim() && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm settings-note-clear"
                  onClick={() => handleNoteDuMoisChange('')}
                >
                  Effacer la note
                </button>
              )}
            </section>
          </>
        )}

        {activeTab === 'donnees' && (
          <section className="settings-section settings-card" aria-labelledby="sauvegarde-heading">
            <h3 id="sauvegarde-heading" className="settings-card-title settings-card-title-with-icon">
              <IconSave />
              Sauvegarde
            </h3>
            <p className="settings-hint backup-last-save">
              Dernière sauvegarde : <strong>{formatLastSave(lastSave)}</strong>
            </p>
            <div className="backup-actions backup-actions--icons" role="toolbar" aria-label="Export et import des données">
              <button
                type="button"
                className="btn btn-secondary backup-btn backup-btn--icon"
                onClick={handleExport}
                title="Exporter la sauvegarde (JSON)"
                aria-label="Exporter la sauvegarde JSON"
              >
                <IconBraces />
                <span className="backup-btn-label">JSON</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary backup-btn backup-btn--icon"
                onClick={() => exportRelevesCSV(data.releves)}
                title="Exporter les relevés (CSV)"
                aria-label="Exporter les relevés en CSV"
              >
                <IconTable />
                <span className="backup-btn-label">Relevés</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary backup-btn backup-btn--icon"
                onClick={() => exportAchatsCSV(data.achats)}
                title="Exporter les achats (CSV)"
                aria-label="Exporter les achats en CSV"
              >
                <IconCart />
                <span className="backup-btn-label">Achats</span>
              </button>
              <label
                className="btn btn-secondary backup-btn backup-btn--icon backup-btn-import"
                title="Importer une sauvegarde (JSON)"
                aria-label="Importer une sauvegarde JSON"
              >
                <IconUpload />
                <span className="backup-btn-label">Import</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="input-hidden"
                  aria-label="Choisir un fichier de sauvegarde JSON"
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary backup-btn backup-btn--icon"
                disabled={reportLoading !== null}
                onClick={() => handleReportExport('html')}
                title="Exporter le rapport (HTML)"
                aria-label="Exporter le rapport HTML"
              >
                <IconFileReport />
                <span className="backup-btn-label">{reportLoading === 'html' ? '…' : 'HTML'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary backup-btn backup-btn--icon"
                disabled={reportLoading !== null}
                onClick={() => handleReportExport('pdf')}
                title="Exporter le rapport (PDF)"
                aria-label="Exporter le rapport PDF"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M10 12h4M10 16h4M10 20h2" />
                </svg>
                <span className="backup-btn-label">{reportLoading === 'pdf' ? '…' : 'PDF'}</span>
              </button>
              <button
                type="button"
                className={`btn btn-secondary backup-btn backup-btn--icon${clipboardOk ? ' active' : ''}`}
                onClick={async () => {
                  const text = generateTextSummary(data);
                  const ok = await copyToClipboard(text);
                  if (ok) {
                    setClipboardOk(true);
                    setTimeout(() => setClipboardOk(false), 2000);
                  }
                }}
                title={clipboardOk ? 'Copié !' : 'Copier le résumé (texte)'}
                aria-label="Copier le résumé en texte"
              >
                {clipboardOk ? <IconCheck /> : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                <span className="backup-btn-label">{clipboardOk ? 'Copié' : 'Copier'}</span>
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
        )}

        {activeTab === 'avance' && (
          <section className="settings-section settings-card" aria-labelledby="assistant-heading">
            <h3 id="assistant-heading" className="settings-card-title settings-card-title-with-icon">
              <IconSparkles />
              Assistant local
            </h3>
            <p className="settings-hint settings-hint-inline">
              Modèle embarqué dans le navigateur pour la prévision, l’analyse et les rapports.
              Sans téléchargement, l’app utilise les calculs locaux.
            </p>

            {isCheckingWebGpu && (
              <p className="settings-hint" role="status">
                Vérification de la compatibilité avec cet appareil…
              </p>
            )}

            {!isCheckingWebGpu && embeddedAi.status === 'unsupported' && (
              <p className="settings-hint settings-hint-warning" role="status">
                {embeddedAi.webGpuReason ?? 'WebGPU non disponible sur cet appareil.'}
                {' '}L’assistant local ne peut pas être installé ici ; les calculs locaux restent disponibles.
              </p>
            )}

            {embeddedAi.isWebGpuSupported && (
              <div className="ai-settings-fields">
                <div className="ai-field-row ai-field-row-toggle">
                  <label htmlFor="settings-ai-enabled">Activer l’assistant</label>
                  <input
                    id="settings-ai-enabled"
                    type="checkbox"
                    checked={embeddedAi.settings.enabled}
                    onChange={(e) => embeddedAi.setEnabled(e.target.checked)}
                  />
                </div>

                <div className="ai-field-row">
                  <label htmlFor="settings-ai-model">Modèle</label>
                  <select
                    id="settings-ai-model"
                    value={embeddedAi.settings.modelTier}
                    disabled={modelDownloading || embeddedAi.status === 'inferring'}
                    onChange={(e) => embeddedAi.setModelTier(e.target.value as ModelTier)}
                  >
                    {(Object.keys(MODELS) as ModelTier[]).map((tier) => (
                      <option key={tier} value={tier}>
                        {MODELS[tier].label} ({MODELS[tier].sizeLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="settings-hint">
                  Premier téléchargement : {MODELS[embeddedAi.settings.modelTier].sizeLabel}. Wi‑Fi recommandé.
                  Nécessite Chrome ou Edge récent avec accélération graphique.
                </p>

                {modelDownloading && embeddedAi.progress && (
                  <div className="ai-download-progress" role="status">
                    <progress max={100} value={progressPct} />
                    <span className="settings-hint">
                      Téléchargement du modèle… {progressPct} %
                    </span>
                  </div>
                )}

                {modelReady && (
                  <p className="settings-hint" role="status">
                    Modèle prêt
                    {embeddedAi.settings.downloadedAt
                      ? ` (téléchargé le ${formatLastSave(embeddedAi.settings.downloadedAt)})`
                      : ''}
                  </p>
                )}

                {embeddedAi.error && (
                  <p className="settings-hint settings-hint-warning" role="alert">
                    {embeddedAi.error}
                  </p>
                )}
              </div>
            )}

            {embeddedAi.isWebGpuSupported && (
              <div className="ai-actions">
                {!modelReady && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={modelDownloading}
                    onClick={() => embeddedAi.downloadModel()}
                  >
                    {modelDownloading ? 'Téléchargement…' : 'Télécharger le modèle'}
                  </button>
                )}
                {modelReady && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => embeddedAi.clearModel()}
                  >
                    Supprimer le modèle
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
