import { createContext, useContext } from 'react';

export interface AuthContextValue {
  email: string;
  /** Session non vérifiée (réseau indisponible) : l'app fonctionne sur le cache local. */
  offline: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthGate');
  return ctx;
}
