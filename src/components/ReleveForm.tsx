import { useState, useEffect, FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useApp } from '../context/AppContext';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Releve } from '../types';
import './Modal.css';

interface ReleveFormProps {
  onClose: () => void;
  releve?: Releve;
}

function toTimeString(d: Date) {
  return d.toTimeString().slice(0, 5); // "HH:mm"
}

function getInitialState(releve?: Releve | null) {
  if (releve) {
    const d = new Date(releve.date);
    return {
      dateIso: d.toISOString().slice(0, 10),
      timeStr: toTimeString(d),
      creditRestantKwh: String(releve.creditRestantKwh),
    };
  }
  const now = new Date();
  return {
    dateIso: now.toISOString().slice(0, 10),
    timeStr: toTimeString(now),
    creditRestantKwh: '',
  };
}

interface FieldErrors {
  date?: string;
  time?: string;
  creditRestantKwh?: string;
}

export default function ReleveForm({ onClose, releve }: ReleveFormProps) {
  const { addReleve, updateReleve } = useApp();
  const modalRef = useModalA11y(onClose);
  const isEdit = !!releve;
  const [dateIso, setDateIso] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [creditRestantKwh, setCreditRestantKwh] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const init = getInitialState(releve);
    setDateIso(init.dateIso);
    setTimeStr(init.timeStr);
    setCreditRestantKwh(init.creditRestantKwh);
  }, [releve?.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const nextErrors: FieldErrors = {};
    if (!dateIso || !dateIso.trim()) nextErrors.date = 'La date est requise.';
    if (!timeStr || !/^\d{1,2}:\d{2}$/.test(timeStr)) nextErrors.time = "L'heure est requise.";
    const kwh = parseFloat(creditRestantKwh.replace(',', '.'));
    if (creditRestantKwh.trim() === '') nextErrors.creditRestantKwh = 'Le crédit restant est requis.';
    else if (!Number.isFinite(kwh)) nextErrors.creditRestantKwh = 'Saisissez un nombre.';
    else if (kwh < 0) nextErrors.creditRestantKwh = 'Le crédit ne peut pas être négatif.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (releve) {
      const [h, m] = timeStr.split(':').map(Number);
      const dateHeure = new Date(dateIso + 'T00:00:00');
      dateHeure.setHours(h, m, 0, 0);
      updateReleve(releve.id, { date: dateHeure.toISOString(), creditRestantKwh: kwh });
      onClose();
    } else {
      const [h, m] = timeStr.split(':').map(Number);
      const dateHeure = new Date(dateIso + 'T00:00:00');
      dateHeure.setHours(h, m, 0, 0);
      addReleve(dateHeure.toISOString(), kwh);
      onClose();
    }
  };

  const selectedDate = dateIso ? new Date(dateIso + 'T12:00:00') : null;

  const handleDateChange = (dates: Date | Date[] | null) => {
    const d = Array.isArray(dates) ? dates[0] ?? null : dates;
    if (d) {
      setDateIso(d.toISOString().slice(0, 10));
      setTimeout(() => setCalendarOpen(false), 0);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{isEdit ? 'Modifier le relevé' : 'Nouveau relevé'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div>
            <label htmlFor="releve-date">Date du relevé</label>
            <DatePicker
              id="releve-date"
              selected={selectedDate}
              open={calendarOpen}
              onInputClick={() => setCalendarOpen(true)}
              onChange={handleDateChange}
              onCalendarClose={() => setCalendarOpen(false)}
              locale={fr}
              dateFormat="dd/MM/yyyy"
              placeholderText="jj/mm/aaaa"
              className={`input-datepicker ${errors.date ? 'input-invalid' : ''}`}
              required
              aria-invalid={errors.date ? 'true' : 'false'}
              aria-describedby={errors.date ? 'releve-date-error' : undefined}
            />
            {errors.date && (
              <p id="releve-date-error" className="field-error" role="alert">
                {errors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="releve-time">Heure du relevé</label>
            <input
              id="releve-time"
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className={`input-time ${errors.time ? 'input-invalid' : ''}`}
              aria-invalid={!!errors.time}
              aria-describedby={errors.time ? 'releve-time-error' : undefined}
            />
            {errors.time && (
              <p id="releve-time-error" className="field-error" role="alert">
                {errors.time}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="releve-credit">Crédit restant (kWh)</label>
            <input
              id="releve-credit"
              type="text"
              inputMode="decimal"
              value={creditRestantKwh}
              onChange={(e) => setCreditRestantKwh(e.target.value)}
              placeholder="ex: 28"
              className={errors.creditRestantKwh ? 'input-invalid' : ''}
              aria-invalid={!!errors.creditRestantKwh}
              aria-describedby={errors.creditRestantKwh ? 'releve-credit-error' : undefined}
            />
            {errors.creditRestantKwh && (
              <p id="releve-credit-error" className="field-error" role="alert">
                {errors.creditRestantKwh}
              </p>
            )}
          </div>
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
