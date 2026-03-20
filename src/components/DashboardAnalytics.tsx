import type { AppData } from '../types';
import { loadSettings } from '../lib/storage';
import { formatMontant } from '../lib/format';
import {
  getComparaisonCeMoisVsDernier,
  getComparaisonPrixMoyenCeMoisVsDernier,
  getTendanceConsoIndicateur,
  getResumeHebdoEtMensuel,
  getPrevisionAnnuelle,
  getEconomieMensuelleSiReduction,
  getRechargeTypique,
  getSaisonnalite,
} from '../lib/analytics';

interface DashboardAnalyticsProps {
  data: AppData;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Évite les pourcentages illisibles quand le dénominateur est quasi nul. */
function formatEvolutionPct(pct: number): { affichage: string; titreExact?: string } {
  const cap = 400;
  const arrondi = Math.round(pct * 10) / 10;
  const avecVirgule = String(arrondi).replace('.', ',');
  const signe = arrondi > 0 ? '+' : '';
  const exact = `${signe}${avecVirgule} %`;
  if (Math.abs(arrondi) > cap) {
    const bref = arrondi > 0 ? `+>${cap} %` : `< −${cap} %`;
    return { affichage: bref, titreExact: exact };
  }
  return { affichage: exact };
}

function EvolutionDelta({ pct }: { pct: number }) {
  const { affichage, titreExact } = formatEvolutionPct(pct);
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return (
    <span
      className={`analytics-delta analytics-delta--${dir}`}
      title={titreExact}
      aria-label={titreExact ? `${affichage}, valeur détaillée : ${titreExact}` : affichage}
    >
      {affichage}
    </span>
  );
}

/** Au-delà, un % brut sur le taux journalier prête à confusion ; on préfère un libellé clair. */
const SEUIL_AFFICHAGE_PCT_TENDANCE = 35;

function StatPair({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="analytics-stat-pair">
      <dt className="analytics-stat-pair-label">{label}</dt>
      <dd className="analytics-stat-pair-body">
        <span className="analytics-stat-pair-value">{value}</span>
        <span className="analytics-stat-pair-sub">{sub}</span>
      </dd>
    </div>
  );
}

export default function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const { releves, achats } = data;
  const resume = getResumeHebdoEtMensuel(releves, achats);
  const comparaison = getComparaisonCeMoisVsDernier(releves, achats);
  const prixComparaison = getComparaisonPrixMoyenCeMoisVsDernier(achats);
  const tendance = getTendanceConsoIndicateur(releves);
  const previsionAnnuelle = getPrevisionAnnuelle(releves, achats);
  const economie = getEconomieMensuelleSiReduction(releves, achats, 10);
  const rechargeTypique = getRechargeTypique(achats);
  const saisonnalite = getSaisonnalite(releves, achats);
  const settings = loadSettings();

  const hasData = releves.length >= 2 || achats.length >= 1;
  const fmt = (ar: number) => formatMontant(ar, settings);

  if (!hasData) return null;

  const kwhSem = `${resume.semaine.kwh} kWh`;
  const kwhMois = `${resume.mois.kwh} kWh`;
  const coutSem = fmt(resume.semaine.coutAr);
  const coutMois = fmt(resume.mois.coutAr);

  const showComparaison =
    comparaison &&
    (comparaison.kwhCeMois > 0 ||
      comparaison.kwhMoisDernier > 0 ||
      comparaison.coutCeMois > 0 ||
      comparaison.coutMoisDernier > 0);

  const showPrix =
    prixComparaison && (prixComparaison.prixCeMois != null || prixComparaison.prixMoisDernier != null);

  return (
    <section className="dashboard-analytics" aria-labelledby="analytics-heading">
      <h3 id="analytics-heading" className="analytics-title">
        Statistiques et tendances
      </h3>

      <div className="analytics-overview">
        <div className="analytics-overview-card">
          <p className="analytics-overview-heading">7 derniers jours</p>
          <dl className="analytics-stat-list">
            <StatPair label="Consommation" value={kwhSem} sub={`Recharges : ${coutSem}`} />
          </dl>
        </div>
        <div className="analytics-overview-card">
          <p className="analytics-overview-heading">Mois en cours</p>
          <dl className="analytics-stat-list">
            <StatPair label="Consommation" value={kwhMois} sub={`Recharges : ${coutMois}`} />
          </dl>
        </div>
      </div>

      {showComparaison && comparaison && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Ce mois par rapport au mois précédent</h4>
          <ul className="analytics-metric-rows">
            <li className="analytics-metric-row">
              <span className="analytics-metric-name">kWh</span>
              <span className="analytics-metric-vals">
                {comparaison.kwhCeMois} <span className="analytics-metric-vs">vs</span>{' '}
                {comparaison.kwhMoisDernier}
              </span>
              {comparaison.evolutionKwhPct != null && (
                <EvolutionDelta pct={comparaison.evolutionKwhPct} />
              )}
            </li>
            <li className="analytics-metric-row">
              <span className="analytics-metric-name">Coût recharges</span>
              <span className="analytics-metric-vals">
                {fmt(comparaison.coutCeMois)} <span className="analytics-metric-vs">vs</span>{' '}
                {fmt(comparaison.coutMoisDernier)}
              </span>
              {comparaison.evolutionCoutPct != null && (
                <EvolutionDelta pct={comparaison.evolutionCoutPct} />
              )}
            </li>
          </ul>
        </div>
      )}

      {showPrix && prixComparaison && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Prix moyen au kWh</h4>
          <p className="analytics-inline-detail">
            Ce mois :{' '}
            {prixComparaison.prixCeMois != null
              ? `${prixComparaison.prixCeMois.toFixed(2).replace('.', ',')} Ar/kWh`
              : '—'}
            {prixComparaison.prixMoisDernier != null && (
              <>
                {' '}
                · Mois précédent :{' '}
                {prixComparaison.prixMoisDernier.toFixed(2).replace('.', ',')} Ar/kWh
              </>
            )}
            {prixComparaison.evolutionPct != null && (
              <>
                {' '}
                <EvolutionDelta pct={prixComparaison.evolutionPct} />
              </>
            )}
          </p>
        </div>
      )}

      {tendance.evolutionPct != null && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Tendance sur 30 jours</h4>
          <p className="analytics-trend-lead">
            {tendance.indicateur === 'baisse' && 'Votre rythme de consommation diminue.'}
            {tendance.indicateur === 'stable' && 'Votre rythme de consommation est stable.'}
            {tendance.indicateur === 'hausse' && 'Votre rythme de consommation augmente.'}
          </p>
          <p
            className="analytics-trend-meta"
            title={
              Math.abs(tendance.evolutionPct) > SEUIL_AFFICHAGE_PCT_TENDANCE
                ? `Comparaison des moyennes de kWh/j (1ʳᵉ moitié vs 2ᵉ moitié des intervalles sur 30 j.) : ${String(tendance.evolutionPct).replace('.', ',')} %`
                : undefined
            }
          >
            {Math.abs(tendance.evolutionPct) <= SEUIL_AFFICHAGE_PCT_TENDANCE ? (
              <>
                Variation moyenne du rythme (kWh/j) :{' '}
                <EvolutionDelta pct={tendance.evolutionPct} />
              </>
            ) : tendance.evolutionPct < 0 ? (
              <>
                En comparant le début et la fin de la période, le rythme moyen est{' '}
                <strong className="analytics-em">nettement plus bas</strong> qu’au début des 30 derniers
                jours.
              </>
            ) : (
              <>
                En comparant le début et la fin de la période, le rythme moyen est{' '}
                <strong className="analytics-em">nettement plus haut</strong> qu’au début des 30 derniers
                jours.
              </>
            )}
          </p>
        </div>
      )}

      {previsionAnnuelle && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Projection sur un an</h4>
          <p className="analytics-projection-main">{fmt(previsionAnnuelle.coutAnnuelEstime)}</p>
          <p className="analytics-projection-range">
            Fourchette indicative : {fmt(previsionAnnuelle.coutMin)} – {fmt(previsionAnnuelle.coutMax)}
          </p>
        </div>
      )}

      {economie != null && economie > 0 && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Si vous réduisez de 10 %</h4>
          <p className="analytics-value">
            Économie d’environ <strong className="analytics-em">{fmt(economie)}</strong> par mois sur les
            recharges, à prix moyen actuel.
          </p>
        </div>
      )}

      {rechargeTypique && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Fréquence des recharges</h4>
          <p className="analytics-value">
            En moyenne, une recharge tous les{' '}
            <strong className="analytics-em">{rechargeTypique.intervalleMoyenJours}</strong> jours.
          </p>
          {rechargeTypique.prochaineRechargeHabitude && (
            <p className="analytics-sub analytics-sub-block">
              Suggestion basée sur l’habitude :{' '}
              <time dateTime={rechargeTypique.prochaineRechargeHabitude.toISOString()}>
                {formatDate(rechargeTypique.prochaineRechargeHabitude)}
              </time>
            </p>
          )}
        </div>
      )}

      {saisonnalite?.message && (
        <div className="analytics-section">
          <h4 className="analytics-section-title">Saisonnalité</h4>
          <p className="analytics-value">{saisonnalite.message}</p>
        </div>
      )}
    </section>
  );
}
