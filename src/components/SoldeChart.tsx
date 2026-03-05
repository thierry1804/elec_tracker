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
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { getDonneesGraphiqueSolde } from '../lib/calculs';
import type { Releve } from '../types';
import { usePrevision } from '../context/PrevisionContext';
import './Charts.css';

const TOOLTIP_HIDDEN_KEYS = ['previsionMin', 'bandHeight'];

function SoldeTooltipContent({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const filtered = payload.filter((p) => p.dataKey && !TOOLTIP_HIDDEN_KEYS.includes(String(p.dataKey)));
  if (filtered.length === 0) return null;
  const labelNames: Record<string, string> = {
    solde: 'Solde',
    prevision: 'Prévision',
    intervalle: 'Intervalle de confiance',
  };
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">
        {label && new Date(label).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </div>
      {filtered.map((entry) => {
        const name = labelNames[String(entry.dataKey)] ?? String(entry.dataKey);
        const value = entry.value;
        if (value == null || (typeof value === 'number' && Number.isNaN(value))) return null;
        return (
          <div key={String(entry.dataKey)} className="chart-tooltip-item" style={{ color: entry.color }}>
            {name}: {typeof value === 'number' ? value.toFixed(2) : value} kWh
          </div>
        );
      })}
    </div>
  );
}

interface SoldeChartProps {
  releves: Releve[];
}

interface ChartPoint {
  date: string;
  solde?: number;
  prevision?: number;
  previsionMin: number;
  previsionMax: number;
  bandHeight: number;
}

export default function SoldeChart({ releves }: SoldeChartProps) {
  const actualData = getDonneesGraphiqueSolde(releves);
  const prevision = usePrevision();
  const forecastWithInterval =
    prevision.donneesPrevision.length > 0
      ? prevision.donneesPrevision
      : [];

  if (actualData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <span className="chart-title">Évolution du solde (kWh)</span>
        </div>
        <div className="chart-empty">
          <div className="chart-empty-icon">📈</div>
          <div className="chart-empty-text">Ajoutez des relevés pour voir l'évolution</div>
        </div>
      </div>
    );
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const dataWithPrevision: ChartPoint[] = actualData.map((p, i) => ({
    date: p.date,
    solde: p.solde,
    prevision: i === actualData.length - 1 ? p.solde : undefined,
    previsionMin: 0,
    previsionMax: 0,
    bandHeight: 0,
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

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Évolution du solde (kWh)</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dataWithPrevision} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="var(--text-secondary)"
            fontSize={12}
          />
          <YAxis stroke="var(--text-secondary)" fontSize={12} />
          <Tooltip
            content={<SoldeTooltipContent />}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <Legend
            wrapperStyle={{ color: 'var(--text)' }}
            formatter={(value) =>
              value === 'solde'
                ? 'Solde réel'
                : value === 'prevision'
                  ? 'Prévision (pondérée + tendance)'
                  : value === 'intervalle'
                    ? 'Intervalle de confiance'
                    : value
            }
          />
          {hasBand && (
            <>
              <Area
                type="monotone"
                dataKey="previsionMin"
                stackId="band"
                fill="var(--bg-dark)"
                stroke="none"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="bandHeight"
                stackId="band"
                fill="rgba(210, 153, 34, 0.35)"
                stroke="none"
                name="intervalle"
              />
              <Line
                type="monotone"
                dataKey="previsionMin"
                stroke="rgba(210, 153, 34, 0.85)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={true}
                legendType="none"
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="solde"
            name="solde"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="prevision"
            name="prevision"
            stroke="var(--accent-orange)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
