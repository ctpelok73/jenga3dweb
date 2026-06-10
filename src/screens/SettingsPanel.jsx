import React, { useState, useMemo } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { getSettings, updateAllSettings } from '../settingsTracker';
import { updateMasterVolume } from '../soundEngine';
import { clearTextureCache } from '../blockTextureCache';
import { getAvailableSkins, getAvailableEnvThemes } from '../purchaseService';

export default function SettingsPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(() => getSettings());
  const availableSkins = useMemo(() => getAvailableSkins(), []);
  const availableEnvThemes = useMemo(() => getAvailableEnvThemes(), []);
  const modalRef = useModalA11y({ onEscape: onClose });

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    updateAllSettings(updated);
    if (key === 'volume') updateMasterVolume();
    if (onSettingsChange) onSettingsChange(updated);
  };

  const handleReset = () => {
    const defaults = { volume: 70, moveTimer: 0, difficulty: 'normal', theme: 'classic', environment: 'classic' };
    setSettings(defaults);
    updateAllSettings(defaults);
    updateMasterVolume();
    if (onSettingsChange) onSettingsChange(defaults);
  };

  const timerOptions = [
    { label: 'Выкл', value: 0 },
    { label: '15 сек', value: 15 },
    { label: '30 сек', value: 30 },
    { label: '60 сек', value: 60 },
  ];

  const diffOptions = [
    { label: '🟢 Лёгкий', value: 'easy' },
    { label: '🟡 Обычный', value: 'normal' },
    { label: '🔴 Сложный', value: 'hard' },
  ];

  const themeOptions = [
    { label: '🪵 Классика', value: 'classic' },
    { label: '💜 Неон', value: 'neon' },
    { label: '🤍 Мрамор', value: 'marble' },
    { label: '🧊 Лёд', value: 'ice' },
    { label: '🎋 Бамбук', value: 'bamboo' },
    { label: '🍬 Конфеты', value: 'candy' },
  ];

  const envOptions = [
    { label: '🪵 Классика', value: 'classic' },
    { label: '🌌 Космос', value: 'space' },
    { label: '🏖️ Пляж', value: 'beach' },
    { label: '📚 Библиотека', value: 'library' },
  ];

  return (
    <div className="j-overlay" role="dialog" aria-label="Настройки" ref={modalRef}>
      <div className="j-card j-card--wide j-card--left">
        <div className="j-header">
          <h2 className="j-heading j-heading--sm">⚙️ Настройки</h2>
          <button onClick={onClose} aria-label="Закрыть настройки" className="j-close-btn">✕</button>
        </div>

        <div className="j-settings-section">
          <div className="j-settings-label">🔊 Громкость: {settings.volume}%</div>
          <input type="range" min="0" max="100" value={settings.volume}
            onChange={(e) => handleChange('volume', Number(e.target.value))}
            className="j-settings-range"
            aria-label="Громкость"
          />
        </div>

        <div className="j-settings-section">
          <div className="j-settings-label">⏱️ Таймер хода</div>
          <div className="j-opt-group">
            {timerOptions.map(opt => (
              <button key={opt.value} className={`j-opt-btn${settings.moveTimer === opt.value ? ' is-active' : ''}`}
                onClick={() => handleChange('moveTimer', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="j-settings-section">
          <div className="j-settings-label">📐 Сложность</div>
          <div className="j-opt-group">
            {diffOptions.map(opt => (
              <button key={opt.value} className={`j-opt-btn${settings.difficulty === opt.value ? ' is-active' : ''}`}
                onClick={() => handleChange('difficulty', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div className="j-settings-section">
          <div className="j-settings-label">🎨 Тема блоков</div>
          <div className="j-opt-group">
            {themeOptions.map(opt => {
              const locked = !availableSkins.includes(opt.value);
              return (
                <button key={opt.value}
                  className={`j-opt-btn${settings.theme === opt.value ? ' is-active' : ''}${locked ? ' j-opt-btn--locked' : ''}`}
                  onClick={() => { if (!locked) { handleChange('theme', opt.value); clearTextureCache(); } }}
                  disabled={locked}
                  title={locked ? 'Премиум — доступно после покупки' : ''}
                >{opt.label}</button>
              );
            })}
          </div>
        </div>

        <div className="j-settings-section">
          <div className="j-settings-label">🌍 Окружение</div>
          <div className="j-opt-group">
            {envOptions.map(opt => {
              const locked = !availableEnvThemes.includes(opt.value);
              return (
                <button key={opt.value}
                  className={`j-opt-btn${settings.environment === opt.value ? ' is-active' : ''}${locked ? ' j-opt-btn--locked' : ''}`}
                  onClick={() => { if (!locked) handleChange('environment', opt.value); }}
                  disabled={locked}
                  title={locked ? 'Премиум — доступно после покупки' : ''}
                >{opt.label}</button>
              );
            })}
          </div>
        </div>

        <div className="j-flex-end">
          <button className="j-btn j-btn--ghost" onClick={handleReset}>Сбросить</button>
          <button className="j-btn j-btn--primary" onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}