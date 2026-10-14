import { useSyncExternalStore } from 'react';
import { localDateKey } from '~/lib/cardy.types';

// Re-check once a minute so overdue states roll over at midnight.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

// The server snapshot is empty so SSR never renders a date the client disagrees with.
export function useToday(): string {
  return useSyncExternalStore(
    subscribe,
    () => localDateKey(new Date()),
    () => ''
  );
}
