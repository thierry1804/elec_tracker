import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ChartShell from './ChartShell';
import { ChartTooltipContent } from './ChartTooltip';
import {
  CHART_HEIGHT,
  CHART_MARGIN_WITH_RIGHT_LABEL,
  GRID_PROPS,
  TOOLTIP_STYLE,
  SERIE_REAL,
  formatDateLong,
} from '../lib/chartTheme';
import './Charts.css';

interface PrixAchatsChartProps {
  chartData: { date: string; label: string; prix: number }[];
}

export default function PrixAchatsChart({ chartData }: PrixAchatsChartProps) {
  if (chartData.length === 0) return null;

  const dernier = chartData[chartData.length - 1];
  const premier = chartData[0];
  const delta = dernier.prix - premier.prix;

  const summary = (
    <>
      Dernier prix : <strong className="mono">{dernier.prix} Ar/kWh</strong>
      {chartData.length > 1 && (
        <>
          {' '}
          · Évolution :{' '}
          <strong className="mono">
            {delta >= 0 ? '+' : ''}
            {delta} Ar/kWh
          </strong>
        </>
      )}
    </>
  );

  const tableRows = chartData.map((row) => ({
    date: formatDateLong(row.date),
    prix: `${row.prix} Ar/kWh`,
  }));

  return (
    <ChartShell
      title="Évolution du prix"
      summary={summary}
      ariaSummary={`Prix unitaire électricité, ${dernier.prix} ariary par kilowattheure`}
      tableColumns={[
        { key: 'date', header: 'Date' },
        { key: 'prix', header: 'Prix', align: 'right' },
      ]}
      tableRows={tableRows}
    >
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={chartData} margin={CHART_MARGIN_WITH_RIGHT_LABEL}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="label"
            stroke="var(--muted)"
            fontSize={11}
            minTickGap={chartData.length > 8 ? 24 : 12}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={11}
            width={48}
            tickFormatter={(v) => `${v}`}
            label={{
              value: 'Ar/kWh',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--muted)',
              fontSize: 10,
              offset: 8,
            }}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                labelFormatter={(l) => l}
                rowFormatter={(_, val) => ({
                  label: 'Prix unitaire',
                  value: `${Math.round(val)} Ar/kWh`,
                  color: SERIE_REAL,
                })}
              />
            }
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { date: string } | undefined;
              return row ? formatDateLong(row.date) : '';
            }}
          />
          <Line
            type="monotone"
            dataKey="prix"
            stroke={SERIE_REAL}
            strokeWidth={2}
            dot={{ r: 3, fill: SERIE_REAL, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: SERIE_REAL }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
