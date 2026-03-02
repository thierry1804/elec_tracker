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
import {
  getDonneesGraphiqueSolde,
  getDonneesPrevisionAvecIntervalle,
} from '../lib/calculs';
import type { Releve } from '../types';
import './Charts.css';

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
  const forecastWithInterval = getDonneesPrevisionAvecIntervalle(releves);

  if (actualData.length === 0) {
    return (
      <div className="chart-container chart-empty">
        <h3>ÉVOLUTION DU SOLDE (kWh)</h3>
        <p>Ajoutez des relevés pour afficher le graphique.</p>
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
      <h3>ÉVOLUTION DU SOLDE (kWh)</h3>
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
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            labelFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            formatter={(value: number, name: string) => {
              if (name === 'solde') return [`${value} kWh`, 'Solde'];
              if (name === 'prevision') return [`${value} kWh`, 'Prévision'];
              if (name === 'intervalle') return null;
              return [value, name];
            }}
          />
          <Legend
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
              />
              <Area
                type="monotone"
                dataKey="bandHeight"
                stackId="band"
                fill="rgba(210, 153, 34, 0.2)"
                stroke="none"
                name="intervalle"
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="solde"
            name="solde"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-blue)', r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="prevision"
            name="prevision"
            stroke="var(--accent-orange)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'var(--accent-orange)', r: 3 }}
            connectNulls={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
