import { useState, FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useApp } from '../context/AppContext';
import './Modal.css';

interface AchatFormProps {
  onClose: () => void;
}

export default function AchatForm({ onClose }: AchatFormProps) {
  const { addAchat } = useApp();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [dateIso, setDateIso] = useState(todayIso);
  const [montantAr, setMontantAr] = useState('');
  const [creditKwh, setCreditKwh] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const montant = parseFloat(montantAr.replace(/\s/g, '').replace(',', '.'));
    const kwh = parseFloat(creditKwh.replace(',', '.'));
    if (Number.isFinite(montant) && montant >= 0 && Number.isFinite(kwh) && kwh > 0) {
      addAchat(dateIso, montant, kwh);
      onClose();
    }
  };

  const selectedDate = dateIso ? new Date(dateIso + 'T12:00:00') : null;

  const handleDateChange = (d: Date | null) => {
    if (d) {
      setDateIso(d.toISOString().slice(0, 10));
      setTimeout(() => setCalendarOpen(false), 0);
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
            <DatePicker
              selected={selectedDate}
              open={calendarOpen}
              onInputClick={() => setCalendarOpen(true)}
              onChange={handleDateChange}
              onCalendarClose={() => setCalendarOpen(false)}
              locale={fr}
              dateFormat="dd/MM/yyyy"
              placeholderText="jj/mm/aaaa"
              className="input-datepicker"
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
