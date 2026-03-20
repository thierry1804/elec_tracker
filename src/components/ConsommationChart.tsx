import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getDonneesGraphiqueConso } from '../lib/calculs';
import type { Releve } from '../types';
import './Charts.css';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ConsommationChartProps {
  releves: Releve[];
  /** Limiter aux N derniers jours (optionnel). */
  periodeJours?: number;
}

export default function ConsommationChart({ releves, periodeJours }: ConsommationChartProps) {
  let data = getDonneesGraphiqueConso(releves);
  if (periodeJours != null && periodeJours > 0) {
    const limit = Date.now() - periodeJours * MS_PER_DAY;
    data = data.filter((p) => new Date(p.dateIso + 'T12:00:00').getTime() >= limit);
  }

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <span className="chart-title">Consommation entre relevés</span>
        </div>
        <div className="chart-empty">
          <div className="chart-empty-icon">🔋</div>
          <div className="chart-empty-text">Ajoutez au moins 2 relevés</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Consommation entre relevés</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            stroke="var(--text-secondary)"
            fontSize={12}
          />
          <YAxis stroke="var(--text-secondary)" fontSize={12} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            formatter={(value: number) => [`${Number(value).toFixed(2)} kWh`, 'Consommation']}
          />
          <Bar dataKey="conso" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
