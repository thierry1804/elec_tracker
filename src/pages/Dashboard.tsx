import { useApp } from '../context/AppContext';
import { useLayoutActions } from '../context/LayoutContext';
import { usePrevision } from '../context/PrevisionContext';
import DashboardCards, { ProchainAchatCTA } from '../components/DashboardCards';
import SoldeChart from '../components/SoldeChart';
import ConsommationChart from '../components/ConsommationChart';
import { isAlerteCreditFaible, getMessageAvertissementPrevision } from '../lib/calculs';

export default function Dashboard() {
  const { data } = useApp();
  const layoutActions = useLayoutActions();
  const prevision = usePrevision();
  const { releves } = data;
  const tries = [...releves].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const { joursRestants } = prevision;
  const alerte = isAlerteCreditFaible(creditRestant, joursRestants ?? 0);

  const hasReleves = releves.length > 0;
  const predictionDisponible = joursRestants !== null;
  const showAlert = hasReleves && alerte && predictionDisponible;
  const messagePrevision = getMessageAvertissementPrevision(releves);

  return (
    <div className="dashboard">
      {!hasReleves && (
        <div className="cta-banner" role="status">
          <div className="cta-text">
            <strong>Commencez ici —</strong> ajoutez votre premier relevé de compteur pour activer le tableau de bord.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => layoutActions?.openReleve()}
          >
            + Relevé
          </button>
        </div>
      )}
      {hasReleves && messagePrevision && (
        <div className="alert-banner alert-warning" role="status">
          {messagePrevision}
        </div>
      )}
      {showAlert && (
        <div className="alert-banner" role="alert">
          Votre crédit sera épuisé dans {joursRestants ?? 0} jour{(joursRestants ?? 0) !== 1 ? 's' : ''}.
          Pensez à recharger à temps.
        </div>
      )}
      <DashboardCards data={data} />
      <div className="grid-2">
        <SoldeChart releves={releves} />
        <ConsommationChart releves={releves} />
      </div>
      <ProchainAchatCTA data={data} />
    </div>
  );
}
