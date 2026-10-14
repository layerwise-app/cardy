import { useEffect, useRef } from 'react';

// Marks [data-reveal] descendants visible as they scroll into view.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    root.classList.add('reveal-ready');
    return () => observer.disconnect();
  }, []);
  return ref;
}
