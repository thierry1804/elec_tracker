import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../lib/config';

interface GoogleId {
  initialize: (config: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup' | 'redirect'; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT_SRC, async: true, defer: true });
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Chargement du script Google impossible')), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => onCredential(r.credential),
          ux_mode: 'popup',
          auto_select: false,
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'fr',
          width: 280,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger la connexion Google. Vérifiez votre connexion.');
      });
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID) {
    return <p className="auth-error">La connexion Google n&apos;est pas configurée (VITE_GOOGLE_CLIENT_ID).</p>;
  }
  return (
    <>
      <div ref={ref} className="auth-google-button" />
      {error && <p className="auth-error">{error}</p>}
    </>
  );
}
