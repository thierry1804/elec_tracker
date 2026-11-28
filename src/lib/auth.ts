import { apiRequest, NetworkError } from './api';
import type { ImportPayload } from './sync/cache';

export type MeResult = { status: 'ok'; email: string } | { status: 'unauth' } | { status: 'offline' };

/** Qui est connecté (cookie de session) ? */
export async function fetchMe(): Promise<MeResult> {
  try {
    const r = await apiRequest('GET', '/auth/me');
    if (r.status === 200 && typeof r.data?.email === 'string') return { status: 'ok', email: r.data.email };
    if (r.status === 401) return { status: 'unauth' };
    return { status: 'offline' };
  } catch (e) {
    if (e instanceof NetworkError) return { status: 'offline' };
    throw e;
  }
}

export type LoginResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'forbidden' | 'invalid' | 'offline' | 'error' };

/** Échange l'ID token Google contre une session (cookie posé par l'API). */
export async function loginWithGoogle(credential: string): Promise<LoginResult> {
  try {
    const r = await apiRequest('POST', '/auth/google', { credential }, 'application/json');
    if (r.status === 200 && typeof r.data?.email === 'string') return { ok: true, email: r.data.email };
    if (r.status === 403) return { ok: false, reason: 'forbidden' };
    if (r.status === 401 || r.status === 422) return { ok: false, reason: 'invalid' };
    return { ok: false, reason: 'error' };
  } catch (e) {
    if (e instanceof NetworkError) return { ok: false, reason: 'offline' };
    throw e;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiRequest('POST', '/auth/logout');
  } catch {
    /* hors ligne : la session expirera d'elle-même ; le cache local est de toute façon verrouillé côté appareil */
  }
}

export interface ImportResult {
  ok: boolean;
  error?: string;
}

/** Envoie les données locales d'avant la connexion (`POST /import`, idempotent). */
export async function importLegacyData(payload: ImportPayload): Promise<ImportResult> {
  try {
    const r = await apiRequest('POST', '/import', payload, 'application/json');
    if (r.status === 200) return { ok: true };
    const detail = r.data?.violations?.[0]
      ? `${r.data.violations[0].propertyPath} : ${r.data.violations[0].message}`
      : (r.data?.detail ?? `HTTP ${r.status}`);
    return { ok: false, error: String(detail) };
  } catch (e) {
    if (e instanceof NetworkError) return { ok: false, error: 'Serveur injoignable.' };
    throw e;
  }
}
