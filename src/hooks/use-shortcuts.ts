import { useEffect, useRef } from 'react';

type Handlers = Partial<Record<string, (event: KeyboardEvent) => void>>;

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

// Single-key shortcuts that stay out of the way while typing or inside dialogs.
export function useShortcuts(handlers: Handlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing)
        return;
      // Open dialogs and menus handle their own keys, including Escape.
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      if (event.key !== 'Escape' && isTyping(event.target)) return;
      const handler = latest.current[event.key];
      if (!handler) return;
      event.preventDefault();
      handler(event);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
