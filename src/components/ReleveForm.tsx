import { useState, FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { toFrenchDate, fromFrenchDate } from '../lib/dateUtils';
import './Modal.css';

interface ReleveFormProps {
  onClose: () => void;
}

export default function ReleveForm({ onClose }: ReleveFormProps) {
  const { addReleve } = useApp();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [dateDisplay, setDateDisplay] = useState(() => toFrenchDate(todayIso));
  const [creditRestantKwh, setCreditRestantKwh] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const dateIso = fromFrenchDate(dateDisplay) || todayIso;
    const kwh = parseFloat(creditRestantKwh.replace(',', '.'));
    if (Number.isFinite(kwh) && kwh >= 0) {
      addReleve(dateIso, kwh);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2>Nouveau relevé</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Date du relevé
            <input
              type="text"
              value={dateDisplay}
              onChange={(e) => setDateDisplay(e.target.value)}
              placeholder="jj/mm/aaaa"
              required
            />
          </label>
          <label>
            Crédit restant (kWh)
            <input
              type="text"
              inputMode="decimal"
              value={creditRestantKwh}
              onChange={(e) => setCreditRestantKwh(e.target.value)}
              placeholder="ex: 28"
              required
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
