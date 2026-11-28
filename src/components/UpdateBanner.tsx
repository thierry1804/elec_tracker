import { useSyncStatus } from '../lib/sync';

/** Un autre appareil a modifié les données : on ne remplace jamais l'écran en cours d'édition, on propose de recharger. */
export default function UpdateBanner() {
  const { updateAvailable } = useSyncStatus();
  if (!updateAvailable) return null;
  return (
    <div className="alert-banner alert-warning alert-banner-row" role="status">
      <span className="alert-banner-text">Des données ont été modifiées depuis un autre appareil.</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
        Recharger
      </button>
    </div>
  );
}
