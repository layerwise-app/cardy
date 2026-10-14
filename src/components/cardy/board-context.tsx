import { createContext, useContext } from 'react';
import type { BoardData } from '~/lib/cardy.functions';
import type { Prompt, RunAction } from './cardy-utils';

// Everything the board views share; owned by CardyApp.
export type BoardContextValue = {
  data: BoardData;
  run: RunAction;
  pending: boolean;
  today: string;
  doneId: string | null;
  openCard: (cardId: string) => void;
  requestEdit: () => void;
  ask: (prompt: Prompt) => void;
};

const BoardContext = createContext<BoardContextValue | null>(null);

export const BoardProvider = BoardContext.Provider;

export function useBoard() {
  const value = useContext(BoardContext);
  if (!value) throw new Error('useBoard must be used inside BoardProvider.');
  return value;
}

export function memberName(data: BoardData, userId: string) {
  return data.members.find((member) => member.id === userId)?.name ?? 'Member';
}

// Runs an action from a menu or button; failures are already toasted by the mutation.
export function fire(promise: Promise<unknown>) {
  promise.catch(() => {});
}
