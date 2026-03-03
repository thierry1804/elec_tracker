import { useState, useEffect, FormEvent } from 'react';
import {
  loadAiSettings,
  saveAiSettings,
  clearAiSettings,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
} from '../lib/aiSettings';
import './Modal.css';

interface SettingsModalProps {
  onClose: () => void;
}

const PLACEHOLDER_KEY = 'sk-...';

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = loadAiSettings();
    if (s) {
      setApiKey(s.apiKey ? '••••••••••••' : '');
      setBaseUrl(s.baseUrl || DEFAULT_BASE_URL);
      setModel(s.model || DEFAULT_MODEL);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() === '') {
      clearAiSettings();
      setApiKey('');
      setBaseUrl(DEFAULT_BASE_URL);
      setModel(DEFAULT_MODEL);
      setSaved(true);
      setTimeout(() => onClose(), 600);
      return;
    }
    const keyToSave =
      apiKey === '••••••••••••' ? loadAiSettings()?.apiKey : apiKey.trim();
    if (keyToSave) {
      saveAiSettings({
        apiKey: keyToSave,
        baseUrl: baseUrl.trim() || DEFAULT_BASE_URL,
        model: model.trim() || DEFAULT_MODEL,
      });
      setSaved(true);
      setTimeout(() => onClose(), 800);
    }
  };

  const handleClear = () => {
    clearAiSettings();
    setApiKey('');
    setBaseUrl(DEFAULT_BASE_URL);
    setModel(DEFAULT_MODEL);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  const hasKey = !!loadAiSettings()?.apiKey;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2>Prévision IA</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Optionnel : ajoutez une clé API (OpenAI ou compatible) pour améliorer la prévision avec l’IA.
            Sans clé, la prévision reste calculée localement comme aujourd’hui.
          </p>
          <label>
            Clé API (token)
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={PLACEHOLDER_KEY}
            />
          </label>
          <label>
            URL de l’API (optionnel)
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={DEFAULT_BASE_URL}
            />
          </label>
          <label>
            Modèle (optionnel)
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
            />
          </label>
          <div className="modal-actions">
            {hasKey && (
              <button type="button" className="btn btn-secondary" onClick={handleClear}>
                Désactiver l’IA
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {saved ? 'Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
