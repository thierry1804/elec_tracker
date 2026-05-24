import { useEffect, useState } from 'react';

interface KeyboardShortcutHandlers {
  onReleve: () => void;
  onAchat: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (document.querySelector('.modal-overlay')) return true;
  return false;
}

export function useKeyboardShortcuts({ onReleve, onAchat }: KeyboardShortcutHandlers) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowHelp((h) => !h);
        return;
      }
      if (showHelp && e.key === 'Escape') {
        setShowHelp(false);
        return;
      }
      if (showHelp) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'r') {
        e.preventDefault();
        onReleve();
      } else if (e.key === 'a') {
        e.preventDefault();
        onAchat();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onReleve, onAchat, showHelp]);

  return { showHelp, setShowHelp };
}
