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
import { useAiInterpretation } from '../hooks/useAiInterpretation';
import { useSettings } from '../context/SettingsContext';
import { getJoursDepuisReleve, SEUIL_JOURS_RELEVE_POSTPAYE, useCompteurMode } from '../lib/compteurMode';
import CollapsibleSection from '../components/CollapsibleSection';
import PageHeader from '../components/PageHeader';

export default function Dashboard() {
  const { data } = useApp();
  const layoutActions = useLayoutActions();
  const prevision = usePrevision();
  const { releves, achats } = data;
  const mode = useCompteurMode();
  const postpaye = mode === 'postpaye';
  const tries = getRelevesTries(releves);
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const { tauxJournalier, joursRestants } = prevision;
  const alerte = !postpaye && isAlerteCreditFaible(creditRestant, joursRestants ?? 0);
  const joursDepuisReleve = getJoursDepuisReleve(dernierReleve?.date);
  const releveAncien =
    postpaye &&
    joursDepuisReleve != null &&
    joursDepuisReleve > SEUIL_JOURS_RELEVE_POSTPAYE;

  const hasReleves = releves.length > 0;
  const predictionDisponible = joursRestants !== null;
  const showAlert = hasReleves && alerte && predictionDisponible;
  const messagePrevision = getMessageAvertissementPrevision(releves, mode);

  const anomalie = getAnomalieConsommation(releves, mode);
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

  const conseil = getConseilContextuel(data, prevision, mode);
  const aiInterpretation = useAiInterpretation(data, prevision);

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
      action: layoutActions
        ? { label: 'Recharger', onClick: () => layoutActions.openAchat() }
        : undefined,
    });
  }
  if (releveAncien) {
    dashboardAlerts.push({
      id: 'releve-ancien',
      kind: 'warning',
      priority: 1,
      message: (
        <>
          Dernier relevé il y a {joursDepuisReleve} jours. Notez l'index du compteur.
        </>
      ),
      action: layoutActions
        ? { label: 'Relevé', onClick: () => layoutActions.openReleve() }
        : undefined,
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
  if (aiInterpretation.result) {
    dashboardAlerts.push({
      id: 'analyse-ia',
      kind: 'info',
      priority: 5,
      message: (
        <>
          <strong>Analyse :</strong> {aiInterpretation.result.interpretation}
          {aiInterpretation.result.recommandations.length > 0 && (
            <ul className="dashboard-alert-list">
              {aiInterpretation.result.recommandations.map((rec) => (
                <li key={rec}>{rec}</li>
              ))}
            </ul>
          )}
        </>
      ),
    });
  } else if (conseil) {
    dashboardAlerts.push({
      id: 'conseil',
      kind: 'info',
      priority: 5,
      message: conseil,
    });
  } else if (aiInterpretation.loading) {
    dashboardAlerts.push({
      id: 'analyse-loading',
      kind: 'info',
      priority: 5,
      message: 'Analyse locale en cours…',
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
      <div className="page dashboard">
        <div className="dashboard-empty" role="status">
          <h2 className="dashboard-empty-title">Bienvenue sur ElecTracker</h2>
          <p className="dashboard-empty-text">
            {postpaye
              ? 'Pour suivre votre électricité postpayée :'
              : 'Trois étapes pour suivre votre électricité prépayée :'}
          </p>
          <ol className="dashboard-empty-steps">
            {postpaye ? (
              <>
                <li><strong>Relevé d'index</strong> : notez le kWh cumulé affiché sur le compteur</li>
                <li><strong>Facture</strong> : enregistrez le montant et les kWh facturés</li>
                <li><strong>Relevés réguliers</strong> : mettez à jour l'index pour suivre la consommation</li>
              </>
            ) : (
              <>
                <li><strong>Relevé initial</strong> : notez le kWh restant sur le compteur</li>
                <li><strong>Achat</strong> : enregistrez chaque recharge (montant + crédit)</li>
                <li><strong>Relevés réguliers</strong> : mettez à jour le solde pour affiner les estimations</li>
              </>
            )}
          </ol>
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
    <div className="dashboard page">
      <PageHeader
        title="Dashboard"
        lead={
          postpaye
            ? `Index ${creditRestant.toFixed(1).replace('.', ',')} kWh`
            : joursRestants != null
              ? `${creditRestant.toFixed(1).replace('.', ',')} kWh restants · ~${joursRestants} j`
              : `${creditRestant.toFixed(1).replace('.', ',')} kWh restants`
        }
      />
      <div className="page-stack">
      <DashboardAlerts alerts={dashboardAlerts} />
      <DashboardCards data={data} />
      <div className="grid-2">
        <SoldeChart releves={releves} />
        <ConsommationChart releves={releves} />
      </div>
      <CollapsibleSection title="Analyse détaillée" defaultOpen={false}>
        <KwhMoisChart data={data} />
        {!postpaye && <ProchainAchatCTA data={data} />}
        <DashboardAnalytics data={data} />
      </CollapsibleSection>
      </div>
    </div>
  );
}
