import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchMe, importLegacyData, loginWithGoogle, logoutRequest } from '../lib/auth';
import { getEngine, startSync, stopSync } from '../lib/sync';
import {
  buildLegacyImport,
  copyLive,
  getOwner,
  hasLegacyData,
  LEGACY_STASH,
  OWNER_KEY,
  restoreStash,
  setOwner,
  stashLive,
  type LegacyExport,
} from '../lib/sync/cache';
import GoogleSignInButton from './GoogleSignInButton';
import './AuthGate.css';

type Phase =
  | { name: 'loading' }
  | { name: 'login'; message?: string }
  | { name: 'import'; email: string; legacy: LegacyExport; error?: string; busy?: boolean }
  | { name: 'syncing' }
  | { name: 'ready'; email: string; offline: boolean };

const LOGIN_ERRORS: Record<string, string> = {
  forbidden: "Ce compte Google n'est pas autorisé à utiliser ElecTracker.",
  invalid: 'Connexion Google refusée. Réessayez.',
  offline: 'Serveur injoignable. Vérifiez votre connexion.',
  error: 'Une erreur est survenue. Réessayez.',
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">ElecTracker</h1>
        {children}
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const booted = useRef(false);

  const finishSync = useCallback(async (email: string, offline: boolean) => {
    setPhase({ name: 'syncing' });
    const engine = startSync();
    if (offline) {
      engine.scheduleFlush(0);
    } else {
      const result = await Promise.race([
        engine.pull('apply'),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 10_000)),
      ]);
      if (result === 'unauth') {
        stopSync();
        setPhase({ name: 'login', message: 'Session expirée. Reconnectez-vous.' });
        return;
      }
    }
    setPhase({ name: 'ready', email, offline });
  }, []);

  /** Rattache le cache local au compte qui vient de se connecter, puis synchronise. */
  const proceed = useCallback(
    async (email: string) => {
      const owner = getOwner();
      if (owner && owner !== email) {
        stashLive(owner);
        restoreStash(email);
        setOwner(email);
      } else if (!owner) {
        if (hasLegacyData()) {
          setPhase({ name: 'import', email, legacy: buildLegacyImport() });
          return;
        }
        restoreStash(email);
        setOwner(email);
      }
      await finishSync(email, false);
    },
    [finishSync],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      const me = await fetchMe();
      if (me.status === 'ok') return proceed(me.email);
      if (me.status === 'unauth') return setPhase({ name: 'login' });
      const owner = getOwner();
      if (owner) return finishSync(owner, true);
      setPhase({ name: 'login', message: 'Connexion requise : serveur injoignable.' });
    })();
  }, [proceed, finishSync]);

  const onCredential = useCallback(
    async (credential: string) => {
      const res = await loginWithGoogle(credential);
      if (res.ok) await proceed(res.email);
      else setPhase({ name: 'login', message: LOGIN_ERRORS[res.reason] });
    },
    [proceed],
  );

  const logout = useCallback(async () => {
    const owner = getOwner();
    stopSync();
    await logoutRequest();
    if (owner) stashLive(owner);
    localStorage.removeItem(OWNER_KEY);
    setPhase({ name: 'login' });
  }, []);

  // Session expirée pendant l'utilisation : retour à l'écran de connexion (la file d'attente est conservée).
  const readyEmail = phase.name === 'ready' ? phase.email : null;
  useEffect(() => {
    if (!readyEmail) return;
    return getEngine()?.subscribe((st) => {
      if (st.state === 'unauth') {
        stopSync();
        setPhase({ name: 'login', message: 'Session expirée. Reconnectez-vous.' });
      }
    });
  }, [readyEmail]);

  const authValue = useMemo(
    () => (phase.name === 'ready' ? { email: phase.email, offline: phase.offline, logout: () => void logout() } : null),
    [phase, logout],
  );

  if (phase.name === 'loading' || phase.name === 'syncing') {
    return (
      <Shell>
        <p className="auth-muted" role="status">
          {phase.name === 'syncing' ? 'Synchronisation de vos données…' : 'Chargement…'}
        </p>
      </Shell>
    );
  }

  if (phase.name === 'login') {
    return (
      <Shell>
        <p className="auth-muted">Suivez votre consommation d&apos;électricité. Connectez-vous pour retrouver vos données sur tous vos appareils.</p>
        {phase.message && (
          <p className="auth-error" role="alert">
            {phase.message}
          </p>
        )}
        <GoogleSignInButton onCredential={onCredential} />
      </Shell>
    );
  }

  if (phase.name === 'import') {
    const { legacy, email } = phase;
    const sum = (key: 'achats' | 'releves') => legacy.payload.compteurs.reduce((n, c) => n + c[key].length, 0);
    const compteurs = legacy.payload.compteurs.filter((c) => c.achats.length + c.releves.length > 0 || c.id !== 'principal').length;
    const importNow = async () => {
      setPhase({ ...phase, busy: true, error: undefined });
      const res = await importLegacyData(legacy.payload);
      if (!res.ok) {
        setPhase({ ...phase, busy: false, error: res.error });
        return;
      }
      copyLive('avant-import');
      setOwner(email);
      await finishSync(email, false);
    };
    const skip = async () => {
      stashLive(LEGACY_STASH);
      setOwner(email);
      await finishSync(email, false);
    };
    return (
      <Shell>
        <h2 className="auth-subtitle">Données trouvées sur cet appareil</h2>
        <p className="auth-muted">
          Cet appareil contient {sum('releves')} relevé(s) et {sum('achats')} achat(s) sur {compteurs} compteur(s),
          enregistrés avant la connexion. Les importer dans le compte <strong>{email}</strong> ?
        </p>
        {legacy.skipped > 0 && (
          <p className="auth-muted">{legacy.skipped} ligne(s) invalide(s) (montant nul ou date illisible) ne seront pas importées.</p>
        )}
        {phase.error && (
          <p className="auth-error" role="alert">
            Import impossible : {phase.error}
          </p>
        )}
        <div className="auth-actions">
          <button type="button" className="btn btn-primary" disabled={phase.busy} onClick={() => void importNow()}>
            {phase.busy ? 'Import…' : 'Importer mes données'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={phase.busy} onClick={() => void skip()}>
            Ne pas importer
          </button>
        </div>
        <p className="auth-muted auth-fineprint">Ces données restent sauvegardées sur l&apos;appareil dans tous les cas.</p>
      </Shell>
    );
  }

  return <AuthContext.Provider value={authValue!}>{children}</AuthContext.Provider>;
}
