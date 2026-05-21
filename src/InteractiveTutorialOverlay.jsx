import React, { useState } from 'react';

/**
 * InteractiveTutorialOverlay: интерактивный гайд с подсвечиванием элементов
 * Показывает пошаговые инструкции и визуально указывает на нужные элементы
 */
export function InteractiveTutorialOverlay({ onDone }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: '👋',
      title: 'Добро пожаловать в Jenga 3D!',
      text: 'Это игра, где ты вытаскиваешь блоки из башни и ставишь их сверху. Не урони башню!',
      highlight: null,
      nextText: 'Далее →',
    },
    {
      emoji: '👆',
      title: 'Шаг 1: Выбери блок',
      text: 'Кликни на любой блок из середины или нижней части башни. Не выбирай блоки из верхнего слоя!',
      highlight: 'block',
      nextText: 'Далее →',
    },
    {
      emoji: '⬆️',
      title: 'Шаг 2: Перетащи блок',
      text: 'Перетащи выбранный блок на зелёный слот наверху башни. Или нажми кнопку "Сделать ход".',
      highlight: 'dropslot',
      nextText: 'Далее →',
    },
    {
      emoji: '🎯',
      title: 'Шаг 3: Смотри и не урони!',
      text: 'Башня должна стабилизироваться. Если рухнет — ты проиграл. Попробуй собрать как можно больше ходов!',
      highlight: 'tower',
      nextText: 'Начать игру ▶',
    },
  ];

  const currentStep = steps[step];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 100,
      pointerEvents: 'auto',
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Spotlight highlight */}
      {currentStep.highlight && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
      )}

      {/* Tutorial card */}
      <div style={{
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        padding: '32px 40px',
        borderRadius: 16,
        backdropFilter: 'blur(12px)',
        textAlign: 'center',
        maxWidth: 380,
        border: '2px solid rgba(42,110,255,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{currentStep.emoji}</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 'bold', color: '#2a6eff' }}>
          {currentStep.title}
        </h2>
        <p style={{ fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.6 }}>
          {currentStep.text}
        </p>

        {/* Keyboard/Touch hint */}
        <div style={{ fontSize: 11, color: '#666', marginBottom: 16, fontStyle: 'italic' }}>
          {step < steps.length - 1 ? 'Нажми Пробел или стрелку → для быстрого перехода' : ''}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ← Назад
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                onDone();
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2a6eff',
              color: '#fff',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {currentStep.nextText}
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: i <= step ? '#2a6eff' : '#444',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default InteractiveTutorialOverlay;
