import { NavLink, Outlet } from 'react-router-dom';
import { useState, useMemo } from 'react';
import ReleveForm from './ReleveForm';
import AchatForm from './AchatForm';
import ReminderChecker from './ReminderChecker';
import ReminderInAppBanner from './ReminderInAppBanner';
import MobileBottomNav from './MobileBottomNav';
import ActionSheet from './ActionSheet';
import CompteurSwitcher from './CompteurSwitcher';
import ToastContainer from './ToastContainer';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { LayoutActionsProvider } from '../context/LayoutContext';
import { PrevisionProvider } from '../context/PrevisionContext';
import { useApp } from '../context/AppContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  IconAchats,
  IconAchat,
  IconDashboard,
  IconParametres,
  IconBolt,
  IconReleve,
  IconReleves,
} from './nav/NavIcons';
import './Layout.css';

const formatDateLong = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const formatDateShort = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const navItems = [
  { to: '/', end: true, label: 'Dashboard', Icon: IconDashboard },
  { to: '/releves', label: 'Relevés', Icon: IconReleves },
  { to: '/achats', label: 'Achats', Icon: IconAchats },
  { to: '/parametres', label: 'Paramètres', Icon: IconParametres },
] as const;

export default function Layout() {
  const { data } = useApp();
  const [showReleve, setShowReleve] = useState(false);
  const [showAchat, setShowAchat] = useState(false);

  const openReleve = () => setShowReleve(true);
  const openAchat = () => setShowAchat(true);

  const layoutActions = useMemo(
    () => ({ openReleve, openAchat }),
    []
  );

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onReleve: openReleve,
    onAchat: openAchat,
  });

  const today = new Date();
  const dateLong = formatDateLong(today);
  const dateShort = formatDateShort(today);

  return (
    <PrevisionProvider releves={data.releves} achats={data.achats}>
      <ReminderChecker />
      <LayoutActionsProvider value={layoutActions}>
        <div className="layout">
          <div className="layout-sticky">
            <header className="header">
              <div className="header-left">
                <div className="logo">
                  <div className="logo-icon" aria-hidden>
                    <IconBolt />
                  </div>
                  <span className="logo-name">ElecTracker</span>
                  <span className="badge-prepaye badge-prepaye-full">PRÉPAYÉ</span>
                  <CompteurSwitcher />
                </div>
                <time className="date date-long" dateTime={today.toISOString()}>
                  {dateLong}
                </time>
                <time className="date date-short" dateTime={today.toISOString()}>
                  {dateShort}
                </time>
              </div>
              <div className="header-right">
                <nav className="nav nav-desktop" aria-label="Navigation principale">
                  {navItems.map(({ to, label, Icon, ...rest }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={'end' in rest ? rest.end : undefined}
                      aria-label={label}
                      className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </nav>
                <div className="header-actions header-actions-desk">
                  <button type="button" className="btn btn-secondary btn-labeled" onClick={openReleve}>
                    <IconReleve />
                    <span>Relevé</span>
                  </button>
                  <button type="button" className="btn btn-primary btn-labeled" onClick={openAchat}>
                    <IconAchat />
                    <span>Achat</span>
                  </button>
                </div>
              </div>
            </header>
          </div>

          <div className="layout-spacer" aria-hidden="true" />

          <ReminderInAppBanner />

          <main className="main">
            <Outlet />
          </main>

          <ActionSheet onReleve={openReleve} onAchat={openAchat} />
          <MobileBottomNav />
          <ToastContainer />

          {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

          {showReleve && <ReleveForm onClose={() => setShowReleve(false)} />}
          {showAchat && <AchatForm onClose={() => setShowAchat(false)} />}
        </div>
      </LayoutActionsProvider>
    </PrevisionProvider>
  );
}
