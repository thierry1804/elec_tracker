import { useState, type ReactNode } from 'react';

interface DeleteConfirmButtonProps {
  onConfirm: () => void;
  itemLabel: string;
  icon: ReactNode;
}

export default function DeleteConfirmButton({ onConfirm, itemLabel, icon }: DeleteConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="delete-confirm" role="group" aria-label={`Confirmer la suppression : ${itemLabel}`}>
        <button
          type="button"
          className="btn btn-sm btn-delete"
          onClick={() => {
            onConfirm();
            setConfirming(false);
          }}
        >
          Supprimer
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setConfirming(false)}
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-delete btn-delete-icon"
      onClick={() => setConfirming(true)}
      title={`Supprimer ${itemLabel}`}
      aria-label={`Supprimer ${itemLabel}`}
    >
      {icon}
    </button>
  );
}
