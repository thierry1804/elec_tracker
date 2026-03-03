import { NavLink, Outlet } from 'react-router-dom';
import { useState, useMemo } from 'react';
import ReleveForm from './ReleveForm';
import AchatForm from './AchatForm';
import SettingsModal from './SettingsModal';
import { LayoutActionsProvider } from '../context/LayoutContext';
import { PrevisionProvider } from '../context/PrevisionContext';
import { useApp } from '../context/AppContext';
import './Layout.css';

const formatDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export default function Layout() {
  const { data } = useApp();
  const [showReleve, setShowReleve] = useState(false);
  const [showAchat, setShowAchat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const today = formatDate(new Date());
  const layoutActions = useMemo(
    () => ({
      openReleve: () => setShowReleve(true),
      openAchat: () => setShowAchat(true),
    }),
    []
  );

  return (
    <PrevisionProvider releves={data.releves}>
    <LayoutActionsProvider value={layoutActions}>
    <div className="layout">
      <div className="layout-sticky">
        <header className="header">
          <div className="header-left">
            <div className="logo">
              <div className="logo-icon">⚡</div>
              <span className="logo-name">ElecTracker</span>
              <span className="badge-prepaye">PRÉPAYÉ</span>
            </div>
            <time className="date" dateTime={new Date().toISOString()}>
              {today}
            </time>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setShowSettings(true)}
              title="Paramètres (prévision IA)"
              aria-label="Paramètres"
            >
              ⚙️
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReleve(true)}>
              + Relevé
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAchat(true)}>
              + Achat
            </button>
          </div>
        </header>

        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
          <NavLink to="/historique" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Historique
          </NavLink>
          <NavLink to="/achats" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Achats
          </NavLink>
        </nav>
      </div>

      <div className="layout-spacer" aria-hidden="true" />

      <main className="main">
        <Outlet />
      </main>

      {showReleve && <ReleveForm onClose={() => setShowReleve(false)} />}
      {showAchat && <AchatForm onClose={() => setShowAchat(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
    </LayoutActionsProvider>
    </PrevisionProvider>
  );
}
