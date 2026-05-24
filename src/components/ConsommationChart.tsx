import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getDonneesGraphiqueConso } from '../lib/calculs';
import { useSettings } from '../context/SettingsContext';
import { usePrevision } from '../context/PrevisionContext';
import type { Releve } from '../types';
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
  yAxisKwhProps,
  formatDateLong,
} from '../lib/chartTheme';
import './Charts.css';

interface ConsommationChartProps {
  releves: Releve[];
}

interface ConsoChartRow {
  dateIso: string;
  label: string;
  conso: number | null;
  previsionConso: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default function ConsommationChart({ releves }: ConsommationChartProps) {
  const { settings } = useSettings();
  const periodeJours = useChartPeriodeJours();
  const prevision = usePrevision();
  const objectifKwhJour =
    settings.objectifKwhMois != null
      ? Math.round((settings.objectifKwhMois / 30) * 100) / 100
      : null;

  let histo = getDonneesGraphiqueConso(releves);
  if (periodeJours != null && periodeJours > 0) {
    const limit = Date.now() - periodeJours * MS_PER_DAY;
    histo = histo.filter((p) => new Date(p.dateIso + 'T12:00:00').getTime() >= limit);
  }

  const taux = prevision.tauxJournalier;
  const forecast =
    taux != null && taux > 0 && prevision.donneesPrevision.length > 0
      ? prevision.donneesPrevision
      : [];

  const rowMap = new Map<string, ConsoChartRow>();
  for (const p of histo) {
    rowMap.set(p.dateIso, {
      dateIso: p.dateIso,
      label: p.label,
      conso: p.conso,
      previsionConso: null,
    });
  }
  for (const { date } of forecast) {
    const existing = rowMap.get(date);
    if (existing?.conso != null) continue;
    rowMap.set(date, {
      dateIso: date,
      label: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }),
      conso: null,
      previsionConso: taux!,
    });
  }
  const data = [...rowMap.values()].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const hasHisto = histo.length > 0;

  if (!hasHisto) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Consommation entre relevés</h3>
        </div>
        <div className="chart-empty">
          <p className="chart-empty-text">Ajoutez au moins 2 relevés</p>
        </div>
      </div>
    );
  }

  const consoValues = histo.map((p) => p.conso).filter((v) => v > 0);
  const moyenne =
    consoValues.length > 0
      ? consoValues.reduce((a, b) => a + b, 0) / consoValues.length
      : null;
  const recent = consoValues.slice(-3);
  const moyRecent =
    recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : null;

  const summary = (
    <>
      {moyRecent != null && (
        <>
          Moy. récente :{' '}
          <strong className="mono">{moyRecent.toFixed(2).replace('.', ',')} kWh/j</strong>
        </>
      )}
      {moyenne != null && moyRecent != null && <> · </>}
      {moyenne != null && (
        <>
          Moy. période :{' '}
          <strong className="mono">{moyenne.toFixed(2).replace('.', ',')} kWh/j</strong>
        </>
      )}
      {taux != null && (
        <>
          {' '}
          · Prévision :{' '}
          <strong className="mono">{taux.toFixed(2).replace('.', ',')} kWh/j</strong>
        </>
      )}
    </>
  );

  const tableRows = data
    .filter((row) => row.conso != null || row.previsionConso != null)
    .map((row) => ({
      date: formatDateLong(row.dateIso),
      conso:
        row.conso != null ? `${row.conso.toFixed(2).replace('.', ',')} kWh` : '—',
      prevision:
        row.previsionConso != null
          ? `${row.previsionConso.toFixed(2).replace('.', ',')} kWh/j`
          : '—',
    }))
    .slice(-20);

  return (
    <ChartShell
      title="Consommation entre relevés"
      summary={summary}
      showPeriod
      ariaSummary={`Consommation entre relevés, moyenne ${moyenne?.toFixed(1) ?? '—'} kilowattheures par jour`}
      tableColumns={[
        { key: 'date', header: 'Date' },
        { key: 'conso', header: 'Consommation', align: 'right' },
        { key: 'prevision', header: 'Prévision', align: 'right' },
      ]}
      tableRows={tableRows}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={data} margin={CHART_MARGIN_WITH_RIGHT_LABEL}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="label"
            stroke="var(--muted)"
            fontSize={11}
            minTickGap={data.length > 10 ? 24 : 12}
          />
          <YAxis {...yAxisKwhProps()} />
          <Tooltip
            content={
              <ChartTooltipContent
                rowFormatter={(key, val) => {
                  if (key === 'conso') {
                    return {
                      label: 'Consommation',
                      value: `${val.toFixed(2).replace('.', ',')} kWh`,
                      color: SERIE_REAL,
                    };
                  }
                  if (key === 'previsionConso') {
                    return {
                      label: 'Prévision',
                      value: `${val.toFixed(2).replace('.', ',')} kWh/j`,
                      color: SERIE_FORECAST,
                    };
                  }
                  return null;
                }}
              />
            }
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as ConsoChartRow | undefined;
              return row ? formatDateLong(row.dateIso) : '';
            }}
          />
          {forecast.length > 0 && (
            <Legend
              {...LEGEND_STYLE}
              formatter={(value) =>
                value === 'conso' ? 'Réel' : value === 'previsionConso' ? 'Prévision' : value
              }
            />
          )}
          <Bar
            dataKey="conso"
            name="conso"
            fill={SERIE_REAL}
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          {forecast.length > 0 && (
            <Line
              type="stepAfter"
              dataKey="previsionConso"
              name="previsionConso"
              stroke={SERIE_FORECAST}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          )}
          {objectifKwhJour != null && (
            <ReferenceLine
              y={objectifKwhJour}
              stroke="var(--red)"
              strokeDasharray="6 3"
              label={{
                value: `Objectif ${objectifKwhJour.toString().replace('.', ',')} kWh/j`,
                position: 'insideTopRight',
                fill: 'var(--red)',
                fontSize: 10,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
