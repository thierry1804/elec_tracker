import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { labelMode, resolveCompteurMode } from '../lib/compteurMode';
import './CompteurSwitcher.css';

export default function CompteurSwitcher() {
  const { settings, updateSettings } = useSettings();
  const compteurs = settings.compteurs ?? [];
  const actifId = settings.compteurActifId;
  const actif = actifId ? compteurs.find((c) => c.id === actifId) : null;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const label = actif?.nom ?? 'Principal';
  const modeLabel = labelMode(resolveCompteurMode(settings));

  const select = (id: string | undefined) => {
    if (id === actifId) {
      setOpen(false);
      return;
    }
    updateSettings({ compteurActifId: id });
    setOpen(false);
    window.location.reload();
  };

  return (
    <div className="compteur-switcher" ref={ref}>
      <button
        type="button"
        className="compteur-switcher-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={`${label} · ${modeLabel}`}
      >
        <span className="compteur-switcher-label">
          <span className="compteur-switcher-name">{label}</span>
          <span className="compteur-switcher-mode">{modeLabel}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="compteur-switcher-menu" role="listbox" aria-label="Compteurs">
          <li>
            <button type="button" role="option" aria-selected={!actifId} onClick={() => select(undefined)}>
              <span className="compteur-switcher-name">Principal</span>
              <span className="compteur-switcher-mode">{labelMode(settings.modePrincipal ?? 'prepaye')}</span>
            </button>
          </li>
          {compteurs.map((c) => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={c.id === actifId} onClick={() => select(c.id)}>
                <span className="compteur-switcher-name">{c.nom}</span>
                <span className="compteur-switcher-mode">{labelMode(c.mode)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
