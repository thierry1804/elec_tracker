import type { SettingsTabId } from '../../hooks/useSettingsPage';

import './Settings.css';

const TABS: { id: SettingsTabId; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'compteurs', label: 'Compteurs' },
  { id: 'alertes', label: 'Alertes' },
  { id: 'donnees', label: 'Données' },
  { id: 'avance', label: 'Avancé' },
];

export interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <nav className="settings-tabs" role="tablist" aria-label="Sections paramètres">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`settings-tab-${id}`}
          aria-selected={activeTab === id}
          aria-controls={`settings-panel-${id}`}
          className={`settings-tab-btn${activeTab === id ? ' settings-tab-btn--active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
