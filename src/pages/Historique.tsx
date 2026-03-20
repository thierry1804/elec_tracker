import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  getRelevesTries,
  getConsommationsEntreReleves,
  findAchatsDansIntervalleReleves,
} from '../lib/calculs';
import type { ConsoEntreReleves } from '../lib/calculs';
import ReleveForm from '../components/ReleveForm';

const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export default function Historique() {
  const { data, deleteReleve } = useApp();
  const [editingReleveId, setEditingReleveId] = useState<string | null>(null);
  const tries = getRelevesTries(data.releves);
  const consos = getConsommationsEntreReleves(data.releves);
  const editingReleve = editingReleveId
    ? data.releves.find((r) => r.id === editingReleveId) ?? null
    : null;

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer ce relevé ?')) deleteReleve(id);
  };

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

  const formatDuree = (nbJours: number) =>
    nbJours < 1
      ? `${(nbJours * 24).toFixed(1).replace('.', ',')} h`
      : `${Number.isInteger(nbJours) ? nbJours : nbJours.toFixed(1).replace('.', ',')} j`;

  const muted = { color: 'var(--muted)', fontSize: '0.92em' } as const;

  /** Hausse de solde : l’app affiche la différence entre deux lectures, pas le kWh saisi dans « Achat ». */
  function ligneRechargement(conso: ConsoEntreReleves) {
    const deltaReleves = Math.abs(conso.kwhConsommes);
    const dStr = deltaReleves.toFixed(2).replace('.', ',');
    const sur = formatDuree(conso.nbJours);
    const achatsI = findAchatsDansIntervalleReleves(
      data.achats,
      conso.dateDebut,
      conso.dateFin
    );
    const sommeAchats = achatsI.reduce((s, a) => s + a.creditKwh, 0);
    const ecart = Math.round((deltaReleves - sommeAchats) * 100) / 100;

    if (achatsI.length === 0) {
      const ap = String(conso.kwhApres).replace('.', ',');
      const av = String(conso.kwhAvant).replace('.', ',');
      return (
        <>
          Hausse du solde +{dStr} kWh{' '}
          <span style={muted}>
            ({ap} − {av} : écart entre les deux lectures, distinct du montant éventuel sur la fiche achat)
          </span>{' '}
          <span style={{ whiteSpace: 'nowrap' }}>({sur})</span>
        </>
      );
    }

    const lblAchat =
      achatsI.length === 1
        ? `${sommeAchats} kWh (achat)`
        : `${sommeAchats} kWh (${achatsI.length} achats)`;

    if (Math.abs(ecart) < 0.06) {
      return (
        <>
          Rechargement +{dStr} kWh ({sur}) <span style={muted}>— cohérent avec {lblAchat}</span>
        </>
      );
    }

    return (
      <>
        Hausse compteur +{dStr} kWh ({sur}) · <span style={muted}>achat enregistré {lblAchat}</span>
        <span style={muted}>
          {' '}
          — écart relevés − achat : {ecart > 0 ? '+' : ''}
          {ecart.toFixed(2).replace('.', ',')} kWh
        </span>
      </>
    );
  }

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
              <th>Date et heure</th>
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
                  <td>{formatDateHeure(releve.date)}</td>
                  <td>{releve.creditRestantKwh}</td>
                  <td>
                    {conso != null
                      ? conso.kwhConsommes >= 0
                        ? `${conso.kwhConsommes.toFixed(2)} (sur ${formatDuree(conso.nbJours)})`
                        : ligneRechargement(conso)
                      : '—'}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn-edit btn-edit-icon"
                        onClick={() => setEditingReleveId(releve.id)}
                        title="Modifier ce relevé"
                        aria-label="Modifier ce relevé"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="btn-delete btn-delete-icon"
                        onClick={() => handleDelete(releve.id)}
                        title="Supprimer ce relevé"
                        aria-label="Supprimer ce relevé"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingReleve && (
        <ReleveForm
          releve={editingReleve}
          onClose={() => setEditingReleveId(null)}
        />
      )}
    </div>
  );
}
