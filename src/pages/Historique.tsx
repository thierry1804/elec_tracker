import { useApp } from '../context/AppContext';
import { getRelevesTries, getConsommationsEntreReleves } from '../lib/calculs';

export default function Historique() {
  const { data, deleteReleve } = useApp();
  const tries = getRelevesTries(data.releves);
  const consos = getConsommationsEntreReleves(data.releves);

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer ce relevé ?')) deleteReleve(id);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (tries.length === 0) {
    return (
      <div className="page-empty">
        <p>Aucun relevé enregistré. Ajoutez un relevé depuis le bouton « + Relevé ».</p>
      </div>
    );
  }

  return (
    <div className="historique">
      <h2>Historique des relevés</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Crédit restant (kWh)</th>
              <th>Consommation calculée (kWh)</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {[...tries].reverse().map((releve, idx) => {
              const revIndex = tries.length - 1 - idx;
              const conso = revIndex > 0 ? consos[revIndex - 1] : null;
              return (
                <tr key={releve.id}>
                  <td>{formatDate(releve.date)}</td>
                  <td>{releve.creditRestantKwh}</td>
                  <td>
                    {conso != null
                      ? `${conso.kwhConsommes.toFixed(2)} (sur ${conso.nbJours} j)`
                      : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleDelete(releve.id)}
                      title="Supprimer ce relevé"
                      aria-label="Supprimer ce relevé"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
