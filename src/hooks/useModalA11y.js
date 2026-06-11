import { useEffect, useRef } from 'react';

/**
 * useModalA11y — accessibility plumbing shared by every modal/dialog overlay.
 *
 * On mount it moves keyboard focus into the dialog (first focusable element,
 * or the container itself), traps Tab / Shift+Tab inside the container so focus
 * cannot escape to the content behind the overlay, and on unmount restores
 * focus to whatever was focused before the dialog opened.
 *
 * Escape handling is opt-in via `onEscape` — pass it only for dialogs that
 * don't already wire their own Escape key (e.g. SettingsPanel, AchievementsPanel).
 * PauseMenu keeps its existing window-level Escape handler, so it omits onEscape.
 *
 * Usage:
 *   const ref = useModalA11y({ onEscape: onClose });
 *   return <div className="j-overlay" role="dialog" ref={ref}>…</div>;
 *
 * @param {{ onEscape?: () => void }} [opts]
 * @returns {import('react').RefObject<HTMLElement>} ref to attach to the dialog container
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useModalA11y(opts = {}) {
  const { onEscape } = opts;
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));

    // Move focus into the dialog.
    const focusables = getFocusable();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && typeof onEscape === 'function') {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus only if the prior element is still alive and focusable.
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
    // onEscape is the only external input; modals pass a stable callback.
  }, [onEscape]);

  return containerRef;
}

export default useModalA11y;
