import { useApp } from '../context/AppContext';
import { useLayoutActions } from '../context/LayoutContext';
import { usePrevision } from '../context/PrevisionContext';
import DashboardCards, { ProchainAchatCTA } from '../components/DashboardCards';
import DashboardAnalytics from '../components/DashboardAnalytics';
import DashboardAlerts, { type DashboardAlert } from '../components/DashboardAlerts';
import SoldeChart from '../components/SoldeChart';
import ConsommationChart from '../components/ConsommationChart';
import KwhMoisChart from '../components/KwhMoisChart';
import {
  isAlerteCreditFaible,
  getMessageAvertissementPrevision,
  getCoutMensuelEstime,
  getPrixMoyenArPerKwh,
  getRelevesTries,
} from '../lib/calculs';
import { getAnomalieConsommation } from '../lib/analytics';
import { getConseilContextuel } from '../lib/conseils';
import { useSettings } from '../context/SettingsContext';

export default function Dashboard() {
  const { data } = useApp();
  const layoutActions = useLayoutActions();
  const prevision = usePrevision();
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
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

  const { settings } = useSettings();
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

  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const noteDuMois = settings.evenementsParMois?.[currentMonthKey];

  const dashboardAlerts: DashboardAlert[] = [];

  if (showAlert) {
    dashboardAlerts.push({
      id: 'credit',
      kind: 'critical',
      priority: 1,
      message: (
        <>
          Votre crédit sera épuisé dans {joursRestants ?? 0} jour
          {(joursRestants ?? 0) !== 1 ? 's' : ''}. Pensez à recharger à temps.
        </>
      ),
    });
  }
  if (showAnomalieAlert && anomalie) {
    dashboardAlerts.push({
      id: 'anomalie',
      kind: 'warning',
      priority: 2,
      message: (
        <>
          Cette semaine votre conso. est d'environ {anomalie.tauxSemaine} kWh/j vs une moyenne de{' '}
          {anomalie.tauxMoyen} kWh/j : vérifiez un appareil ou une fuite.
        </>
      ),
    });
  }
  if (showBudgetAlert) {
    dashboardAlerts.push({
      id: 'budget',
      kind: 'warning',
      priority: 3,
      message: (
        <>
          Au rythme actuel vous dépasserez votre objectif de {depassementAr.toLocaleString('fr-FR')} Ar
          ce mois.
        </>
      ),
    });
  }
  if (hasReleves && messagePrevision) {
    dashboardAlerts.push({
      id: 'prevision',
      kind: 'warning',
      priority: 4,
      message: messagePrevision,
    });
  }
  if (conseil) {
    dashboardAlerts.push({
      id: 'conseil',
      kind: 'info',
      priority: 5,
      message: conseil,
    });
  }
  if (noteDuMois) {
    dashboardAlerts.push({
      id: 'note',
      kind: 'info',
      priority: 6,
      message: (
        <>
          <strong>Note du mois :</strong> {noteDuMois}
        </>
      ),
    });
  }

  if (!hasReleves) {
    return (
      <div className="dashboard">
        <div className="dashboard-empty" role="status">
          <h2 className="dashboard-empty-title">Bienvenue sur ElecTracker</h2>
          <p className="dashboard-empty-text">
            Saisissez votre premier relevé de compteur pour afficher votre solde, vos graphiques et
            vos estimations de consommation.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => layoutActions?.openReleve()}
          >
            + Premier relevé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <DashboardAlerts alerts={dashboardAlerts} />
      <DashboardCards data={data} />
      <div className="grid-2">
        <SoldeChart releves={releves} />
        <ConsommationChart releves={releves} />
      </div>
      <KwhMoisChart data={data} />
      <ProchainAchatCTA data={data} />
      <DashboardAnalytics data={data} />
    </div>
  );
}
