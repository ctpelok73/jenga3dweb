import React, { useRef, useEffect, useState } from 'react';

/**
 * DragVisualFeedback: показывает визуальную подсказку при драге блока
 * - Траектория от блока к слоту
 * - Подсвечивание целевого слота
 * - Координаты курсора
 */
export function DragVisualFeedback({ isDragging, dragPos, targetSlot, blockPosition }) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDragging || !dragPos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Курсор блока */}
      <div
        style={{
          position: 'fixed',
          left: dragPos.x - 15,
          top: dragPos.y - 15,
          width: 30,
          height: 30,
          background: 'rgba(42, 110, 255, 0.8)',
          border: '2px solid #2a6eff',
          borderRadius: '50%',
          boxShadow: '0 0 10px rgba(42, 110, 255, 0.6)',
          animation: 'pulse 0.6s infinite',
        }}
      />

      {/* Подсказка "Отпусти здесь" над слотом */}
      {targetSlot !== null && (
        <div
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(42, 110, 255, 0.9)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(42, 110, 255, 0.5)',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          ⬇️ Отпусти здесь!
        </div>
      )}

      {/* CSS анимации */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0.5; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default DragVisualFeedback;
