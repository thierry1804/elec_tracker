import type { AppData } from '../types';

export const EXPORT_VERSION = 1;

export interface ExportPayload {
  version: number;
  exportedAt: string;
  data: AppData;
}

export function exportToJson(data: AppData): string {
  const payload: ExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadBackup(data: AppData): void {
  const json = exportToJson(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `electracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImportPayload(payload: unknown): payload is ExportPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  if (p.version !== 1) return false;
  if (typeof p.exportedAt !== 'string') return false;
  const data = p.data;
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.releves) || !Array.isArray(d.achats)) return false;
  return true;
}

export function parseImportFile(file: File): Promise<ExportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text) as unknown;
        if (validateImportPayload(parsed)) resolve(parsed);
        else reject(new Error('Format de fichier invalide : releves et achats requis.'));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Fichier JSON invalide.'));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function mergeData(existing: AppData, imported: AppData): AppData {
  const existingIdsReleves = new Set(existing.releves.map((r) => r.id));
  const existingIdsAchats = new Set(existing.achats.map((a) => a.id));
  const releves = [
    ...existing.releves,
    ...imported.releves.filter((r) => !existingIdsReleves.has(r.id)),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const achats = [
    ...existing.achats,
    ...imported.achats.filter((a) => !existingIdsAchats.has(a.id)),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return { releves, achats };
}
