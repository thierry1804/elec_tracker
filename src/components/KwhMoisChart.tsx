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
    const [, m] = p.mois.split('-');
    const moisNom = new Date(2024, parseInt(m, 10) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
    return {
      label: moisNom,
      kwh: p.kwh,
      coutAr: p.coutAr,
    };
  });

  const fmt = (ar: number) => formatMontant(ar, settings);
  const objectifKwh = settings.objectifKwhMois;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <span className="chart-title">Consommation et coût par mois</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={12} />
          <YAxis yAxisId="kwh" stroke="var(--text-secondary)" fontSize={12} />
          <YAxis yAxisId="ar" orientation="right" stroke="var(--text-secondary)" fontSize={12} hide />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            formatter={(value: number, name: string) => {
              if (name === 'kwh') return [`${value} kWh`, 'Consommation'];
              return [fmt(value), 'Recharges'];
            }}
          />
          <Legend
            formatter={(value) => (value === 'kwh' ? 'kWh consommés' : 'Coût recharges')}
          />
          <Bar yAxisId="kwh" dataKey="kwh" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="kwh" type="monotone" dataKey="coutAr" stroke="var(--accent-orange)" strokeWidth={2} dot={{ r: 3 }} name="coutAr" />
          {objectifKwh != null && (
            <ReferenceLine
              yAxisId="kwh"
              y={objectifKwh}
              stroke="var(--accent-red)"
              strokeDasharray="6 3"
              label={{ value: `Objectif ${objectifKwh} kWh`, position: 'right', fill: 'var(--accent-red)', fontSize: 11 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
