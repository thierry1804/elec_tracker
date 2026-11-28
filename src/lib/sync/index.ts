import { useSyncExternalStore } from 'react';
import { apiRequest } from '../api';
import {
  compteurStorageKey,
  loadSettings,
  saveDataRaw,
  saveSettingsRaw,
  setChangeRecorder,
} from '../storage';
import { nomCompteurPrincipal } from '../compteurMode';
import { SyncEngine, type SyncStatus } from './engine';
import { PRINCIPAL_ID, type Cache } from './mapping';

let engine: SyncEngine | null = null;
let teardown: (() => void) | null = null;

const IDLE: SyncStatus = { state: 'idle', pending: 0, lastSync: null, errors: [], updateAvailable: false };

/** Réécrit le cache local depuis l'état serveur, sans que l'observateur y voie une modification utilisateur. */
function writeCache(cache: Cache): void {
  saveSettingsRaw(cache.settings);
  for (const [id, data] of Object.entries(cache.data)) saveDataRaw(id === PRINCIPAL_ID ? undefined : id, data);

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith('electracker_data_')) continue;
    const id = key.slice('electracker_data_'.length);
    if (!(id in cache.data) && key === compteurStorageKey(id)) localStorage.removeItem(key);
  }
}

export function getEngine(): SyncEngine | null {
  return engine;
}

/** Active la synchronisation : observe les écritures locales et surveille réseau / visibilité / minuteur. */
export function startSync(): SyncEngine {
  if (engine) return engine;
  const e = new SyncEngine({
    request: apiRequest,
    storage: localStorage,
    writeCache,
    readPrincipal: () => {
      const s = loadSettings();
      return { nom: nomCompteurPrincipal(s), mode: s.modePrincipal ?? 'prepaye' };
    },
  });
  setChangeRecorder(e.record);

  const check = () => {
    void e.pull('check');
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', onVisible);
  const interval = setInterval(check, 60_000);

  teardown = () => {
    window.removeEventListener('online', check);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(interval);
  };
  engine = e;
  return e;
}

export function stopSync(): void {
  teardown?.();
  teardown = null;
  setChangeRecorder(null);
  engine?.stop();
  engine = null;
}

const noopSubscribe = () => () => {};

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => (engine ? engine.subscribe(cb) : noopSubscribe()),
    () => engine?.getStatus() ?? IDLE,
  );
}
