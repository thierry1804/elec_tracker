/** Base de l'API. En dev : proxy Vite (/__api) vers l'API locale, donc même origine (cookie de session). */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '/__api').replace(/\/$/, '');

/** ID client OAuth Google (public). Vide : la connexion Google est indisponible. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
