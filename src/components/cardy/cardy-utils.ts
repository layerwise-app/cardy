import { toast } from 'sonner';
import type { Action } from '~/lib/cardy.types';

export type RunAction = (
  action: Action
) => Promise<{ id?: string; workspaceId?: string; token?: string }>;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copied');
  } catch {
    toast.error('Clipboard unavailable. Select and copy the link manually.');
  }
}
