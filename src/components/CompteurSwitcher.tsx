import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
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

  if (compteurs.length === 0 && !actif) return null;

  const label = actif?.nom ?? 'Principal';

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
        title="Changer de compteur"
      >
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="compteur-switcher-menu" role="listbox" aria-label="Compteurs">
          <li>
            <button type="button" role="option" aria-selected={!actifId} onClick={() => select(undefined)}>
              Principal
            </button>
          </li>
          {compteurs.map((c) => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={c.id === actifId} onClick={() => select(c.id)}>
                {c.nom}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
