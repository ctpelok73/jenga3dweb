import { describe, expect, it, vi } from 'vitest';
import { TouchGestureController, useTouchGestures } from '../touchGestureController';
import { renderHook, act } from '@testing-library/react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTouchList(touches) {
  return {
    length: touches.length,
    item: (i) => touches[i],
    ...touches,
    [Symbol.iterator]: function* () { for (let i = 0; i < this.length; i++) yield touches[i]; },
  };
}

function touchEvent({
  target = document.createElement('div'),
  x = 0,
  y = 0,
  touches = 1,
  changedTouches = 1,
  touch2OffsetX = 100,
  touch2OffsetY = 0,
} = {}) {
  const primary = { clientX: x, clientY: y };
  const touchesArr = [];
  if (touches >= 1) touchesArr.push(primary);
  if (touches >= 2) touchesArr.push({ clientX: x + touch2OffsetX, clientY: y + touch2OffsetY });

  const changedArr = [];
  const changed = { clientX: x, clientY: y };
  if (changedTouches >= 1) changedArr.push(changed);
  if (changedTouches >= 2) changedArr.push({ clientX: x + touch2OffsetX, clientY: y + touch2OffsetY });

  return {
    target,
    touches: makeTouchList(touchesArr),
    changedTouches: makeTouchList(changedArr),
    preventDefault: vi.fn(),
  };
}

function createController(options = {}) {
  const element = document.createElement('div');
  const controller = new TouchGestureController(element, options);
  return { controller, element };
}

// ─── constructor ────────────────────────────────────────────────────────────

describe('constructor', () => {
  it('creates instance with default options', () => {
    const { controller, element } = createController();
    expect(controller).toBeInstanceOf(TouchGestureController);
    expect(controller.element).toBe(element);
    expect(controller.enabled).toBe(true);
    expect(controller.ignoreSelector).toBe('button,input,textarea,select,a,[role="button"]');
  });

  it('accepts enabled=false option', () => {
    const { controller } = createController({ enabled: false });
    expect(controller.enabled).toBe(false);
  });

  it('accepts custom ignoreSelector', () => {
    const { controller } = createController({ ignoreSelector: '.no-touch' });
    expect(controller.ignoreSelector).toBe('.no-touch');
  });

  it('binds all handlers and calls setupListeners', () => {
    const element = document.createElement('div');
    const addSpy = vi.spyOn(element, 'addEventListener');
    // eslint-disable-next-line no-new
    new TouchGestureController(element);
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function), false);
  });
});

// ─── setOptions ─────────────────────────────────────────────────────────────

describe('setOptions', () => {
  it('updates enabled when provided', () => {
    const { controller } = createController();
    controller.setOptions({ enabled: false });
    expect(controller.enabled).toBe(false);
  });

  it('does not change enabled when not provided', () => {
    const { controller } = createController({ enabled: false });
    controller.setOptions({ ignoreSelector: '.x' });
    expect(controller.enabled).toBe(false);
  });

  it('updates ignoreSelector', () => {
    const { controller } = createController();
    controller.setOptions({ ignoreSelector: '.custom' });
    expect(controller.ignoreSelector).toBe('.custom');
  });

  it('resets ignoreSelector to default when empty string provided', () => {
    const { controller } = createController();
    controller.setOptions({ ignoreSelector: '' });
    expect(controller.ignoreSelector).toBe('button,input,textarea,select,a,[role="button"]');
  });

  it('handles empty options without error', () => {
    const { controller } = createController();
    expect(() => controller.setOptions({})).not.toThrow();
  });
});

// ─── shouldIgnoreEvent ──────────────────────────────────────────────────────

describe('shouldIgnoreEvent', () => {
  it('returns true when disabled', () => {
    const { controller } = createController({ enabled: false });
    expect(controller.shouldIgnoreEvent({ target: document.body })).toBe(true);
  });

  it('returns false when no ignoreSelector', () => {
    const { controller } = createController({ ignoreSelector: '' });
    expect(controller.shouldIgnoreEvent({ target: document.body })).toBe(false);
  });

  it('returns false when target has no closest method', () => {
    const { controller } = createController();
    const event = { target: {} }; // no closest
    expect(controller.shouldIgnoreEvent(event)).toBe(false);
  });

  it('returns true when target matches selector', () => {
    const { controller } = createController();
    const button = document.createElement('button');
    const event = { target: button, closest: (sel) => button.closest(sel) };
    expect(controller.shouldIgnoreEvent(event)).toBe(true);
  });

  it('returns false when target does not match selector', () => {
    const { controller } = createController();
    const div = document.createElement('div');
    const event = { target: div, closest: (sel) => div.closest(sel) };
    expect(controller.shouldIgnoreEvent(event)).toBe(false);
  });
});

// ─── handleTouchStart ───────────────────────────────────────────────────────

describe('handleTouchStart', () => {
  it('stores position for single touch', () => {
    const { controller, element } = createController();
    controller.handleTouchStart(touchEvent({ target: element, x: 100, y: 200 }));
    expect(controller.touchStartX).toBe(100);
    expect(controller.touchStartY).toBe(200);
    expect(controller.singleTouchTracking).toBe(true);
    expect(controller.longPressTimer).not.toBeNull();
  });

  it('does not start long press when disabled', () => {
    const { controller, element } = createController({ enabled: false });
    vi.spyOn(controller, 'clearLongPress');
    controller.handleTouchStart(touchEvent({ target: element }));
    expect(controller.clearLongPress).not.toHaveBeenCalled();
  });

  it('fires longPress callback after delay', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onLongPress = vi.fn();
    controller.setCallbacks({ onLongPress });

    controller.handleTouchStart(touchEvent({ target: element, x: 50, y: 60 }));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledWith(50, 60);
    expect(controller.longPressFired).toBe(true);
    vi.useRealTimers();
  });

  it('clears long press on two-finger touch (pinch start)', () => {
    const { controller, element } = createController();
    controller.handleTouchStart(touchEvent({ target: element, x: 100, y: 100, touches: 2 }));
    expect(controller.touchStartDistance).toBeGreaterThan(0);
    expect(controller.longPressTimer).toBeNull();
    expect(controller.singleTouchTracking).toBe(false);
  });
});

// ─── handleTouchMove ───────────────────────────────────────────────────────

describe('handleTouchMove', () => {
  it('clears long press when finger moves past tolerance', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onLongPress = vi.fn();
    controller.setCallbacks({ onLongPress });
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    // Move past tolerance (LONG_PRESS_MOVE_TOLERANCE = 12)
    controller.handleTouchMove(touchEvent({ target: element, x: 20, y: 0 }));
    vi.advanceTimersByTime(600);
    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not clear long press for small movements', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onLongPress = vi.fn();
    controller.setCallbacks({ onLongPress });
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    // Move below tolerance (12)
    controller.handleTouchMove(touchEvent({ target: element, x: 5, y: 5 }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ignores move when disabled', () => {
    const { controller, element } = createController({ enabled: false });
    vi.spyOn(controller, 'clearLongPress');
    controller.handleTouchMove(touchEvent({ target: element }));
    expect(controller.clearLongPress).not.toHaveBeenCalled();
  });

  it('fires pinch callback when scale exceeds threshold', () => {
    const { controller, element } = createController();
    const onPinch = vi.fn();
    controller.setCallbacks({ onPinch });

    // Two-finger touch start at x=0, with second finger at x+100
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0, touches: 2 }));
    const startDist = controller.touchStartDistance;

    // Move both fingers outward: offset +20 on each (total +40)
    controller.handleTouchMove(touchEvent({
      target: element, x: 0, y: 0, touches: 2,
      touch2OffsetX: 100 + 40, // original 100 + 40 outward
    }));

    const expectedScale = (100 + 40) / startDist;
    expect(onPinch).toHaveBeenCalledWith(expectedScale);
  });

  it('does not fire pinch when scale is below threshold', () => {
    const { controller, element } = createController();
    const onPinch = vi.fn();
    controller.setCallbacks({ onPinch });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0, touches: 2 }));
    // Very small movement below PINCH_THRESHOLD (0.1)
    controller.handleTouchMove(touchEvent({
      target: element, x: 0, y: 0, touches: 2,
      touch2OffsetX: 105, // scale = 105/100 = 1.05, diff = 0.05 < 0.1
    }));
    expect(onPinch).not.toHaveBeenCalled();
  });

  it('returns early when touchStartDistance is 0 (no start recorded)', () => {
    const { controller, element } = createController();
    const onPinch = vi.fn();
    controller.setCallbacks({ onPinch });
    // Call handleTouchMove without prior handleTouchStart (touchStartDistance=0)
    controller.handleTouchMove(touchEvent({ target: element, x: 0, y: 0, touches: 2 }));
    expect(onPinch).not.toHaveBeenCalled();
  });

  it('does not track move when not singleTouchTracking', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onLongPress = vi.fn();
    controller.setCallbacks({ onLongPress });
    // Start with two touches → singleTouchTracking = false; clears long press timer
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0, touches: 2 }));
    // Move with one touch → not tracked because singleTouchTracking is false
    controller.handleTouchMove(touchEvent({ target: element, x: 30, y: 0 }));
    vi.advanceTimersByTime(600);
    // Long press was already cleared on two-finger start
    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ─── handleTouchEnd ─────────────────────────────────────────────────────────

describe('handleTouchEnd', () => {
  it('ignores when disabled', () => {
    const { controller, element } = createController({ enabled: false });
    const onSwipeLeft = vi.fn();
    controller.setCallbacks({ onSwipeLeft });
    controller.handleTouchStart(touchEvent({ target: element, x: 100, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 0, y: 0 }));
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('resets flags after longPressFired and does not swipe', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onSwipeLeft = vi.fn();
    controller.setCallbacks({ onLongPress: vi.fn(), onSwipeLeft });

    // Long press sequence
    controller.handleTouchStart(touchEvent({ target: element, x: 50, y: 60 }));
    vi.advanceTimersByTime(500);
    expect(controller.longPressFired).toBe(true);

    // End the touch — should NOT trigger swipe because longPressFired
    controller.handleTouchEnd(touchEvent({ target: element, x: 0, y: 0 }));
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(controller.longPressFired).toBe(false);
    expect(controller.singleTouchTracking).toBe(false);
    vi.useRealTimers();
  });

  it('detects swipe right', () => {
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    controller.setCallbacks({ onSwipeRight });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 100, y: 0 }));

    expect(onSwipeRight).toHaveBeenCalled();
  });

  it('detects swipe left', () => {
    const { controller, element } = createController();
    const onSwipeLeft = vi.fn();
    controller.setCallbacks({ onSwipeLeft });

    controller.handleTouchStart(touchEvent({ target: element, x: 100, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 0, y: 0 }));

    expect(onSwipeLeft).toHaveBeenCalled();
  });

  it('detects swipe down', () => {
    const { controller, element } = createController();
    const onSwipeDown = vi.fn();
    controller.setCallbacks({ onSwipeDown });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 0, y: 100 }));

    expect(onSwipeDown).toHaveBeenCalled();
  });

  it('detects swipe up', () => {
    const { controller, element } = createController();
    const onSwipeUp = vi.fn();
    controller.setCallbacks({ onSwipeUp });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 100 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 0, y: 0 }));

    expect(onSwipeUp).toHaveBeenCalled();
  });

  it('prioritizes dominant axis for diagonal swipes (vertical dominates)', () => {
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    const onSwipeDown = vi.fn();
    controller.setCallbacks({ onSwipeRight, onSwipeDown });

    // deltaX=60 > SWIPE_THRESHOLD (50) but |deltaY|=200 > |deltaX|=60 → vertical branch
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 60, y: 200 }));

    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeDown).toHaveBeenCalled();
  });

  it('prioritizes dominant axis for diagonal swipes (horizontal dominates)', () => {
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    const onSwipeUp = vi.fn();
    controller.setCallbacks({ onSwipeRight, onSwipeUp });

    // deltaX=200 > SWIPE_THRESHOLD (50) and 200 > |60| → horizontal branch
    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: element, x: 200, y: 60 }));

    expect(onSwipeRight).toHaveBeenCalled();
    expect(onSwipeUp).not.toHaveBeenCalled();
  });

  it('ignores slow swipe past time threshold', () => {
    vi.useFakeTimers();
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    controller.setCallbacks({ onSwipeRight });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    // Advance time past SWIPE_TIME_THRESHOLD (300ms)
    vi.advanceTimersByTime(400);
    controller.handleTouchEnd(touchEvent({ target: element, x: 100, y: 0 }));

    expect(onSwipeRight).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('ignores short swipe below distance threshold', () => {
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    controller.setCallbacks({ onSwipeRight });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    // deltaX=30 < SWIPE_THRESHOLD (50)
    controller.handleTouchEnd(touchEvent({ target: element, x: 30, y: 0 }));

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not fire swipe when changedTouches.length is not 1', () => {
    const { controller, element } = createController();
    const onSwipeRight = vi.fn();
    controller.setCallbacks({ onSwipeRight });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    // changedTouches=2 → not 1
    controller.handleTouchEnd(touchEvent({ target: element, x: 100, y: 0, changedTouches: 2 }));

    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});

// ─── handleTouchCancel ──────────────────────────────────────────────────────

describe('handleTouchCancel', () => {
  it('clears long press timer and resets flags', () => {
    const { controller, element } = createController();
    vi.spyOn(controller, 'clearLongPress');

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchCancel({});

    expect(controller.clearLongPress).toHaveBeenCalled();
    expect(controller.longPressFired).toBe(false);
    expect(controller.singleTouchTracking).toBe(false);
  });
});

// ─── clearLongPress ─────────────────────────────────────────────────────────

describe('clearLongPress', () => {
  it('clears timeout and sets timer to null', () => {
    vi.useFakeTimers();
    const { controller } = createController();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    controller.longPressTimer = setTimeout(vi.fn(), 500);
    controller.clearLongPress();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(controller.longPressTimer).toBeNull();
    vi.useRealTimers();
  });

  it('is safe to call when timer is already null', () => {
    const { controller } = createController();
    expect(() => controller.clearLongPress()).not.toThrow();
  });
});

// ─── on (register callback) ─────────────────────────────────────────────────

describe('on', () => {
  it('registers callback for valid event name', () => {
    const { controller } = createController();
    const cb = vi.fn();
    controller.on('onSwipeLeft', cb);
    expect(controller.callbacks.onSwipeLeft).toBe(cb);
  });

  it('normalizes event name without "on" prefix', () => {
    const { controller } = createController();
    const cb = vi.fn();
    controller.on('swipeLeft', cb);
    expect(controller.callbacks.onSwipeLeft).toBe(cb);
  });

  it('does not register for unknown event', () => {
    const { controller } = createController();
    const cb = vi.fn();
    controller.on('unknownEvent', cb);
    expect(Object.values(controller.callbacks).every((v) => v === null)).toBe(true);
  });

  it('handles empty event name', () => {
    const { controller } = createController();
    const cb = vi.fn();
    controller.on('', cb);
    expect(Object.values(controller.callbacks).every((v) => v === null)).toBe(true);
  });
});

// ─── setCallbacks ───────────────────────────────────────────────────────────

describe('setCallbacks', () => {
  it('sets multiple callbacks at once', () => {
    const { controller } = createController();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    controller.setCallbacks({ onSwipeLeft: cb1, onSwipeRight: cb2 });
    expect(controller.callbacks.onSwipeLeft).toBe(cb1);
    expect(controller.callbacks.onSwipeRight).toBe(cb2);
  });

  it('resets all callbacks to null before setting new ones', () => {
    const { controller } = createController();
    controller.setCallbacks({ onSwipeLeft: vi.fn() });
    const swipeRight = vi.fn();
    controller.setCallbacks({ onSwipeRight: swipeRight });
    expect(controller.callbacks.onSwipeLeft).toBeNull();
    expect(controller.callbacks.onSwipeRight).toBe(swipeRight);
  });

  it('resets all callbacks when given empty object', () => {
    const { controller } = createController();
    controller.setCallbacks({ onSwipeLeft: vi.fn(), onSwipeRight: vi.fn() });
    controller.setCallbacks({});
    expect(Object.values(controller.callbacks).every((v) => v === null)).toBe(true);
  });
});

// ─── triggerHaptic ──────────────────────────────────────────────────────────

describe('triggerHaptic', () => {
  beforeEach(() => {
    globalThis.navigator.vibrate = vi.fn();
  });

  it('calls navigator.vibrate with light pattern by default', () => {
    const { controller } = createController();
    controller.triggerHaptic();
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('calls navigator.vibrate with medium pattern', () => {
    const { controller } = createController();
    controller.triggerHaptic('medium');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(20);
  });

  it('calls navigator.vibrate with heavy pattern', () => {
    const { controller } = createController();
    controller.triggerHaptic('heavy');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('falls back to light pattern for unknown type', () => {
    const { controller } = createController();
    controller.triggerHaptic('unknown');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('does not throw when navigator.vibrate is not available', () => {
    delete globalThis.navigator.vibrate;
    const { controller } = createController();
    expect(() => controller.triggerHaptic()).not.toThrow();
  });
});

// ─── destroy ────────────────────────────────────────────────────────────────

describe('destroy', () => {
  it('removes all event listeners', () => {
    const element = document.createElement('div');
    const removeSpy = vi.spyOn(element, 'removeEventListener');
    // Create spy BEFORE constructor so we can also verify handlers match
    const addSpy = vi.spyOn(element, 'addEventListener');
    const controller = new TouchGestureController(element);

    controller.destroy();

    expect(removeSpy).toHaveBeenCalledWith('touchstart', addSpy.mock.calls[0][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchmove', addSpy.mock.calls[1][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchend', addSpy.mock.calls[2][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchcancel', addSpy.mock.calls[3][1]);
  });

  it('clears long press timer', () => {
    vi.useFakeTimers();
    const { controller } = createController();
    vi.spyOn(globalThis, 'clearTimeout');
    controller.longPressTimer = setTimeout(vi.fn(), 500);
    controller.destroy();
    expect(clearTimeout).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ─── Integration ────────────────────────────────────────────────────────────

describe('integration', () => {
  it('full lifecycle: create → callbacks → swipe → destroy', () => {
    const element = document.createElement('div');
    const onSwipeRight = vi.fn();
    const ctrl = new TouchGestureController(element);

    // Set callbacks
    ctrl.setCallbacks({ onSwipeRight });

    // Perform a right swipe
    ctrl.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    ctrl.handleTouchEnd(touchEvent({ target: element, x: 100, y: 0 }));

    expect(onSwipeRight).toHaveBeenCalled();

    // Cleanup — verify no errors
    expect(() => ctrl.destroy()).not.toThrow();
  });
});

// ─── useTouchGestures Hook ──────────────────────────────────────────────────

describe('useTouchGestures', () => {
  it('creates controller and adds event listeners on mount', () => {
    const element = document.createElement('div');
    const addSpy = vi.spyOn(element, 'addEventListener');
    const ref = { current: element };

    renderHook(() => useTouchGestures(ref, { onSwipeLeft: vi.fn() }));

    // Controller was created because addEventListener was called
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchend', expect.any(Function), false);
    expect(addSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function), false);
  });

  it('returns null when ref has no current element', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useTouchGestures(ref));
    expect(result.current).toBeNull();
  });

  it('propagates callbacks through the controller via setCallbacks', () => {
    const element = document.createElement('div');
    const ref = { current: element };
    const onSwipeLeft = vi.fn();

    const { rerender } = renderHook(
      ({ onSwipeLeft }) => useTouchGestures(ref, { onSwipeLeft }),
      { initialProps: { onSwipeLeft: vi.fn() } }
    );

    const newCallback = vi.fn();
    rerender({ onSwipeLeft: newCallback });

    // Manually trigger swipe on the element — the controller should use the new callback
    // We access the controller through touch event dispatch on the element
    const touchStart = new Event('touchstart', { bubbles: true });
    Object.defineProperty(touchStart, 'touches', { value: [{ clientX: 100, clientY: 0 }], writable: false });
    element.dispatchEvent(touchStart);

    const touchEnd = new Event('touchend', { bubbles: true });
    Object.defineProperty(touchEnd, 'changedTouches', { value: [{ clientX: 0, clientY: 0 }], writable: false });
    element.dispatchEvent(touchEnd);

    // The new callback should be triggered
    expect(newCallback).toHaveBeenCalled();
  });

  it('destroys controller on unmount', () => {
    const element = document.createElement('div');
    const ref = { current: element };
    const removeSpy = vi.spyOn(element, 'removeEventListener');

    const { unmount } = renderHook(() => useTouchGestures(ref));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function));
  });
});
