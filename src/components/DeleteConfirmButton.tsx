import { useState, type ReactNode } from 'react';
import { useToast } from '../context/ToastContext';

interface DeleteConfirmButtonProps {
  onConfirm: () => void;
  onUndo?: () => void;
  itemLabel: string;
  undoMessage?: string;
  icon: ReactNode;
}

export default function DeleteConfirmButton({
  onConfirm,
  onUndo,
  itemLabel,
  undoMessage = 'Élément supprimé',
  icon,
}: DeleteConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { showToast } = useToast();

  const handleConfirm = () => {
    onConfirm();
    setConfirming(false);
    if (onUndo) {
      showToast({
        message: undoMessage,
        action: { label: 'Annuler', onClick: onUndo },
        duration: 5000,
      });
    }
  };

  if (confirming) {
    return (
      <div className="delete-confirm" role="group" aria-label={`Confirmer la suppression : ${itemLabel}`}>
        <button type="button" className="btn btn-sm btn-delete" onClick={handleConfirm}>
          Supprimer
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setConfirming(false)}>
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
