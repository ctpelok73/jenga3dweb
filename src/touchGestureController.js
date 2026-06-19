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
const LONG_PRESS_MOVE_TOLERANCE = 12;
const DEFAULT_IGNORE_SELECTOR = 'button,input,textarea,select,a,[role="button"]';

function normalizeEventName(eventName) {
  if (!eventName) return '';
  if (eventName.startsWith('on')) return eventName;
  return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}

export class TouchGestureController {
  constructor(element, options = {}) {
    this.element = element;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchStartDistance = 0;
    this.longPressTimer = null;
    this.longPressFired = false;
    this.singleTouchTracking = false;
    this.enabled = options.enabled ?? true;
    this.ignoreSelector = options.ignoreSelector || DEFAULT_IGNORE_SELECTOR;

    this.callbacks = {
      onSwipeLeft: null,
      onSwipeRight: null,
      onSwipeUp: null,
      onSwipeDown: null,
      onPinch: null,
      onLongPress: null,
    };

    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleTouchCancel = this.handleTouchCancel.bind(this);

    this.setupListeners();
  }

  setOptions(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'enabled')) {
      this.enabled = options.enabled;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'ignoreSelector')) {
      this.ignoreSelector = options.ignoreSelector || DEFAULT_IGNORE_SELECTOR;
    }
  }

  shouldIgnoreEvent(e) {
    if (!this.enabled) return true;
    if (!this.ignoreSelector || !e.target || !e.target.closest) return false;
    return Boolean(e.target.closest(this.ignoreSelector));
  }

  clearLongPress() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  setupListeners() {
    this.element.addEventListener('touchstart', this.boundHandleTouchStart, false);
    this.element.addEventListener('touchmove', this.boundHandleTouchMove, false);
    this.element.addEventListener('touchend', this.boundHandleTouchEnd, false);
    this.element.addEventListener('touchcancel', this.boundHandleTouchCancel, false);
  }

  handleTouchStart(e) {
    if (this.shouldIgnoreEvent(e)) return;
    this.longPressFired = false;
    this.singleTouchTracking = e.touches.length === 1;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();

      // Запустить long-press таймер
      this.longPressTimer = setTimeout(() => {
        if (this.callbacks.onLongPress) {
          this.longPressFired = true;
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
      this.clearLongPress();
    }
  }

  handleTouchMove(e) {
    if (this.shouldIgnoreEvent(e)) return;

    if (e.touches.length === 1 && this.singleTouchTracking) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      if (Math.hypot(deltaX, deltaY) > LONG_PRESS_MOVE_TOLERANCE) {
        this.clearLongPress();
      }
    }

    if (e.touches.length === 2) {
      // Pinch gesture
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      if (this.touchStartDistance === 0) return;
      const scale = currentDistance / this.touchStartDistance;

      if (Math.abs(scale - 1) > PINCH_THRESHOLD && this.callbacks.onPinch) {
        this.callbacks.onPinch(scale);
      }
    }
  }

  handleTouchEnd(e) {
    if (this.shouldIgnoreEvent(e)) return;
    this.clearLongPress();

    if (this.longPressFired) {
      this.longPressFired = false;
      this.singleTouchTracking = false;
      return;
    }

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
    this.singleTouchTracking = false;
  }

  handleTouchCancel(e) {
    this.clearLongPress();
    this.longPressFired = false;
    this.singleTouchTracking = false;
  }

  /**
   * Зарегистрировать callback для события
   */
  on(eventName, callback) {
    const key = normalizeEventName(eventName);
    if (this.callbacks.hasOwnProperty(key)) {
      this.callbacks[key] = callback;
    }
  }

  setCallbacks(callbacks = {}) {
    for (const key of Object.keys(this.callbacks)) {
      this.callbacks[key] = null;
    }
    Object.entries(callbacks).forEach(([event, callback]) => {
      this.on(event, callback);
    });
  }

  /**
   * Триггер haptic feedback (вибрация)
   */
  triggerHaptic(type = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
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
    this.element.removeEventListener('touchstart', this.boundHandleTouchStart);
    this.element.removeEventListener('touchmove', this.boundHandleTouchMove);
    this.element.removeEventListener('touchend', this.boundHandleTouchEnd);
    this.element.removeEventListener('touchcancel', this.boundHandleTouchCancel);
  }
}

/**
 * React Hook для управления touch-жестами
 */
export function useTouchGestures(elementRef, callbacks = {}, options = {}) {
  const controllerRef = React.useRef(null);
  const callbacksRef = React.useRef(callbacks);
  const optionsRef = React.useRef(options);

  // Всегда держим callbacksRef актуальным без триггера эффекта
  React.useEffect(() => {
    callbacksRef.current = callbacks;
    controllerRef.current?.setCallbacks(callbacks);
  });

  React.useEffect(() => {
    optionsRef.current = options;
    controllerRef.current?.setOptions(options);
  }, [options.enabled, options.ignoreSelector]);

  // Контроллер создаётся только при монтировании elementRef
  React.useEffect(() => {
    if (!elementRef.current) return;

    const ctrl = new TouchGestureController(elementRef.current, optionsRef.current);

    // Читаем callbacks из ref — всегда актуальные, без пересоздания контроллера
    ctrl.setCallbacks(callbacksRef.current);

    controllerRef.current = ctrl;

    return () => {
      ctrl.destroy();
      controllerRef.current = null;
    };
  }, [elementRef]); // Зависит только от elementRef, не от callbacks

  return controllerRef.current;
}
