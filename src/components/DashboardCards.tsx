import {
  getRelevesTries,
  getPrixMoyenArPerKwh,
  getTauxJournalierPrediction,
  getDateEpuisementEstimee,
  getJoursRestants,
  getProchainAchatSuggere,
  getCoutMensuelEstime,
  isAlerteCreditFaible,
  isPrevisionPeuFiable,
} from '../lib/calculs';
import type { AppData } from '../types';
import './DashboardCards.css';

interface DashboardCardsProps {
  data: AppData;
}

export default function DashboardCards({ data }: DashboardCardsProps) {
  const { releves, achats } = data;
  const tries = getRelevesTries(releves);
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const dateDernierReleve = dernierReleve?.date;

  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const tauxJournalier = getTauxJournalierPrediction(releves);
  const dateEpuisement =
    tauxJournalier != null && tauxJournalier > 0 && dateDernierReleve
      ? getDateEpuisementEstimee(creditRestant, tauxJournalier, dateDernierReleve)
      : null;
  const joursRestants = getJoursRestants(dateEpuisement);
  const prochainAchat = getProchainAchatSuggere(dateEpuisement);
  const coutMensuel = tauxJournalier != null && prixMoyen != null
    ? getCoutMensuelEstime(tauxJournalier, prixMoyen)
    : null;
  const kwhMoisEstime = tauxJournalier != null ? Math.round(tauxJournalier * 30 * 10) / 10 : null;
  const alerte = isAlerteCreditFaible(creditRestant, joursRestants ?? 0);
  const previsionPeuFiable = isPrevisionPeuFiable(releves);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="dashboard-cards">
      <div className={`card card-credit ${alerte ? 'card-alert' : ''}`}>
        <h3>CRÉDIT RESTANT</h3>
        <p className="card-value value-green">{creditRestant} kWh</p>
        {dateDernierReleve && (
          <p className="card-detail">{formatDate(dateDernierReleve)}</p>
        )}
      </div>

      <div className={`card card-jours ${alerte ? 'card-alert' : ''}`}>
        <h3>JOURS RESTANTS</h3>
        <p className="card-value value-blue">
          {joursRestants !== null ? joursRestants : '—'}
        </p>
        {dateEpuisement && (
          <p className="card-detail">Épuisé le {formatDate(dateEpuisement.toISOString())}</p>
        )}
      </div>

      <div className="card">
        <h3>CONSO. JOURNALIÈRE</h3>
        <p className="card-value value-blue">
          {tauxJournalier != null ? `${tauxJournalier.toFixed(2)} kWh/j` : '—'}
        </p>
        <p className="card-detail">
          Moyenne pondérée (7j / 30j / global)
          {previsionPeuFiable && tauxJournalier != null && (
            <span className="card-detail-warning"> — peu fiable (moins de 3 j d’historique)</span>
          )}
        </p>
      </div>

      <div className="card">
        <h3>PRIX MOYEN</h3>
        <p className="card-value value-orange">
          {prixMoyen != null ? `${Math.round(prixMoyen).toLocaleString('fr-FR')} Ar/kWh` : '—'}
        </p>
        <p className="card-detail">Tous achats confondus</p>
      </div>

      <div className="card">
        <h3>COÛT MENSUEL ESTIMÉ</h3>
        <p className="card-value value-orange">
          {coutMensuel != null ? `${coutMensuel.toLocaleString('fr-FR')} Ar` : '—'}
        </p>
        {kwhMoisEstime != null && (
          <p className="card-detail">~ {kwhMoisEstime} kWh/mois</p>
        )}
      </div>

      <div className="card card-prochain card-highlight">
        <h3>PROCHAIN ACHAT SUGGÉRÉ</h3>
        <p className="card-value value-green">
          {prochainAchat ? formatDate(prochainAchat.toISOString()) : '—'}
        </p>
        {joursRestants != null && (
          <p className="card-detail">
            {joursRestants >= 3 ? '3 jours avant épuisement' : 'Épuisement proche'}
          </p>
        )}
      </div>
    </div>
  );
}
