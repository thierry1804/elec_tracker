import { NetworkError, type ApiRequest, type ApiResponse } from '../api';
import type { ChangeEvent } from '../storage';
import type { CompteurMode } from '../../types';
import {
  applyOps,
  compteurBody,
  diffData,
  diffSettings,
  emptySnapshot,
  PRINCIPAL_ID,
  snapshotToCache,
  sortOps,
  type Body,
  type Cache,
  type Op,
  type Resource,
  type Snapshot,
} from './mapping';
import { enqueue, loadOutbox, removeSent } from './outbox';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const META_KEY = 'electracker_sync_meta';
const FLUSH_DELAY_MS = 1500;

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'offline' | 'error' | 'unauth';
  /** Opérations locales pas encore envoyées. */
  pending: number;
  lastSync: string | null;
  /** Dernières opérations refusées par le serveur (jamais renvoyées). */
  errors: string[];
  /** Un autre appareil a modifié les données : recharger pour les voir. */
  updateAvailable: boolean;
}

export interface EngineDeps {
  request: ApiRequest;
  storage: StorageLike;
  /** Écrit le cache local à partir de l'état serveur + opérations en attente (sans déclencher d'enregistrement). */
  writeCache: (cache: Cache) => void;
  readPrincipal: () => { nom: string; mode: CompteurMode };
  now?: () => string;
}

type Outcome = 'ok' | 'retry' | 'unauth' | 'drop';
export type PullResult = 'applied' | 'unchanged' | 'changed' | 'skipped' | 'offline' | 'unauth' | 'error';

const classify = (status: number): Outcome =>
  status === 401 ? 'unauth' : status === 403 || status === 408 || status === 429 || status >= 500 ? 'retry' : 'drop';

const members = (data: unknown): Body[] => {
  const d = data as { 'hydra:member'?: Body[]; member?: Body[] } | null;
  return d?.['hydra:member'] ?? d?.member ?? [];
};

/** Retire les propriétés JSON-LD (@id, @type, @context). */
const plain = (b: Body): Body => Object.fromEntries(Object.entries(b).filter(([k]) => !k.startsWith('@')));

const toMap = (items: Body[]): Record<string, Body> =>
  Object.fromEntries(items.map((i) => [String(i.id), plain(i)]));

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${h}`;
}

export class SyncEngine {
  private status: SyncStatus = { state: 'idle', pending: 0, lastSync: null, errors: [], updateAvailable: false };
  private listeners = new Set<(s: SyncStatus) => void>();
  private flushing: Promise<{ sent: number; complete: boolean }> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private principalOk = false;

  constructor(private readonly deps: EngineDeps) {
    this.status.pending = loadOutbox(deps.storage).length;
    this.status.lastSync = this.readMeta().lastSync ?? null;
  }

  getStatus = (): SyncStatus => this.status;

  subscribe = (fn: (s: SyncStatus) => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, pending: loadOutbox(this.deps.storage).length, ...patch };
    this.listeners.forEach((l) => l(this.status));
  }

  private readMeta(): { signature?: string; lastSync?: string } {
    try {
      return JSON.parse(this.deps.storage.getItem(META_KEY) ?? '{}') as { signature?: string; lastSync?: string };
    } catch {
      return {};
    }
  }

  private writeMeta(patch: { signature?: string; lastSync?: string }): void {
    this.deps.storage.setItem(META_KEY, JSON.stringify({ ...this.readMeta(), ...patch }));
  }

  /** Observe une écriture locale et met en file les opérations correspondantes. */
  record = (event: ChangeEvent): void => {
    const ops =
      event.kind === 'data'
        ? diffData(event.before, event.after, event.compteurId)
        : diffSettings(event.before, event.after);
    if (ops.length === 0) return;
    enqueue(this.deps.storage, ops);
    this.set({});
    this.scheduleFlush();
  };

  scheduleFlush = (delay = FLUSH_DELAY_MS): void => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  };

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }

  /** Envoie les opérations en attente, dans l'ordre des dépendances. S'arrête à la première erreur récupérable. */
  flush = (): Promise<{ sent: number; complete: boolean }> => {
    if (!this.flushing) {
      this.flushing = this.doFlush().finally(() => {
        this.flushing = null;
      });
    }
    return this.flushing;
  };

  private async doFlush(): Promise<{ sent: number; complete: boolean }> {
    const initial = loadOutbox(this.deps.storage);
    if (initial.length === 0) {
      this.set({ state: this.status.state === 'unauth' ? 'unauth' : 'idle' });
      return { sent: 0, complete: true };
    }
    this.set({ state: 'syncing' });
    let sent = 0;
    try {
      const principal = await this.ensurePrincipal();
      if (principal !== 'ok') return this.stopOn(principal, sent);

      for (const op of sortOps(loadOutbox(this.deps.storage))) {
        const [outcome, response] = await this.send(op);
        if (outcome === 'ok') {
          removeSent(this.deps.storage, op);
          sent++;
        } else if (outcome === 'drop') {
          removeSent(this.deps.storage, op);
          this.status.errors = [...this.status.errors, this.describe(op, response)].slice(-5);
        } else {
          return this.stopOn(outcome, sent);
        }
        this.set({});
      }
      this.writeMeta({ lastSync: (this.deps.now ?? (() => new Date().toISOString()))() });
      this.set({ state: 'idle', lastSync: this.readMeta().lastSync ?? null });
      return { sent, complete: true };
    } catch (e) {
      if (e instanceof NetworkError) return this.stopOn('retry', sent, true);
      this.set({ state: 'error' });
      return { sent, complete: false };
    }
  }

  private stopOn(outcome: Outcome, sent: number, offline = false): { sent: number; complete: boolean } {
    this.set({ state: outcome === 'unauth' ? 'unauth' : offline ? 'offline' : 'error' });
    return { sent, complete: false };
  }

  private describe(op: Op, response?: ApiResponse): string {
    const d = response?.data as { detail?: string; violations?: { message?: string }[] } | null;
    const reason = d?.violations?.[0]?.message ?? d?.detail ?? `HTTP ${response?.status ?? '?'}`;
    return `${op.resource} « ${op.id} » refusé : ${reason}`;
  }

  private async ensurePrincipal(): Promise<Outcome> {
    if (this.principalOk) return 'ok';
    const { request } = this.deps;
    const got = await request('GET', `/compteurs/${PRINCIPAL_ID}`);
    if (got.status === 200) {
      this.principalOk = true;
      return 'ok';
    }
    if (got.status !== 404) return classify(got.status) === 'drop' ? 'retry' : classify(got.status);
    const principal = this.deps.readPrincipal();
    const created = await request('POST', '/compteurs', compteurBody(PRINCIPAL_ID, principal.nom, principal.mode));
    if (created.status === 201 || created.status === 409) {
      this.principalOk = true;
      return 'ok';
    }
    return classify(created.status) === 'drop' ? 'retry' : classify(created.status);
  }

  private async send(op: Op): Promise<[Outcome, ApiResponse?]> {
    const { request } = this.deps;
    const path = `/${op.resource}/${encodeURIComponent(op.id)}`;

    if (op.deleted) {
      const r = await request('DELETE', path);
      return r.status === 204 || r.status === 404 ? ['ok', r] : [classify(r.status), r];
    }
    let r = await request('PUT', path, op.body);
    if (r.status === 404 && op.resource !== 'parametres') r = await request('POST', `/${op.resource}`, op.body);
    return r.status === 200 || r.status === 201 ? ['ok', r] : [classify(r.status), r];
  }

  private async fetchSnapshot(): Promise<Snapshot | 'unauth' | 'error'> {
    const { request } = this.deps;
    const paths: [Resource | 'p', string][] = [
      ['compteurs', '/compteurs'],
      ['achats', '/achats'],
      ['releves', '/releves'],
      ['p', '/parametres/1'],
    ];
    const responses = await Promise.all(paths.map(([, p]) => request('GET', p)));
    if (responses.some((r) => r.status === 401)) return 'unauth';
    if (responses.some((r) => r.status !== 200)) return 'error';
    const snap = emptySnapshot();
    snap.compteurs = toMap(members(responses[0].data));
    snap.achats = toMap(members(responses[1].data));
    snap.releves = toMap(members(responses[2].data));
    const p = plain(responses[3].data as Body);
    // Une ligne de paramètres jamais enregistrée n'existe pas encore côté serveur : valeurs par défaut.
    snap.parametres = p;
    return snap;
  }

  /**
   * `apply` : réécrit le cache local depuis le serveur (+ opérations en attente), au démarrage.
   * `check` : compare seulement ; signale `updateAvailable` si un autre appareil a modifié les données.
   */
  async pull(mode: 'apply' | 'check'): Promise<PullResult> {
    try {
      let flushedSomething = false;
      if (loadOutbox(this.deps.storage).length > 0) {
        const r = await this.flush();
        flushedSomething = r.sent > 0;
        if (!r.complete) return this.status.state === 'unauth' ? 'unauth' : this.status.state === 'offline' ? 'offline' : 'error';
      }

      const snap = await this.fetchSnapshot();
      if (snap === 'unauth') {
        this.set({ state: 'unauth' });
        return 'unauth';
      }
      if (snap === 'error') {
        this.set({ state: 'error' });
        return 'error';
      }
      const signature = hash(JSON.stringify(snap));

      if (mode === 'apply') {
        this.deps.writeCache(snapshotToCache(applyOps(snap, loadOutbox(this.deps.storage))));
        this.writeMeta({ signature, lastSync: (this.deps.now ?? (() => new Date().toISOString()))() });
        this.set({ state: 'idle', lastSync: this.readMeta().lastSync ?? null, updateAvailable: false });
        return 'applied';
      }

      const previous = this.readMeta().signature;
      if (previous === signature) {
        this.set({ state: this.status.state === 'syncing' ? 'idle' : this.status.state });
        return 'unchanged';
      }
      this.writeMeta({ signature });
      if (previous === undefined || flushedSomething) return 'unchanged';
      this.set({ updateAvailable: true });
      return 'changed';
    } catch (e) {
      if (e instanceof NetworkError) {
        this.set({ state: 'offline' });
        return 'offline';
      }
      this.set({ state: 'error' });
      return 'error';
    }
  }
}
