import { coalesce, opKey, type Op } from './mapping';

export const OUTBOX_KEY = 'electracker_outbox';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadOutbox(storage: StorageLike): Op[] {
  try {
    const raw = storage.getItem(OUTBOX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Op[]) : [];
  } catch {
    return [];
  }
}

function save(storage: StorageLike, ops: Op[]): void {
  if (ops.length === 0) storage.removeItem(OUTBOX_KEY);
  else storage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

export function enqueue(storage: StorageLike, incoming: readonly Op[]): void {
  if (incoming.length === 0) return;
  save(storage, coalesce(loadOutbox(storage), incoming));
}

/**
 * Retire une opération envoyée, sauf si elle a été remplacée entre-temps par une version plus récente
 * (modification faite pendant l'envoi) : celle-ci doit encore partir.
 */
export function removeSent(storage: StorageLike, sent: Op): void {
  const key = opKey(sent);
  const current = loadOutbox(storage);
  const remaining = current.filter((op) => !(opKey(op) === key && JSON.stringify(op) === JSON.stringify(sent)));
  if (remaining.length !== current.length) save(storage, remaining);
}
