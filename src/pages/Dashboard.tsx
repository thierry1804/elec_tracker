import { useApp } from '../context/AppContext';
import { useLayoutActions } from '../context/LayoutContext';
import { usePrevision } from '../context/PrevisionContext';
import DashboardCards, { ProchainAchatCTA } from '../components/DashboardCards';
import DashboardAnalytics from '../components/DashboardAnalytics';
import SoldeChart from '../components/SoldeChart';
import ConsommationChart from '../components/ConsommationChart';
import {
  isAlerteCreditFaible,
  getMessageAvertissementPrevision,
  getCoutMensuelEstime,
  getPrixMoyenArPerKwh,
} from '../lib/calculs';
import { getAnomalieConsommation } from '../lib/analytics';
import { loadSettings } from '../lib/storage';
import { getConseilContextuel } from '../lib/conseils';

export default function Dashboard() {
  const { data } = useApp();
  const layoutActions = useLayoutActions();
  const prevision = usePrevision();
  const { releves, achats } = data;
  const tries = [...releves].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const { tauxJournalier, joursRestants } = prevision;
  const alerte = isAlerteCreditFaible(creditRestant, joursRestants ?? 0);

  const hasReleves = releves.length > 0;
  const predictionDisponible = joursRestants !== null;
  const showAlert = hasReleves && alerte && predictionDisponible;
  const messagePrevision = getMessageAvertissementPrevision(releves);

  const anomalie = getAnomalieConsommation(releves);
  const showAnomalieAlert = hasReleves && anomalie?.isPic === true;

  const settings = loadSettings();
  const budgetAr = settings.budgetMensuelAr;
  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const coutMensuel =
    tauxJournalier != null && prixMoyen != null
      ? getCoutMensuelEstime(tauxJournalier, prixMoyen)
      : null;
  const showBudgetAlert =
    hasReleves &&
    budgetAr != null &&
    coutMensuel != null &&
    coutMensuel > budgetAr;
  const depassementAr = showBudgetAlert && coutMensuel != null && budgetAr != null
    ? Math.round(coutMensuel - budgetAr)
    : 0;

  const conseil = getConseilContextuel(data, prevision);
  const settingsChart = loadSettings();
  const periodeGraphiques = settingsChart.periodeGraphiques ?? '30';

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
      {showAnomalieAlert && anomalie && (
        <div className="alert-banner alert-warning" role="alert">
          Cette semaine votre conso. est d'environ {anomalie.tauxSemaine} kWh/j vs une moyenne de {anomalie.tauxMoyen} kWh/j — vérifiez un appareil ou une fuite.
        </div>
      )}
      {showBudgetAlert && (
        <div className="alert-banner alert-warning" role="alert">
          Au rythme actuel vous dépasserez votre objectif de {depassementAr.toLocaleString('fr-FR')} Ar ce mois.
        </div>
      )}
      {conseil && (
        <div className="alert-banner alert-info" role="status">
          {conseil}
        </div>
      )}
      <DashboardCards data={data} />
      <div className="grid-2">
        <SoldeChart releves={releves} periodeJours={periodeGraphiques === 'tout' ? undefined : parseInt(periodeGraphiques, 10)} />
        <ConsommationChart releves={releves} periodeJours={periodeGraphiques === 'tout' ? undefined : parseInt(periodeGraphiques, 10)} />
      </div>
      <ProchainAchatCTA data={data} />
      <DashboardAnalytics data={data} />
    </div>
  );
}
