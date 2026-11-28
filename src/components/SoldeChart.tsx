import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { getDonneesGraphiqueSolde, getProjectionIndexFinDeMois } from '../lib/calculs';
import { useCompteurMode } from '../lib/compteurMode';
import type { Releve } from '../types';
import { usePrevision } from '../context/PrevisionContext';
import ChartShell, { useChartPeriodeJours } from './ChartShell';
import { ChartTooltipContent } from './ChartTooltip';
import {
  CHART_HEIGHT,
  CHART_MARGIN_WITH_RIGHT_LABEL,
  GRID_PROPS,
  LEGEND_STYLE,
  TOOLTIP_STYLE,
  SERIE_REAL,
  SERIE_FORECAST,
  SERIE_BAND,
  SERIE_BAND_STROKE,
  formatDateLong,
  yAxisKwhProps,
  xAxisDateProps,
} from '../lib/chartTheme';
import './Charts.css';
import { formatNombre } from '../lib/format';

interface SoldeChartProps {
  releves: Releve[];
}

interface ChartPoint {
  date: string;
  solde?: number;
  prevision?: number;
  /** Bas de la fourchette : défini seulement à partir du dernier relevé (sinon la bande partirait de zéro). */
  previsionMin?: number;
  previsionMax?: number;
  bandHeight?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TOOLTIP_HIDDEN = ['previsionMin', 'bandHeight', 'intervalle'];

function parseReleveDayMs(dateStr: string): number {
  const d = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
  return new Date(d).getTime();
}

export default function SoldeChart({ releves }: SoldeChartProps) {
  const periodeJours = useChartPeriodeJours();
  const postpaye = useCompteurMode() === 'postpaye';
  const titre = postpaye ? "Évolution de l'index" : 'Évolution du solde';
  const libelleDernier = postpaye ? 'Dernier index' : 'Dernier solde';
  let actualData = getDonneesGraphiqueSolde(releves);
  if (periodeJours != null && periodeJours > 0) {
    const limit = Date.now() - periodeJours * MS_PER_DAY;
    actualData = actualData.filter((p) => parseReleveDayMs(p.date) >= limit);
  }
  const prevision = usePrevision();
  // Prépayé : épuisement du crédit. Postpayé : index attendu jusqu'à la fin du mois courant.
  const projectionMois =
    postpaye && prevision.tauxJournalier != null
      ? getProjectionIndexFinDeMois(releves, prevision.tauxJournalier)
      : null;
  const forecastWithInterval = postpaye
    ? (projectionMois?.points ?? [])
    : prevision.donneesPrevision.length > 0
      ? prevision.donneesPrevision
      : [];

  if (actualData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">{titre}</h3>
        </div>
        <div className="chart-empty">
          <p className="chart-empty-text">Ajoutez des relevés pour voir l'évolution</p>
        </div>
      </div>
    );
  }

  const lastActual = actualData[actualData.length - 1];
  const firstActual = actualData[0];
  const delta =
    actualData.length >= 2 ? lastActual.solde - firstActual.solde : null;
  const deltaStr =
    delta != null
      ? `${delta >= 0 ? '+' : ''}${formatNombre(delta, 1)} kWh sur la période`
      : null;

  const summary = (
    <>
      <span className="chart-summary-item">
        {libelleDernier} <strong className="mono">{formatNombre(lastActual.solde, 1)} kWh</strong>
      </span>
      {deltaStr && <span className="chart-summary-item">{deltaStr}</span>}
    </>
  );

  const dataWithPrevision: ChartPoint[] = actualData.map((p, i) => ({
    date: p.date,
    solde: p.solde,
    prevision: i === actualData.length - 1 ? p.solde : undefined,
    // La fourchette démarre au dernier relevé, avec une hauteur nulle.
    previsionMin: i === actualData.length - 1 ? p.solde : undefined,
    previsionMax: i === actualData.length - 1 ? p.solde : undefined,
    bandHeight: i === actualData.length - 1 ? 0 : undefined,
  }));

  forecastWithInterval.forEach(({ date, solde, soldeMin, soldeMax }) => {
    dataWithPrevision.push({
      date,
      prevision: solde,
      previsionMin: soldeMin,
      previsionMax: soldeMax,
      bandHeight: Math.max(0, soldeMax - soldeMin),
    });
  });

  const hasBand = forecastWithInterval.some((r) => r.soldeMax - r.soldeMin > 0.5);
  const hasForecast = forecastWithInterval.length > 0;
  const lastReleveDate = lastActual.date;
  const forecastEndDate = hasForecast
    ? forecastWithInterval[forecastWithInterval.length - 1].date
    : null;

  const tableRows = [
    ...actualData.map((p) => ({
      date: formatDateLong(p.date),
      solde: `${formatNombre(p.solde, 2)} kWh`,
      type: 'Relevé',
    })),
    ...forecastWithInterval.slice(0, 14).map((p) => ({
      date: formatDateLong(p.date),
      solde: `${formatNombre(p.solde, 2)} kWh`,
      type: postpaye ? 'Projection' : 'Prévision',
    })),
  ].slice(-20);

  return (
    <ChartShell
      title={titre}
      summary={summary}
      showPeriod
      ariaSummary={`${postpaye ? 'Index' : 'Solde'} électrique, dernier relevé ${formatNombre(lastActual.solde, 1)} kilowattheures`}
      tableColumns={[
        { key: 'date', header: 'Date' },
        { key: 'solde', header: postpaye ? 'Index' : 'Solde', align: 'right' },
        { key: 'type', header: 'Type' },
      ]}
      tableRows={tableRows}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={dataWithPrevision} margin={CHART_MARGIN_WITH_RIGHT_LABEL}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" {...xAxisDateProps(dataWithPrevision.length)} />
          <YAxis {...yAxisKwhProps()} />
          <Tooltip
            content={
              <ChartTooltipContent
                hiddenKeys={TOOLTIP_HIDDEN}
                labelFormatter={(l) => formatDateLong(l)}
                rowFormatter={(key, val) => {
                  const labels: Record<string, string> = {
                    solde: postpaye ? 'Index' : 'Solde réel',
                    prevision: postpaye ? 'Projection' : 'Prévision',
                  };
                  return {
                    label: labels[key] ?? key,
                    value: `${formatNombre(val, 2)} kWh`,
                    color: key === 'solde' ? SERIE_REAL : SERIE_FORECAST,
                  };
                }}
              />
            }
            contentStyle={TOOLTIP_STYLE}
          />
          {(hasForecast || hasBand) && (
            <Legend
              {...LEGEND_STYLE}
              formatter={(value) =>
                value === 'solde'
                  ? 'Réel'
                  : value === 'prevision'
                    ? postpaye
                      ? 'Projection fin de mois'
                      : 'Prévision'
                    : value === 'intervalle'
                      ? 'Fourchette'
                      : value
              }
            />
          )}
          {hasForecast && forecastEndDate && (
            <ReferenceArea
              x1={lastReleveDate}
              x2={forecastEndDate}
              fill="oklch(from var(--amber) l c h / 0.06)"
              strokeOpacity={0}
            />
          )}
          <ReferenceLine
            x={lastReleveDate}
            stroke="var(--border)"
            strokeDasharray="4 4"
            label={{
              value: 'Dernier relevé',
              position: 'insideTopRight',
              fill: 'var(--muted)',
              fontSize: 12,
            }}
          />
          {hasBand && (
            <>
              <Area
                type="monotone"
                dataKey="previsionMin"
                stackId="band"
                fill="var(--bg)"
                stroke="none"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="bandHeight"
                stackId="band"
                fill={SERIE_BAND}
                stroke="none"
                name="intervalle"
              />
              <Line
                type="monotone"
                dataKey="previsionMin"
                stroke={SERIE_BAND_STROKE}
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                legendType="none"
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="solde"
            name="solde"
            stroke={SERIE_REAL}
            strokeWidth={2}
            dot={{ r: 3, fill: SERIE_REAL, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: SERIE_REAL }}
            connectNulls={false}
          />
          {hasForecast && (
            <Line
              type="monotone"
              dataKey="prevision"
              name="prevision"
              stroke={SERIE_FORECAST}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
