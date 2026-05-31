import { describe, expect, it, vi } from 'vitest';
import { TouchGestureController } from '../touchGestureController';

function touchEvent({ target, x = 0, y = 0, touches = 1 }) {
  const touch = { clientX: x, clientY: y };
  return {
    target,
    touches: touches === 2 ? [touch, { clientX: x + 100, clientY: y }] : [touch],
    changedTouches: [touch],
  };
}

describe('TouchGestureController', () => {
  it('removes the same listener references that it adds', () => {
    const element = document.createElement('div');
    const addSpy = vi.spyOn(element, 'addEventListener');
    const removeSpy = vi.spyOn(element, 'removeEventListener');
    const controller = new TouchGestureController(element);

    controller.destroy();

    expect(removeSpy).toHaveBeenCalledWith('touchstart', addSpy.mock.calls[0][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchmove', addSpy.mock.calls[1][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchend', addSpy.mock.calls[2][1]);
    expect(removeSpy).toHaveBeenCalledWith('touchcancel', addSpy.mock.calls[3][1]);
  });

  it('ignores gestures from controls matching the ignore selector', () => {
    const root = document.createElement('div');
    const button = document.createElement('button');
    root.appendChild(button);
    const onSwipeLeft = vi.fn();
    const controller = new TouchGestureController(root);
    controller.setCallbacks({ onSwipeLeft });

    controller.handleTouchStart(touchEvent({ target: button, x: 80, y: 0 }));
    controller.handleTouchEnd(touchEvent({ target: button, x: 0, y: 0 }));

    expect(onSwipeLeft).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('cancels long press when the finger moves', () => {
    vi.useFakeTimers();
    const element = document.createElement('div');
    const onLongPress = vi.fn();
    const controller = new TouchGestureController(element);
    controller.setCallbacks({ onLongPress });

    controller.handleTouchStart(touchEvent({ target: element, x: 0, y: 0 }));
    controller.handleTouchMove(touchEvent({ target: element, x: 30, y: 0 }));
    vi.advanceTimersByTime(600);

    expect(onLongPress).not.toHaveBeenCalled();
    controller.destroy();
    vi.useRealTimers();
  });
});
