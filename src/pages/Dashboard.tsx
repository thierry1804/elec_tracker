import { useApp } from '../context/AppContext';
import DashboardCards from '../components/DashboardCards';
import SoldeChart from '../components/SoldeChart';
import ConsommationChart from '../components/ConsommationChart';
import {
  getRelevesTries,
  getTauxJournalierPrediction,
  getDateEpuisementEstimee,
  getJoursRestants,
  isAlerteCreditFaible,
} from '../lib/calculs';

export default function Dashboard() {
  const { data } = useApp();
  const { releves } = data;
  const tries = getRelevesTries(releves);
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const tauxJournalier = getTauxJournalierPrediction(releves);
  const dateEpuisement =
    tauxJournalier != null &&
    tauxJournalier > 0 &&
    dernierReleve?.date
      ? getDateEpuisementEstimee(creditRestant, tauxJournalier, dernierReleve.date)
      : null;
  const joursRestants = getJoursRestants(dateEpuisement);
  const alerte = isAlerteCreditFaible(creditRestant, joursRestants ?? 0);

  const hasReleves = releves.length > 0;
  const predictionDisponible = joursRestants !== null;
  const showAlert = hasReleves && alerte && predictionDisponible;

  return (
    <div className="dashboard">
      {!hasReleves && (
        <div className="alert-banner alert-info" role="status">
          Ajoutez un relevé (bouton « + Relevé ») pour afficher le solde et les prévisions.
        </div>
      )}
      {showAlert && (
        <div className="alert-banner" role="alert">
          Votre crédit sera épuisé dans {joursRestants ?? 0} jour{(joursRestants ?? 0) !== 1 ? 's' : ''}.
          Pensez à recharger à temps.
        </div>
      )}
      <DashboardCards data={data} />
      <SoldeChart releves={releves} />
      <ConsommationChart releves={releves} />
    </div>
  );
}
