import { useEffect, useRef, useState } from 'react';
import { terminateWorker, getWorker, readMeterIndex } from '../lib/ocr/engine';
import { blobToRaster, rasterToCanvas } from '../lib/ocr/image';
import type { IndexCandidate } from '../lib/ocr/readIndex';
import { formatNombreSouple } from '../lib/format';
import './MeterPhotoCapture.css';

interface MeterPhotoCaptureProps {
  /** Dernier index connu : aide à choisir la bonne lecture (un index postpayé ne baisse pas). */
  previousIndex: number | null;
  /** Reçoit l'index lu (le plus vraisemblable d'abord, puis celui que l'utilisateur choisit). */
  onValue: (value: number) => void;
}

type State =
  | { phase: 'idle' }
  | { phase: 'reading'; step: number; total: number }
  | { phase: 'done'; candidates: IndexCandidate[]; chosen: number }
  | { phase: 'error'; message: string };

const IconGallery = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M21 16l-5-5-8 8" />
  </svg>
);

const IconCamera = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

/**
 * Photo du compteur, lecture de l'index sur l'appareil (aucune donnée envoyée) et pré-remplissage du champ.
 * La photo n'est gardée que le temps de la vérification : elle n'est ni enregistrée ni transmise.
 */
export default function MeterPhotoCapture({ previousIndex, onValue }: MeterPhotoCaptureProps) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const setPreview = (url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreviewUrl(url);
  };

  // À la fermeture du formulaire : on libère la photo et le moteur (~100 Mo de mémoire).
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      void terminateWorker();
    },
    [],
  );

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setState({ phase: 'reading', step: 0, total: 3 });
    try {
      const raster = await blobToRaster(file);
      const worker = await getWorker();
      const candidates = await readMeterIndex(raster, previousIndex, {
        worker,
        toImage: rasterToCanvas,
        onProgress: (step, total) => setState({ phase: 'reading', step, total }),
      });
      if (candidates.length === 0) {
        setState({
          phase: 'error',
          message:
            "Aucun nombre lisible sur la photo. Rapprochez-vous, cadrez seulement les chiffres, évitez les reflets, puis réessayez.",
        });
        return;
      }
      setState({ phase: 'done', candidates, chosen: 0 });
      onValue(candidates[0].value);
    } catch {
      setState({
        phase: 'error',
        message: navigator.onLine
          ? "La lecture automatique a échoué. Saisissez l'index à la main."
          : "Le moteur de lecture se télécharge à la première utilisation : reconnectez-vous une fois, ou saisissez l'index à la main.",
      });
    }
  };

  const choose = (i: number) => {
    if (state.phase !== 'done') return;
    setState({ ...state, chosen: i });
    onValue(state.candidates[i].value);
  };

  const reading = state.phase === 'reading';

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFile(file);
  };

  return (
    <div className="meter-photo">
      {/* Deux entrées : l'appareil photo (capture) et la galerie / les fichiers (sans capture). */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="meter-photo-input"
        onChange={onPick}
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="meter-photo-input"
        onChange={onPick}
        tabIndex={-1}
        aria-hidden
      />
      <div className="meter-photo-actions">
        {/* Sur ordinateur, « capture » est ignoré : un seul bouton « Choisir une photo » suffit. */}
        <button
          type="button"
          className="btn btn-secondary btn-sm meter-photo-btn meter-photo-btn--camera"
          onClick={() => cameraRef.current?.click()}
          disabled={reading}
        >
          <IconCamera />
          <span>Prendre une photo</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm meter-photo-btn"
          onClick={() => galleryRef.current?.click()}
          disabled={reading}
        >
          <IconGallery />
          <span className="meter-photo-label--touch">Choisir dans la galerie</span>
          <span className="meter-photo-label--desktop">Choisir une photo</span>
        </button>
      </div>

      <div aria-live="polite" className="meter-photo-status">
        {reading && (
          <p className="meter-photo-msg">
            Lecture de la photo, essai {Math.max(1, state.step)} sur {state.total}…
          </p>
        )}
        {state.phase === 'error' && (
          <p className="meter-photo-msg meter-photo-msg--error" role="alert">
            {state.message}
          </p>
        )}
        {state.phase === 'done' && (
          <div className="meter-photo-result">
            {previewUrl && <img src={previewUrl} alt="Photo du compteur" className="meter-photo-thumb" />}
            <div className="meter-photo-text">
              <p className="meter-photo-msg">
                Index lu : <strong className="mono">{formatNombreSouple(state.candidates[state.chosen].value, 3)} kWh</strong>.
                Vérifiez-le avec la photo avant d'enregistrer.
              </p>
              {state.candidates[state.chosen].deduced && (
                <p className="meter-photo-note">Le dernier chiffre est lu comme la décimale.</p>
              )}
              {state.candidates.length > 1 && (
                <div className="meter-photo-alts" role="group" aria-label="Autres lectures possibles">
                  <span className="meter-photo-note">Autres lectures :</span>
                  {state.candidates.map((c, i) =>
                    i === state.chosen ? null : (
                      <button key={c.value} type="button" className="meter-photo-chip mono" onClick={() => choose(i)}>
                        {formatNombreSouple(c.value, 3)}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
