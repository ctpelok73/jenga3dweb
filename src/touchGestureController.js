/**
 * touchGestureController.js — Управление сенсорными жестами для мобильных устройств
 *
 * Поддерживает:
 * - Swipe (влево/вправо/вверх/вниз)
 * - Pinch-zoom для камеры
 * - Long-press для контекстного меню
 * - Haptic feedback (vibration API)
 */

import React from 'react';

const SWIPE_THRESHOLD = 50; // Минимальное расстояние для свайпа
const SWIPE_TIME_THRESHOLD = 300; // Максимальное время для свайпа (ms)
const PINCH_THRESHOLD = 0.1; // Минимальное изменение расстояния между пальцами
const LONG_PRESS_DURATION = 500; // Время для long-press (ms)

export class TouchGestureController {
  constructor(element) {
    this.element = element;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchStartDistance = 0;
    this.longPressTimer = null;

    this.callbacks = {
      onSwipeLeft: null,
      onSwipeRight: null,
      onSwipeUp: null,
      onSwipeDown: null,
      onPinch: null,
      onLongPress: null,
    };

    this.setupListeners();
  }

  setupListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), false);
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();

      // Запустить long-press таймер
      this.longPressTimer = setTimeout(() => {
        if (this.callbacks.onLongPress) {
          this.callbacks.onLongPress(touch.clientX, touch.clientY);
          this.triggerHaptic('medium');
        }
      }, LONG_PRESS_DURATION);
    } else if (e.touches.length === 2) {
      // Pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
      clearTimeout(this.longPressTimer);
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2) {
      // Pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const scale = currentDistance / this.touchStartDistance;

      if (Math.abs(scale - 1) > PINCH_THRESHOLD && this.callbacks.onPinch) {
        this.callbacks.onPinch(scale);
      }
    }
  }

  handleTouchEnd(e) {
    clearTimeout(this.longPressTimer);

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      const deltaTime = Date.now() - this.touchStartTime;

      // Проверить, был ли свайп
      if (deltaTime < SWIPE_TIME_THRESHOLD) {
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
          // Горизонтальный свайп
          if (deltaX > 0) {
            if (this.callbacks.onSwipeRight) {
              this.callbacks.onSwipeRight();
              this.triggerHaptic('light');
            }
          } else {
            if (this.callbacks.onSwipeLeft) {
              this.callbacks.onSwipeLeft();
              this.triggerHaptic('light');
            }
          }
        } else if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
          // Вертикальный свайп
          if (deltaY > 0) {
            if (this.callbacks.onSwipeDown) {
              this.callbacks.onSwipeDown();
              this.triggerHaptic('light');
            }
          } else {
            if (this.callbacks.onSwipeUp) {
              this.callbacks.onSwipeUp();
              this.triggerHaptic('light');
            }
          }
        }
      }
    }
  }

  handleTouchCancel(e) {
    clearTimeout(this.longPressTimer);
  }

  /**
   * Зарегистрировать callback для события
   */
  on(eventName, callback) {
    if (this.callbacks.hasOwnProperty(`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`)) {
      this.callbacks[`on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`] = callback;
    }
  }

  /**
   * Триггер haptic feedback (вибрация)
   */
  triggerHaptic(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 50,
      };
      navigator.vibrate(patterns[type] || 10);
    }
  }

  /**
   * Очистить все listeners
   */
  destroy() {
    clearTimeout(this.longPressTimer);
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}

/**
 * React Hook для управления touch-жестами
 */
export function useTouchGestures(elementRef, callbacks = {}) {
  const [controller, setController] = React.useState(null);
  const callbacksRef = React.useRef(callbacks);

  // Всегда держим callbacksRef актуальным без триггера эффекта
  React.useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Контроллер создаётся только при монтировании elementRef
  React.useEffect(() => {
    if (!elementRef.current) return;

    const ctrl = new TouchGestureController(elementRef.current);

    // Читаем callbacks из ref — всегда актуальные, без пересоздания контроллера
    Object.entries(callbacksRef.current).forEach(([event, callback]) => {
      if (callback) {
        ctrl.on(event, callback);
      }
    });

    setController(ctrl);

    return () => {
      ctrl.destroy();
    };
  }, [elementRef]); // Зависит только от elementRef, не от callbacks

  return controller;
}
