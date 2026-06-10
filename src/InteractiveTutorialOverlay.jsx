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
      title: 'Шаг 2: Поставь блок наверх',
      text: 'Нажми на зелёный слот наверху башни или на кнопку "Сделать ход", чтобы переставить выбранный блок.',
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
    <div className="j-tutorial-overlay">
      {/* Spotlight highlight */}
      {currentStep.highlight && (
        <div className="j-spotlight">
          <div className="j-spotlight__glow" />
        </div>
      )}

      {/* Tutorial card */}
      <div className="j-tutorial-card">
        <div className="j-tutorial-emoji">{currentStep.emoji}</div>
        <h2 className="j-tutorial-title">{currentStep.title}</h2>
        <p className="j-tutorial-text">{currentStep.text}</p>

        {/* Keyboard/Touch hint */}
        <div className="j-tutorial-hint">
          {step < steps.length - 1 ? 'Нажми Пробел или стрелку → для быстрого перехода' : ''}
        </div>

        {/* Buttons */}
        <div className="j-tutorial-buttons">
          {step > 0 && (
            <button
              className="j-btn j-btn--secondary"
              onClick={() => setStep(step - 1)}
            >
              ← Назад
            </button>
          )}
          <button
            className="j-btn j-btn--primary"
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                onDone();
              }
            }}
          >
            {currentStep.nextText}
          </button>
        </div>

        {/* Progress dots */}
        <div className="j-tutorial-dots">
          {steps.map((_, i) => (
            <button
              key={i}
              className={`j-tutorial-dot ${i <= step ? 'j-tutorial-dot--active' : 'j-tutorial-dot--inactive'}`}
              onClick={() => setStep(i)}
              aria-label={`Шаг ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default InteractiveTutorialOverlay;
