import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import ReleveForm from './ReleveForm';
import AchatForm from './AchatForm';
import './Layout.css';

const formatDate = (d: Date) =>
  d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

export default function Layout() {
  const [showReleve, setShowReleve] = useState(false);
  const [showAchat, setShowAchat] = useState(false);
  const today = formatDate(new Date());

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">
            ElecTracker <span className="badge">PRÉPAYÉ</span>
          </h1>
          <time className="date" dateTime={new Date().toISOString()}>
            {today}
          </time>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-releve" onClick={() => setShowReleve(true)}>
            + Relevé
          </button>
          <button type="button" className="btn btn-achat" onClick={() => setShowAchat(true)}>
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

      <main className="main">
        <Outlet />
      </main>

      {showReleve && <ReleveForm onClose={() => setShowReleve(false)} />}
      {showAchat && <AchatForm onClose={() => setShowAchat(false)} />}
    </div>
  );
}
