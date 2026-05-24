import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AppData } from '../types';
import { getKwhEtCoutParMois } from '../lib/analytics';
import { useSettings } from '../context/SettingsContext';
import { formatMontant } from '../lib/format';
import ChartShell from './ChartShell';
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
  yAxisArProps,
} from '../lib/chartTheme';
import './Charts.css';

interface KwhMoisChartProps {
  data: AppData;
}

export default function KwhMoisChart({ data }: KwhMoisChartProps) {
  const { settings } = useSettings();
  const parMois = getKwhEtCoutParMois(data.releves, data.achats);

  if (parMois.length < 2) return null;

  const last12 = parMois.slice(-12);
  const chartData = last12.map((p) => {
    const [y, m] = p.mois.split('-');
    const moisNom = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString(
      'fr-FR',
      { month: 'short', year: '2-digit' }
    );
    return {
      label: moisNom,
      moisKey: p.mois,
      kwh: p.kwh,
      coutAr: p.coutAr,
    };
  });

  const fmt = (ar: number) => formatMontant(ar, settings);
  const objectifKwh = settings.objectifKwhMois;
  const dernier = chartData[chartData.length - 1];

  const summary = (
    <>
      Dernier mois ({dernier.label}) :{' '}
      <strong className="mono">{dernier.kwh} kWh</strong>
      {' · '}
      <strong className="mono">{fmt(dernier.coutAr)}</strong> en recharges
    </>
  );

  const tableRows = chartData.map((row) => ({
    mois: row.label,
    kwh: `${row.kwh} kWh`,
    cout: fmt(row.coutAr),
  }));

  return (
    <ChartShell
      title="Consommation et coût par mois"
      summary={summary}
      ariaSummary={`Consommation mensuelle, dernier mois ${dernier.kwh} kilowattheures`}
      tableColumns={[
        { key: 'mois', header: 'Mois' },
        { key: 'kwh', header: 'kWh', align: 'right' },
        { key: 'cout', header: 'Recharges', align: 'right' },
      ]}
      tableRows={tableRows}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={chartData} margin={CHART_MARGIN_WITH_RIGHT_LABEL}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} minTickGap={20} />
          <YAxis yAxisId="kwh" {...yAxisKwhProps()} />
          <YAxis yAxisId="ar" orientation="right" {...yAxisArProps()} />
          <Tooltip
            content={
              <ChartTooltipContent
                rowFormatter={(key, val) => {
                  if (key === 'kwh') {
                    return {
                      label: 'Consommation',
                      value: `${val} kWh`,
                      color: SERIE_REAL,
                    };
                  }
                  if (key === 'coutAr') {
                    return {
                      label: 'Recharges',
                      value: fmt(val),
                      color: SERIE_FORECAST,
                    };
                  }
                  return null;
                }}
              />
            }
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend
            {...LEGEND_STYLE}
            formatter={(value) =>
              value === 'kwh' ? 'kWh consommés' : value === 'coutAr' ? 'Coût recharges (Ar)' : value
            }
          />
          <Bar
            yAxisId="kwh"
            dataKey="kwh"
            name="kwh"
            fill={SERIE_REAL}
            fillOpacity={0.85}
            radius={[4, 4, 0, 0]}
            barSize={22}
          />
          <Line
            yAxisId="ar"
            type="monotone"
            dataKey="coutAr"
            name="coutAr"
            stroke={SERIE_FORECAST}
            strokeWidth={2}
            dot={{ r: 3, fill: SERIE_FORECAST, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          {objectifKwh != null && (
            <ReferenceLine
              yAxisId="kwh"
              y={objectifKwh}
              stroke="var(--red)"
              strokeDasharray="6 3"
              label={{
                value: `Obj. ${objectifKwh} kWh`,
                position: 'insideTopLeft',
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
