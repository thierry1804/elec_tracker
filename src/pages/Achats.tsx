import { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { useLayoutActions } from '../context/LayoutContext';
import AchatForm from '../components/AchatForm';
import DeleteConfirmButton from '../components/DeleteConfirmButton';
import PrixAchatsChart from '../components/PrixAchatsChart';
import { IconEdit, IconTrash } from '../components/nav/NavIcons';
import '../components/Charts.css';

export default function Achats() {
  const { data, deleteAchat, restoreAchat } = useApp();
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

  if (achats.length === 0) {
    return (
      <div className="page achats">
        <div className="page-empty dashboard-empty" role="status">
          <h2 className="dashboard-empty-title">Achats</h2>
          <p className="dashboard-empty-text">
            Aucun achat enregistré. Saisissez montant et crédit reçu à chaque recharge.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => layoutActions?.openAchat()}>
            + Premier achat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page achats">
      <PageHeader title="Achats" lead="Recharges enregistrées et prix unitaire." />
      <div className="page-stack">
        {showReleveCta && (
          <div className="alert-banner alert-info alert-banner-row" role="status">
            <span className="alert-banner-text">
              Pour améliorer les calculs de consommation, ajoutez un relevé manuel après ce dernier achat.
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => layoutActions?.openReleve()}
            >
              + Relevé
            </button>
          </div>
        )}
        {chartData.length > 0 && <PrixAchatsChart chartData={chartData} />}
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
                <td className="mono">{a.montantAr.toLocaleString('fr-FR')}</td>
                <td className="mono">{a.creditKwh}</td>
                <td className="mono">{Math.round(a.prixUnitaireArPerKwh).toLocaleString('fr-FR')}</td>
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
                    <DeleteConfirmButton
                      itemLabel="cet achat"
                      onConfirm={() => deleteAchat(a.id)}
                      onUndo={() => restoreAchat(a)}
                      undoMessage="Achat supprimé"
                      icon={<IconTrash />}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {editingAchat && (
        <AchatForm achat={editingAchat} onClose={() => setEditingAchatId(null)} />
      )}
    </div>
  );
}
