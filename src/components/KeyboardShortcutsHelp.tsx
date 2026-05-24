interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  return (
    <div className="shortcuts-overlay" onClick={onClose} role="presentation">
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <h3 id="shortcuts-title">Raccourcis clavier</h3>
        <ul className="shortcuts-list">
          <li><kbd>r</kbd> Nouveau relevé</li>
          <li><kbd>a</kbd> Nouvel achat</li>
          <li><kbd>?</kbd> Afficher cette aide</li>
          <li><kbd>Échap</kbd> Fermer</li>
        </ul>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
