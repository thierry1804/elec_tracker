import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import {
  getRelevesTries,
  getConsommationsEntreReleves,
  findAchatsDansIntervalleReleves,
} from '../lib/calculs';
import type { ConsoEntreReleves } from '../lib/calculs';
import ReleveForm from '../components/ReleveForm';
import DeleteConfirmButton from '../components/DeleteConfirmButton';
import { useLayoutActions } from '../context/LayoutContext';
import { labelReleveValeur, useCompteurMode } from '../lib/compteurMode';
import { IconEdit, IconTrash } from '../components/nav/NavIcons';
import { formatNombre, formatNombreSouple, formatDuree } from '../lib/format';

export default function Historique() {
  const { data, deleteReleve, restoreReleve } = useApp();
  const layoutActions = useLayoutActions();
  const mode = useCompteurMode();
  const postpaye = mode === 'postpaye';
  const [editingReleveId, setEditingReleveId] = useState<string | null>(null);
  const tries = getRelevesTries(data.releves);
  const consos = getConsommationsEntreReleves(data.releves, mode);
  const editingReleve = editingReleveId
    ? data.releves.find((r) => r.id === editingReleveId) ?? null
    : null;

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

  /** Hausse de solde : l'app affiche la différence entre deux lectures, pas le kWh saisi dans « Achat ». */
  function ligneRechargement(conso: ConsoEntreReleves) {
    const deltaReleves = Math.abs(conso.kwhConsommes);
    const dStr = formatNombre(deltaReleves, 2);
    const sur = formatDuree(conso.nbJours);
    const achatsI = findAchatsDansIntervalleReleves(
      data.achats,
      conso.dateDebut,
      conso.dateFin
    );
    const sommeAchats = achatsI.reduce((s, a) => s + a.creditKwh, 0);
    const ecart = Math.round((deltaReleves - sommeAchats) * 100) / 100;

    if (achatsI.length === 0) {
      const ap = formatNombreSouple(conso.kwhApres);
      const av = formatNombreSouple(conso.kwhAvant);
      return (
        <>
          Hausse du solde +{dStr} kWh{' '}
          <span className="table-cell-muted">
            ({ap} − {av} : écart entre les deux lectures, distinct du montant éventuel sur la fiche achat)
          </span>{' '}
          <span className="table-cell-nowrap">({sur})</span>
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
          Rechargement +{dStr} kWh ({sur}) <span className="table-cell-muted">, cohérent avec {lblAchat}</span>
        </>
      );
    }

    return (
      <>
        Hausse compteur +{dStr} kWh ({sur}) · <span className="table-cell-muted">achat enregistré {lblAchat}</span>
        <span className="table-cell-muted">
          {' '}
          (écart relevés − achat : {ecart > 0 ? '+' : ''}
          {formatNombre(ecart, 2)} kWh)
        </span>
      </>
    );
  }

  if (tries.length === 0) {
    return (
      <div className="page historique">
        <PageHeader title="Relevés" lead="Historique des lectures et consommations calculées." />
        <div className="page-empty dashboard-empty" role="status">
          <p className="dashboard-empty-text">
            Aucun relevé enregistré.{' '}
            {postpaye
              ? "Notez l'index kWh affiché sur votre compteur pour démarrer le suivi."
              : 'Notez le kWh restant affiché sur votre compteur pour démarrer le suivi.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => layoutActions?.openReleve()}>
            + Premier relevé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page historique">
      <PageHeader
        title="Relevés"
        lead="Historique des lectures et consommations calculées."
      />
      <div className="page-stack">
        <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date et heure</th>
              <th>{labelReleveValeur(mode)}</th>
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
                  <td className="mono">{formatNombreSouple(releve.creditRestantKwh)}</td>
                  <td>
                    {conso != null
                      ? conso.kwhConsommes >= 0
                        ? `${formatNombre(conso.kwhConsommes)} (sur ${formatDuree(conso.nbJours)})`
                        : postpaye
                          ? `Index en baisse de ${formatNombre(Math.abs(conso.kwhConsommes))} kWh (sur ${formatDuree(conso.nbJours)})`
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
                      <DeleteConfirmButton
                        itemLabel="ce relevé"
                        onConfirm={() => deleteReleve(releve.id)}
                        onUndo={() => restoreReleve(releve)}
                        undoMessage="Relevé supprimé"
                        icon={<IconTrash />}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
