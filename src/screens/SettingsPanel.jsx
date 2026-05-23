import React, { useState } from 'react';
import { screenStyles, baseStyles } from '../styles';
import { getSettings, updateAllSettings } from '../settingsTracker';
import { updateMasterVolume } from '../soundEngine';
import { clearTextureCache } from '../blockTextures';

export default function SettingsPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(() => getSettings());

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

  const selectStyle = (isActive) => ({
    padding: '6px 12px', borderRadius: 6, border: 'none',
    background: isActive ? '#2a6eff' : 'rgba(255,255,255,0.08)',
    color: isActive ? '#fff' : '#aaa', fontSize: 13,
    cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
  });

  return (
    <div style={screenStyles.container} role="dialog" aria-label="Настройки">
      <div style={{ ...screenStyles.card, maxWidth: 400, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>⚙️ Настройки</h2>
          <button onClick={onClose} aria-label="Закрыть настройки" style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🔊 Громкость: {settings.volume}%</div>
          <input type="range" min="0" max="100" value={settings.volume}
            onChange={(e) => handleChange('volume', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2a6eff' }}
            aria-label="Громкость"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>⏱️ Таймер хода</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {timerOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.moveTimer === opt.value)}
                onClick={() => handleChange('moveTimer', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>📐 Сложность</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {diffOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.difficulty === opt.value)}
                onClick={() => handleChange('difficulty', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🎨 Тема блоков</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {themeOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.theme === opt.value)}
                onClick={() => { handleChange('theme', opt.value); clearTextureCache(); }}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🌍 Окружение</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {envOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.environment === opt.value)}
                onClick={() => handleChange('environment', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={handleReset}>Сбросить</button>
          <button style={{ ...baseStyles.btn, fontSize: 13 }} onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}