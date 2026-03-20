import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLayoutActions } from '../context/LayoutContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import AchatForm from '../components/AchatForm';
import '../components/Charts.css';

const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default function Achats() {
  const { data, deleteAchat } = useApp();
  const layoutActions = useLayoutActions();
  const [editingAchatId, setEditingAchatId] = useState<string | null>(null);
  const editingAchat = editingAchatId ? data.achats.find((a) => a.id === editingAchatId) ?? null : null;
  const achats = [...data.achats].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const showReleveCta = useMemo(() => {
    if (achats.length === 0) return false;
    const dernierAchat = achats[achats.length - 1];
    const dernierAchatTime = new Date(dernierAchat.date).getTime();
    const releveManuelApres = data.releves.some(
      (r) => !r.fromAchat && new Date(r.date).getTime() > dernierAchatTime
    );
    return !releveManuelApres;
  }, [achats, data.releves]);

  const formatDateHeure = (d: string) => {
    const date = new Date(d);
    const hasTime = d.length > 10 && d.includes('T');
    return hasTime
      ? date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const chartData = achats.map((a) => ({
    date: a.date,
    label: formatDateHeure(a.date),
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
      {showReleveCta && (
        <div className="alert-banner alert-info" role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>Pour améliorer les calculs de consommation, ajoutez un relevé manuel après ce dernier achat.</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => layoutActions?.openReleve()}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Relevé
          </button>
        </div>
      )}
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
              <th>Date et heure</th>
              <th>Montant (Ar)</th>
              <th>Crédit (kWh)</th>
              <th>Prix unitaire (Ar/kWh)</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {[...achats].reverse().map((a) => (
              <tr key={a.id}>
                <td>{formatDateHeure(a.date)}</td>
                <td>{a.montantAr.toLocaleString('fr-FR')}</td>
                <td>{a.creditKwh}</td>
                <td>{Math.round(a.prixUnitaireArPerKwh).toLocaleString('fr-FR')}</td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn-edit btn-edit-icon"
                      onClick={() => setEditingAchatId(a.id)}
                      title="Modifier cet achat"
                      aria-label="Modifier cet achat"
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="btn-delete btn-delete-icon"
                      onClick={() => handleDelete(a.id)}
                      title="Supprimer cet achat"
                      aria-label="Supprimer cet achat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingAchat && (
        <AchatForm achat={editingAchat} onClose={() => setEditingAchatId(null)} />
      )}
    </div>
  );
}
