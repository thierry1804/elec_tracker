import { useEffect, useRef, useState } from 'react';
import { IconAchat, IconPlus, IconReleve } from './nav/NavIcons';
import './ActionSheet.css';

interface ActionSheetProps {
  onReleve: () => void;
  onAchat: () => void;
}

export default function ActionSheet({ onReleve, onAchat }: ActionSheetProps) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`fab${open ? ' fab-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ajouter un relevé ou un achat'}
        aria-expanded={open}
      >
        <IconPlus />
      </button>
      {open && (
        <>
          <div className="action-sheet-backdrop" onClick={() => setOpen(false)} role="presentation" />
          <div className="action-sheet" ref={sheetRef} role="menu" aria-label="Actions rapides">
            <button
              type="button"
              className="action-sheet-item"
              role="menuitem"
              onClick={() => {
                onReleve();
                setOpen(false);
              }}
            >
              <IconReleve />
              <span>Nouveau relevé</span>
            </button>
            <button
              type="button"
              className="action-sheet-item action-sheet-item-primary"
              role="menuitem"
              onClick={() => {
                onAchat();
                setOpen(false);
              }}
            >
              <IconAchat />
              <span>Nouvel achat</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
