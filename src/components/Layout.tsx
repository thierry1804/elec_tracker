import { NavLink, Outlet } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import ReleveForm from './ReleveForm';
import AchatForm from './AchatForm';
import SettingsModal from './SettingsModal';
import ReminderChecker from './ReminderChecker';
import ReminderInAppBanner from './ReminderInAppBanner';
import { LayoutActionsProvider } from '../context/LayoutContext';
import { PrevisionProvider } from '../context/PrevisionContext';
import { useApp } from '../context/AppContext';
import './Layout.css';

const formatDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const IconReleve = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
);
const IconAchat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
);
const IconHamburger = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);

export default function Layout() {
  const { data } = useApp();
  const [showReleve, setShowReleve] = useState(false);
  const [showAchat, setShowAchat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const openSettings = () => {
    setShowSettings(true);
    closeMenu();
  };
  const openReleve = () => {
    setShowReleve(true);
    closeMenu();
  };
  const openAchat = () => {
    setShowAchat(true);
    closeMenu();
  };

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
    <ReminderChecker />
    <LayoutActionsProvider value={layoutActions}>
    <div className="layout">
      <div className="layout-sticky">
        <header className="header">
          <div className="header-left">
            <div className="logo">
              <div className="logo-icon">⚡</div>
              <span className="logo-name">ElecTracker</span>
              <span className="badge-prepaye badge-prepaye-full">PRÉPAYÉ</span>
              <span className="badge-prepaye badge-prepaye-short" aria-label="Prépayé">P</span>
            </div>
            <time className="date" dateTime={new Date().toISOString()}>
              {today}
            </time>
          </div>
          <div className="header-actions header-actions-desk">
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setShowSettings(true)}
              title="Paramètres (prévision IA)"
              aria-label="Paramètres"
            >
              <IconSettings />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={() => setShowReleve(true)}
              title="Nouveau relevé"
              aria-label="Nouveau relevé"
            >
              <IconReleve />
            </button>
            <button
              type="button"
              className="btn btn-primary btn-icon"
              onClick={() => setShowAchat(true)}
              title="Nouvel achat"
              aria-label="Nouvel achat"
            >
              <IconAchat />
            </button>
          </div>
          <div className="header-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="btn btn-icon header-menu-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              title="Menu actions"
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
            >
              <IconHamburger />
            </button>
            {menuOpen && (
              <div className="header-menu-dropdown" role="menu">
                <button
                  type="button"
                  className="btn btn-icon header-menu-item"
                  onClick={openSettings}
                  title="Paramètres (prévision IA)"
                  aria-label="Paramètres"
                  role="menuitem"
                >
                  <IconSettings />
                  <span>Paramètres</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon header-menu-item"
                  onClick={openReleve}
                  title="Nouveau relevé"
                  aria-label="Nouveau relevé"
                  role="menuitem"
                >
                  <IconReleve />
                  <span>Nouveau relevé</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-icon header-menu-item"
                  onClick={openAchat}
                  title="Nouvel achat"
                  aria-label="Nouvel achat"
                  role="menuitem"
                >
                  <IconAchat />
                  <span>Nouvel achat</span>
                </button>
              </div>
            )}
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

      <ReminderInAppBanner />

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
