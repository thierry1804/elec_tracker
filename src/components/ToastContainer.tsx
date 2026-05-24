import { useToast } from '../context/ToastContext';
import './ToastContainer.css';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status">
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action!.onClick();
                dismissToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
