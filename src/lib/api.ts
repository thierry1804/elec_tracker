import { API_BASE } from './config';

export class NetworkError extends Error {
  constructor() {
    super('Serveur injoignable');
    this.name = 'NetworkError';
  }
}

export interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export type ApiRequest = (
  method: string,
  path: string,
  body?: unknown,
  contentType?: string,
) => Promise<ApiResponse>;

/** Requête vers l'API avec le cookie de session. Les statuts HTTP ne sont pas des exceptions ; seule la coupure réseau l'est. */
export const apiRequest: ApiRequest = async (method, path, body, contentType = 'application/ld+json') => {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/ld+json',
        ...(body !== undefined ? { 'Content-Type': contentType } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }
  let data: unknown = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { status: res.status, data };
};
