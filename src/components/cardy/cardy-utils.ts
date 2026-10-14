import { toast } from 'sonner';
import type { Action } from '~/lib/cardy.types';

export type RunAction = (
  action: Action
) => Promise<{ id?: string; workspaceId?: string; token?: string }>;

export type Prompt = {
  title: string;
  description?: string;
  label: string;
  value?: string;
  submitLabel?: string;
  action: (value: string) => Promise<unknown>;
};

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copied');
  } catch {
    toast.error('Clipboard unavailable. Select and copy the link manually.');
  }
}

// Server functions have no built-in timeout; a stalled request should surface as an error.
export async function readRequest<T>(
  signal: AbortSignal,
  request: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    return await request(controller.signal);
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted)
      throw new Error('Connection timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
