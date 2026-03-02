import { useState, FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useApp } from '../context/AppContext';
import './Modal.css';

interface ReleveFormProps {
  onClose: () => void;
}

export default function ReleveForm({ onClose }: ReleveFormProps) {
  const { addReleve } = useApp();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [dateIso, setDateIso] = useState(todayIso);
  const [creditRestantKwh, setCreditRestantKwh] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const kwh = parseFloat(creditRestantKwh.replace(',', '.'));
    if (Number.isFinite(kwh) && kwh >= 0) {
      addReleve(dateIso, kwh);
      onClose();
    }
  };

  const selectedDate = dateIso ? new Date(dateIso + 'T12:00:00') : null;

  const handleDateChange = (d: Date | null) => {
    if (d) {
      setDateIso(d.toISOString().slice(0, 10));
      // Fermer le calendrier au prochain tick pour éviter tout conflit avec le state du DatePicker
      setTimeout(() => setCalendarOpen(false), 0);
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
