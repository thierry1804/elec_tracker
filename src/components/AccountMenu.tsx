import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../lib/sync';
import './AccountMenu.css';

function describe(state: string, pending: number, offlineSession: boolean): { label: string; tone: 'ok' | 'wait' | 'off' | 'err' } {
  if (state === 'error') return { label: 'Erreur de synchronisation', tone: 'err' };
  if (state === 'syncing') return { label: 'Synchronisation…', tone: 'wait' };
  if (state === 'offline' || offlineSession) {
    return { label: pending > 0 ? `Hors ligne · ${pending} modification(s) en attente` : 'Hors ligne', tone: 'off' };
  }
  if (pending > 0) return { label: `${pending} modification(s) en attente`, tone: 'wait' };
  return { label: 'Synchronisé', tone: 'ok' };
}

export default function AccountMenu() {
  const { email, offline, logout } = useAuth();
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = describe(status.state, status.pending, offline);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className="account-menu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${email} · ${info.label}`}
      >
        <span className={`account-dot account-dot-${info.tone}`} aria-hidden />
        <span className="account-initial" aria-hidden>
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="visually-hidden">Compte : {info.label}</span>
      </button>
      {open && (
        <div className="account-menu-pop" role="dialog" aria-label="Compte">
          <p className="account-email">{email}</p>
          <p className={`account-status account-status-${info.tone}`}>{info.label}</p>
          {status.lastSync && (
            <p className="account-meta">Dernière synchro : {new Date(status.lastSync).toLocaleString('fr-FR')}</p>
          )}
          {status.errors.length > 0 && (
            <ul className="account-errors">
              {status.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
