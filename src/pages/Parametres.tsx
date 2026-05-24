import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import SettingsTabs from '../components/settings/SettingsTabs';
import SettingsPageContent from '../components/settings/SettingsPageContent';
import type { SettingsTabId } from '../hooks/useSettingsPage';
import '../components/settings/Settings.css';

const TAB_LEADS: Record<SettingsTabId, string> = {
  general: 'Thème, unités et affichage des graphiques.',
  compteurs: 'Gérez plusieurs compteurs prépayés.',
  alertes: 'Rappels, objectifs et notes du mois.',
  donnees: 'Export, import et sauvegarde de vos données.',
  avance: 'Prévision IA optionnelle (clé API).',
};

export default function Parametres() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');

  return (
    <div className="page parametres">
      <PageHeader title="Paramètres" lead={TAB_LEADS[activeTab]} />
      <div className="settings-page">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <SettingsPageContent activeTab={activeTab} />
      </div>
    </div>
  );
}
