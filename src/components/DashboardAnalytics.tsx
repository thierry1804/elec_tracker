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

function EvolutionBadge({ pct }: { pct: number }) {
  const up = pct > 0;
  const down = pct < 0;
  const label = up ? `+${pct} %` : `${pct} %`;
  return (
    <span
      className={`analytics-evolution ${up ? 'evolution-up' : down ? 'evolution-down' : 'evolution-neutral'}`}
      aria-label={up ? 'Hausse' : down ? 'Baisse' : 'Stable'}
    >
      {label}
    </span>
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

  return (
    <div className="dashboard-analytics">
      <h3 className="analytics-title">Statistiques et tendances</h3>

      {/* Résumé hebdo / mensuel */}
      <div className="analytics-block analytics-resume">
        <div className="analytics-resume-item">
          <span className="analytics-resume-label">Cette semaine</span>
          <span className="analytics-resume-value">
            {resume.semaine.kwh} kWh · {fmt(resume.semaine.coutAr)}
          </span>
        </div>
        <div className="analytics-resume-item">
          <span className="analytics-resume-label">Ce mois</span>
          <span className="analytics-resume-value">
            {resume.mois.kwh} kWh · {fmt(resume.mois.coutAr)}
          </span>
        </div>
      </div>

      {/* Comparaison ce mois vs mois dernier */}
      {comparaison && (comparaison.kwhCeMois > 0 || comparaison.kwhMoisDernier > 0 || comparaison.coutCeMois > 0 || comparaison.coutMoisDernier > 0) && (
        <div className="analytics-block">
          <div className="analytics-block-label">Ce mois vs mois dernier</div>
          <div className="analytics-comparison">
            <div className="analytics-comparison-row">
              <span>kWh : {comparaison.kwhCeMois} vs {comparaison.kwhMoisDernier}</span>
              {comparaison.evolutionKwhPct != null && (
                <EvolutionBadge pct={comparaison.evolutionKwhPct} />
              )}
            </div>
            <div className="analytics-comparison-row">
              <span>Coût : {fmt(comparaison.coutCeMois)} vs {fmt(comparaison.coutMoisDernier)}</span>
              {comparaison.evolutionCoutPct != null && (
                <EvolutionBadge pct={comparaison.evolutionCoutPct} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prix moyen ce mois vs mois dernier */}
      {prixComparaison && (prixComparaison.prixCeMois != null || prixComparaison.prixMoisDernier != null) && (
        <div className="analytics-block">
          <div className="analytics-block-label">Prix moyen</div>
          <div className="analytics-comparison">
            <span>
              Ce mois : {prixComparaison.prixCeMois != null ? prixComparaison.prixCeMois.toFixed(2).replace('.', ',') : '—'} Ar/kWh
              {prixComparaison.prixMoisDernier != null && (
                <> · Mois dernier : {prixComparaison.prixMoisDernier.toFixed(2).replace('.', ',')} Ar/kWh</>
              )}
            </span>
            {prixComparaison.evolutionPct != null && (
              <EvolutionBadge pct={prixComparaison.evolutionPct} />
            )}
          </div>
        </div>
      )}

      {/* Tendance consommation */}
      {tendance.evolutionPct != null && (
        <div className="analytics-block">
          <div className="analytics-block-label">Tendance consommation (30 j)</div>
          <div className="analytics-tendance">
            <span>
              {tendance.indicateur === 'baisse' && 'Votre conso. baisse'}
              {tendance.indicateur === 'stable' && 'Votre conso. reste stable'}
              {tendance.indicateur === 'hausse' && 'Votre conso. augmente'}
            </span>
            <EvolutionBadge pct={tendance.evolutionPct} />
          </div>
        </div>
      )}

      {/* Lot 2 : Prévision annuelle */}
      {previsionAnnuelle && (
        <div className="analytics-block">
          <div className="analytics-block-label">Prévision annuelle</div>
          <div className="analytics-value">
            Environ {fmt(previsionAnnuelle.coutAnnuelEstime)}
            <span className="analytics-sub">
              {' '}(fourchette {fmt(previsionAnnuelle.coutMin)} – {fmt(previsionAnnuelle.coutMax)})
            </span>
          </div>
        </div>
      )}

      {/* Lot 2 : Objectif économie -10 % */}
      {economie != null && economie > 0 && (
        <div className="analytics-block">
          <div className="analytics-block-label">Objectif économie</div>
          <div className="analytics-value">
            Si vous réduisez de 10 % votre conso., vous économiserez environ {fmt(economie)}/mois.
          </div>
        </div>
      )}

      {/* Lot 2 : Recharge typique */}
      {rechargeTypique && (
        <div className="analytics-block">
          <div className="analytics-block-label">Recharge (habitude)</div>
          <div className="analytics-value">
            En moyenne vous rechargez tous les {rechargeTypique.intervalleMoyenJours} jours.
            {rechargeTypique.prochaineRechargeHabitude && (
              <span className="analytics-sub">
                {' '}Prochaine recharge suggérée (habitude) : {formatDate(rechargeTypique.prochaineRechargeHabitude)}.
              </span>
            )}
          </div>
        </div>
      )}

      {saisonnalite?.message && (
        <div className="analytics-block">
          <div className="analytics-block-label">Saisonnalité</div>
          <div className="analytics-value">{saisonnalite.message}</div>
        </div>
      )}
    </div>
  );
}
