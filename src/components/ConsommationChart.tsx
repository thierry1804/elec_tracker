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

interface ConsommationChartProps {
  releves: Releve[];
}

export default function ConsommationChart({ releves }: ConsommationChartProps) {
  const data = getDonneesGraphiqueConso(releves);

  if (data.length === 0) {
    return (
      <div className="chart-container chart-empty">
        <h3>CONSOMMATION ENTRE RELEVÉS (kWh)</h3>
        <p>Ajoutez au moins deux relevés pour afficher la consommation.</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>CONSOMMATION ENTRE RELEVÉS (kWh)</h3>
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
            formatter={(value: number) => [`${value} kWh`, 'Consommation']}
          />
          <Bar dataKey="conso" fill="var(--accent-orange)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
