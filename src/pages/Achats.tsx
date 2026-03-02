import { useApp } from '../context/AppContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import '../components/Charts.css';

export default function Achats() {
  const { data, deleteAchat } = useApp();
  const achats = [...data.achats].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const chartData = achats.map((a) => ({
    date: a.date,
    label: formatDate(a.date),
    prix: Math.round(a.prixUnitaireArPerKwh),
  }));

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer cet achat ?')) deleteAchat(id);
  };

  if (achats.length === 0) {
    return (
      <div className="page-empty">
        <p>Aucun achat enregistré. Ajoutez un achat depuis le bouton « + Achat ».</p>
      </div>
    );
  }

  return (
    <div className="achats">
      <h2>Historique des achats</h2>
      {chartData.length > 0 && (
        <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
          <h3>Évolution du prix (Ar/kWh)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                formatter={(value: number) => [`${value} Ar/kWh`, 'Prix']}
              />
              <Line
                type="monotone"
                dataKey="prix"
                stroke="var(--accent-orange)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent-orange)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant (Ar)</th>
              <th>Crédit (kWh)</th>
              <th>Prix unitaire (Ar/kWh)</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {[...achats].reverse().map((a) => (
              <tr key={a.id}>
                <td>{formatDate(a.date)}</td>
                <td>{a.montantAr.toLocaleString('fr-FR')}</td>
                <td>{a.creditKwh}</td>
                <td>{Math.round(a.prixUnitaireArPerKwh).toLocaleString('fr-FR')}</td>
                <td>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => handleDelete(a.id)}
                    title="Supprimer cet achat"
                    aria-label="Supprimer cet achat"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
