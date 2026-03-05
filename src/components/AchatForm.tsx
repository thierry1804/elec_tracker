import { useState, useEffect, FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import { fr } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { useApp } from '../context/AppContext';
import type { Achat } from '../types';
import './Modal.css';

interface AchatFormProps {
  onClose: () => void;
  achat?: Achat;
}

interface FieldErrors {
  date?: string;
  montantAr?: string;
  creditKwh?: string;
}

function getInitialState(achat?: Achat | null) {
  if (achat) {
    const dateIso = achat.date.includes('T') ? achat.date.slice(0, 10) : achat.date;
    return {
      dateIso,
      montantAr: String(achat.montantAr),
      creditKwh: String(achat.creditKwh),
    };
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  return { dateIso: todayIso, montantAr: '', creditKwh: '' };
}

export default function AchatForm({ onClose, achat }: AchatFormProps) {
  const { addAchat, updateAchat } = useApp();
  const isEdit = !!achat;
  const [dateIso, setDateIso] = useState('');
  const [montantAr, setMontantAr] = useState('');
  const [creditKwh, setCreditKwh] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const init = getInitialState(achat);
    setDateIso(init.dateIso);
    setMontantAr(init.montantAr);
    setCreditKwh(init.creditKwh);
  }, [achat?.id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const nextErrors: FieldErrors = {};
    if (!dateIso || !dateIso.trim()) nextErrors.date = "La date est requise.";
    const montant = parseFloat(montantAr.replace(/\s/g, '').replace(',', '.'));
    if (montantAr.trim() === '') nextErrors.montantAr = 'Le montant est requis.';
    else if (!Number.isFinite(montant)) nextErrors.montantAr = 'Saisissez un nombre.';
    else if (montant <= 0) nextErrors.montantAr = 'Le montant doit être supérieur à 0.';
    const kwh = parseFloat(creditKwh.replace(',', '.'));
    if (creditKwh.trim() === '') nextErrors.creditKwh = 'Le crédit est requis.';
    else if (!Number.isFinite(kwh)) nextErrors.creditKwh = 'Saisissez un nombre.';
    else if (kwh <= 0) nextErrors.creditKwh = 'Le crédit doit être supérieur à 0.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (achat) {
      updateAchat(achat.id, { date: dateIso, montantAr: montant, creditKwh: kwh });
      onClose();
    } else {
      addAchat(dateIso, montant, kwh);
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
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2>{isEdit ? "Modifier l'achat" : 'Nouvel achat'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div>
            <label htmlFor="achat-date">Date de l'achat</label>
            <DatePicker
              id="achat-date"
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
              aria-describedby={errors.date ? 'achat-date-error' : undefined}
            />
            {errors.date && (
              <p id="achat-date-error" className="field-error" role="alert">
                {errors.date}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="achat-montant">Montant payé (Ar)</label>
            <input
              id="achat-montant"
              type="text"
              inputMode="numeric"
              value={montantAr}
              onChange={(e) => setMontantAr(e.target.value)}
              placeholder="ex: 15000"
              className={errors.montantAr ? 'input-invalid' : ''}
              aria-invalid={!!errors.montantAr}
              aria-describedby={errors.montantAr ? 'achat-montant-error' : undefined}
            />
            {errors.montantAr && (
              <p id="achat-montant-error" className="field-error" role="alert">
                {errors.montantAr}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="achat-credit">Crédit ajouté (kWh)</label>
            <input
              id="achat-credit"
              type="text"
              inputMode="decimal"
              value={creditKwh}
              onChange={(e) => setCreditKwh(e.target.value)}
              placeholder="ex: 50"
              className={errors.creditKwh ? 'input-invalid' : ''}
              aria-invalid={!!errors.creditKwh}
              aria-describedby={errors.creditKwh ? 'achat-credit-error' : undefined}
            />
            {errors.creditKwh && (
              <p id="achat-credit-error" className="field-error" role="alert">
                {errors.creditKwh}
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
