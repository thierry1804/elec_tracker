import { useState, FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { toFrenchDate, fromFrenchDate } from '../lib/dateUtils';
import './Modal.css';

interface AchatFormProps {
  onClose: () => void;
}

export default function AchatForm({ onClose }: AchatFormProps) {
  const { addAchat } = useApp();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [dateDisplay, setDateDisplay] = useState(() => toFrenchDate(todayIso));
  const [montantAr, setMontantAr] = useState('');
  const [creditKwh, setCreditKwh] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const dateIso = fromFrenchDate(dateDisplay) || todayIso;
    const montant = parseFloat(montantAr.replace(/\s/g, '').replace(',', '.'));
    const kwh = parseFloat(creditKwh.replace(',', '.'));
    if (Number.isFinite(montant) && montant >= 0 && Number.isFinite(kwh) && kwh > 0) {
      addAchat(dateIso, montant, kwh);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2>Nouvel achat</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Date de l'achat
            <input
              type="text"
              value={dateDisplay}
              onChange={(e) => setDateDisplay(e.target.value)}
              placeholder="jj/mm/aaaa"
              required
            />
          </label>
          <label>
            Montant payé (Ar)
            <input
              type="text"
              inputMode="numeric"
              value={montantAr}
              onChange={(e) => setMontantAr(e.target.value)}
              placeholder="ex: 15000"
              required
            />
          </label>
          <label>
            Crédit ajouté (kWh)
            <input
              type="text"
              inputMode="decimal"
              value={creditKwh}
              onChange={(e) => setCreditKwh(e.target.value)}
              placeholder="ex: 50"
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
