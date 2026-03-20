import {
  getRelevesTries,
  getPrixMoyenArPerKwh,
  getCoutMensuelEstime,
  isPrevisionPeuFiable,
} from '../lib/calculs';
import { loadSettings } from '../lib/storage';
import type { AppData } from '../types';
import { usePrevision } from '../context/PrevisionContext';
import { useLayoutActions } from '../context/LayoutContext';
import ArcGauge from './ArcGauge';
import './DashboardCards.css';

const MAX_CREDIT_GAUGE = 100;

type CreditStatus = 'healthy' | 'warning' | 'critical';

function getCreditStatus(pct: number): CreditStatus {
  if (pct > 0.3) return 'healthy';
  if (pct > 0.1) return 'warning';
  return 'critical';
}

interface DashboardCardsProps {
  data: AppData;
}

export default function DashboardCards({ data }: DashboardCardsProps) {
  const { releves, achats } = data;
  const prevision = usePrevision();
  const { tauxJournalier, joursRestants, loading: previsionLoading } = prevision;
  const tries = getRelevesTries(releves);
  const dernierReleve = tries[tries.length - 1];
  const creditRestant = dernierReleve?.creditRestantKwh ?? 0;
  const dateDernierReleve = dernierReleve?.date;

  const normalizeDateStrToMsNoon = (value: string): number => {
    if (value.includes('T')) return new Date(value).getTime();
    const [y, m, d] = value.split('-').map((v) => Number(v));
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    return dt.getTime();
  };

  const isEmpty = releves.length === 0;

  const achatDebug =
    !isEmpty && achats.length > 0 && tries.length > 0
      ? (() => {
          const achatsTries = [...achats].sort(
            (a, b) => normalizeDateStrToMsNoon(a.date) - normalizeDateStrToMsNoon(b.date)
          );
          const lastAchat = achatsTries[achatsTries.length - 1];
          const achatTimeMs = normalizeDateStrToMsNoon(lastAchat.date);
          const baseReleve = [...tries]
            .reverse()
            .find((r) => normalizeDateStrToMsNoon(r.date) < achatTimeMs) ?? null;
          const creditAttendu = (baseReleve?.creditRestantKwh ?? 0) + lastAchat.creditKwh;
          const diff = Math.abs(creditAttendu - creditRestant);
          if (diff > 0.05) {
            return {
              lastAchat,
              baseReleve,
              creditAttendu,
              diff,
            };
          }
          return null;
        })()
      : null;

  const maxCredit = Math.max(
    MAX_CREDIT_GAUGE,
    ...tries.map((r) => r.creditRestantKwh),
    1
  );
  const pct = creditRestant / maxCredit;
  const creditStatus = getCreditStatus(pct);

  const prixMoyen = getPrixMoyenArPerKwh(achats);
  const coutMensuel =
    tauxJournalier != null && prixMoyen != null
      ? getCoutMensuelEstime(tauxJournalier, prixMoyen)
      : null;
  const kwhMoisEstime =
    tauxJournalier != null
      ? Math.round(tauxJournalier * 30 * 10) / 10
      : null;
  const previsionPeuFiable = isPrevisionPeuFiable(releves);

  const settings = loadSettings();
  const budgetAr = settings.budgetMensuelAr;
  const objectifKwh = settings.objectifKwhMois;
  const budgetOk =
    budgetAr != null && coutMensuel != null
      ? coutMensuel <= budgetAr
      : null;
  const objectifKwhOk =
    objectifKwh != null && kwhMoisEstime != null
      ? kwhMoisEstime <= objectifKwh
      : null;
  const depassementAr =
    budgetAr != null && coutMensuel != null && coutMensuel > budgetAr
      ? Math.round(coutMensuel - budgetAr)
      : null;
  const depassementKwh =
    objectifKwh != null && kwhMoisEstime != null && kwhMoisEstime > objectifKwh
      ? Math.round((kwhMoisEstime - objectifKwh) * 10) / 10
      : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="dashboard-cards">
      {/* Hero — Crédit restant */}
      <div className="hero-card">
        <div className="hero-top">
          <div>
            <div className="hero-label">CRÉDIT RESTANT</div>
            <div
              className={`hero-value ${isEmpty ? 'empty' : creditStatus}`}
            >
              {isEmpty ? '—' : creditRestant}
              {!isEmpty && <span className="hero-unit">kWh</span>}
            </div>
            {isEmpty ? (
              <div className="hero-sub" style={{ marginTop: 10 }}>
                Ajoutez un relevé pour voir votre solde
              </div>
            ) : (
              <div className="hero-sub" style={{ marginTop: 10 }}>
                {joursRestants != null && joursRestants > 0 ? (
                  <>Prochaine recharge suggérée dans <span>{joursRestants} jour{joursRestants !== 1 ? 's' : ''}</span></>
                ) : (
                  <>Solde au {dateDernierReleve && formatDate(dateDernierReleve)}</>
                )}
                {achatDebug && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                    Dernier achat: +{achatDebug.lastAchat.creditKwh.toFixed(2)} kWh · base:{' '}
                    {achatDebug.baseReleve ? `${achatDebug.baseReleve.creditRestantKwh.toFixed(2)} kWh` : '—'} ·
                    attendu: {achatDebug.creditAttendu.toFixed(2)} kWh · actuel: {creditRestant.toFixed(2)} kWh
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="gauge-wrap">
            <ArcGauge
              pct={isEmpty ? 0 : pct}
              color={isEmpty ? 'critical' : creditStatus}
            />
            <div className="gauge-label">Niveau</div>
          </div>
        </div>

        <div className="progress-track">
          <div
            className={`progress-fill ${isEmpty ? 'empty' : creditStatus}`}
            style={{
              width: isEmpty ? '0%' : `${Math.min(100, pct * 100)}%`,
            }}
          />
        </div>
        {!isEmpty && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>0 kWh</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {Math.round(maxCredit)} kWh max
            </span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon icon-blue">📅</div>
          <div className="stat-label">Jours restants</div>
          {isEmpty ? (
            <div className="stat-empty">—</div>
          ) : (
            <div
              className="stat-value mono"
              style={{ color: 'var(--blue)' }}
            >
              {joursRestants !== null ? joursRestants : '—'}
            </div>
          )}
          <div className="stat-sub">Estimation au rythme actuel</div>
        </div>

        <div className="stat-card accent-blue">
          <div className="stat-icon icon-green">⚡</div>
          <div className="stat-label">Conso. / jour</div>
          {isEmpty ? (
            <div className="stat-empty">—</div>
          ) : (
            <div
              className="stat-value mono"
              style={{ color: 'var(--green)' }}
            >
              {tauxJournalier != null
                ? tauxJournalier.toFixed(2)
                : '—'}
              {tauxJournalier != null && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}> kWh</span>
              )}
            </div>
          )}
          <div className="stat-sub">
            Moy. pondérée 7j / 30j
            {previsionLoading && <span> (IA…)</span>}
            {!previsionLoading && previsionPeuFiable && tauxJournalier != null && (
              <span className="stat-sub-warning">
                {' '}
                — peu fiable
              </span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-amber">💰</div>
          <div className="stat-label">Prix moyen</div>
          {isEmpty ? (
            <div className="stat-empty">—</div>
          ) : (
            <div
              className="stat-value mono"
              style={{ color: 'var(--amber)' }}
            >
              {prixMoyen != null ? prixMoyen.toFixed(2).replace('.', ',') : '—'}
              {prixMoyen != null && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {' '}
                  Ar/kWh
                </span>
              )}
            </div>
          )}
          <div className="stat-sub">Tous achats confondus</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-purple">📊</div>
          <div className="stat-label">Coût mensuel est.</div>
          {isEmpty ? (
            <div className="stat-empty">—</div>
          ) : (
            <div
              className="stat-value mono"
              style={{ color: '#a78bfa' }}
            >
              {coutMensuel != null
                ? coutMensuel >= 1000
                  ? `${(coutMensuel / 1000).toFixed(2)}k`
                  : coutMensuel.toFixed(2).replace('.', ',')
                : '—'}
              {coutMensuel != null && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {' '}
                  Ar
                </span>
              )}
            </div>
          )}
          <div className="stat-sub">
            {kwhMoisEstime != null
              ? `Basé sur ~${kwhMoisEstime.toFixed(2)} kWh / 30j`
              : 'Basé sur 30 jours'}
          </div>
        </div>
      </div>

      {/* Indicateurs objectif / budget */}
      {(budgetAr != null || objectifKwh != null) && !isEmpty && (
        <div className="budget-indicators">
          {budgetAr != null && coutMensuel != null && (
            <div
              className={`budget-indicator ${budgetOk ? 'budget-ok' : 'budget-over'}`}
              role="status"
            >
              {budgetOk ? (
                <>Budget : dans la cible</>
              ) : (
                <>Dépassement : +{depassementAr?.toLocaleString('fr-FR')} Ar</>
              )}
            </div>
          )}
          {objectifKwh != null && kwhMoisEstime != null && (
            <div
              className={`budget-indicator ${objectifKwhOk ? 'budget-ok' : 'budget-over'}`}
              role="status"
            >
              {objectifKwhOk ? (
                <>Consommation : dans la cible</>
              ) : (
                <>Au-dessus de l'objectif : +{depassementKwh} kWh</>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProchainAchatCTA({ data }: { data: AppData }) {
  const layoutActions = useLayoutActions();
  const { releves } = data;
  const prevision = usePrevision();
  const { prochainAchatDate, kwhAchatSuggere, joursRestants } = prevision;
  const isEmpty = releves.length === 0;
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  const joursAvantAchat =
    prochainAchatDate && joursRestants != null
      ? Math.max(0, joursRestants - 3)
      : null;

  return (
    <div className="cta-prochain-achat">
      <div>
        <div className="cta-label">⚡ Prochain achat suggéré</div>
        {isEmpty ? (
          <div className="cta-sub">
            En attente de données de consommation…
          </div>
        ) : (
          <>
            <div className="cta-value">
              {kwhAchatSuggere != null
                ? `${kwhAchatSuggere} kWh`
                : prochainAchatDate
                  ? formatDate(prochainAchatDate.toISOString())
                  : '—'}
            </div>
            <div className="cta-sub">
              {joursAvantAchat != null && joursAvantAchat >= 0
                ? `dans environ ${joursAvantAchat} jour${joursAvantAchat !== 1 ? 's' : ''}`
                : prochainAchatDate
                  ? '3 jours avant épuisement'
                  : '—'}
            </div>
          </>
        )}
      </div>
      {!isEmpty && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => layoutActions?.openAchat()}
        >
          Acheter maintenant
        </button>
      )}
    </div>
  );
}
