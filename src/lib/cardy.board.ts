// Pure board computations shared by the views. Type-only imports keep this
// module loadable by `node --test` without the bundler's path aliases.
import type { BoardList, Card, Priority } from './cardy.types';

export type DueFilter = 'all' | 'overdue' | 'week' | 'dated' | 'none';
export type CardFilters = {
  search: string;
  label: string;
  assignee: string;
  priority: Priority | 'all';
  due: DueFilter;
};
export const EMPTY_FILTERS: CardFilters = {
  search: '',
  label: 'all',
  assignee: 'all',
  priority: 'all',
  due: 'all',
};
export type SortKey = 'title' | 'list' | 'priority' | 'due' | 'assignees';
export type SortDirection = 'asc' | 'desc';

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

// Date keys are YYYY-MM-DD; UTC arithmetic avoids daylight-saving drift.
export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

// The last list counts as "done" once a board has a real workflow.
export function doneListId(lists: BoardList[]): string | null {
  if (lists.length < 2) return null;
  return lists.reduce((last, list) =>
    list.position > last.position ? list : last
  ).id;
}

export function isOverdue(
  card: Card,
  today: string,
  doneId: string | null
): boolean {
  return Boolean(
    today && card.dueDate && card.dueDate < today && card.listId !== doneId
  );
}

function isDueThisWeek(card: Card, today: string, doneId: string | null) {
  return Boolean(
    today &&
      card.dueDate &&
      card.listId !== doneId &&
      card.dueDate >= today &&
      card.dueDate <= addDays(today, 6)
  );
}

export function activeFilterCount(filters: CardFilters): number {
  return [
    filters.label,
    filters.assignee,
    filters.priority,
    filters.due,
  ].filter((value) => value !== 'all').length;
}

export function filterCards(
  cards: Card[],
  filters: CardFilters,
  today: string,
  doneId: string | null
): Card[] {
  const query = filters.search.trim().toLowerCase();
  return cards.filter((card) => {
    if (
      query &&
      !`${card.title} ${card.description} ${card.labels.join(' ')} ${card.checklist.map((item) => item.title).join(' ')}`
        .toLowerCase()
        .includes(query)
    )
      return false;
    if (filters.label !== 'all' && !card.labels.includes(filters.label))
      return false;
    if (filters.assignee === 'none' && card.assignees.length) return false;
    if (
      filters.assignee !== 'all' &&
      filters.assignee !== 'none' &&
      !card.assignees.includes(filters.assignee)
    )
      return false;
    if (filters.priority !== 'all' && card.priority !== filters.priority)
      return false;
    switch (filters.due) {
      case 'overdue':
        return isOverdue(card, today, doneId);
      case 'week':
        return isDueThisWeek(card, today, doneId);
      case 'dated':
        return Boolean(card.dueDate);
      case 'none':
        return !card.dueDate;
      default:
        return true;
    }
  });
}

export function sortCards(
  cards: Card[],
  lists: BoardList[],
  key: SortKey,
  direction: SortDirection
): Card[] {
  const listPosition = new Map(lists.map((list) => [list.id, list.position]));
  const sign = direction === 'asc' ? 1 : -1;
  const byBoardOrder = (a: Card, b: Card) =>
    (listPosition.get(a.listId) ?? 0) - (listPosition.get(b.listId) ?? 0) ||
    a.position - b.position;
  return [...cards].sort((a, b) => {
    // Cards without a due date stay at the bottom in both directions.
    if (key === 'due' && Boolean(a.dueDate) !== Boolean(b.dueDate))
      return a.dueDate ? -1 : 1;
    const compared =
      key === 'title'
        ? a.title.localeCompare(b.title)
        : key === 'list'
          ? byBoardOrder(a, b)
          : key === 'priority'
            ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
            : key === 'due'
              ? (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
              : a.assignees.length - b.assignees.length;
    return compared * sign || byBoardOrder(a, b);
  });
}

// Monday-first weeks covering every day of a YYYY-MM month.
export function monthGrid(month: string): string[][] {
  const [year, monthIndex] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const start = addDays(`${month}-01`, -leading);
  const weeks = Math.ceil((leading + lastDay) / 7);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day))
  );
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex - 1 + delta, 1))
    .toISOString()
    .slice(0, 7);
}

export function cardsByDate(cards: Card[]): Map<string, Card[]> {
  const grouped = new Map<string, Card[]>();
  for (const card of cards) {
    if (!card.dueDate) continue;
    grouped.set(card.dueDate, [...(grouped.get(card.dueDate) ?? []), card]);
  }
  for (const day of grouped.values())
    day.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return grouped;
}

export type BoardInsights = ReturnType<typeof boardInsights>;

export function boardInsights(
  cards: Card[],
  lists: BoardList[],
  today: string
) {
  const doneId = doneListId(lists);
  const open = cards.filter((card) => card.listId !== doneId);
  const overdue = open.filter((card) => isOverdue(card, today, doneId));
  const dueSoon = open
    .filter((card) => isDueThisWeek(card, today, doneId))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const priorities = Object.fromEntries(
    Object.keys(PRIORITY_RANK).map((priority) => [
      priority,
      open.filter((card) => card.priority === priority).length,
    ])
  ) as Record<Priority, number>;
  const workload = new Map<string | null, { open: number; overdue: number }>();
  for (const card of open) {
    for (const person of card.assignees.length ? card.assignees : [null]) {
      const entry = workload.get(person) ?? { open: 0, overdue: 0 };
      entry.open += 1;
      if (isOverdue(card, today, doneId)) entry.overdue += 1;
      workload.set(person, entry);
    }
  }
  const checklist = cards.flatMap((card) => card.checklist);
  return {
    total: cards.length,
    open: open.length,
    done: cards.length - open.length,
    doneList: lists.find((list) => list.id === doneId) ?? null,
    overdue,
    dueSoon,
    lists: [...lists]
      .sort((a, b) => a.position - b.position)
      .map((list) => ({
        id: list.id,
        name: list.name,
        count: cards.filter((card) => card.listId === list.id).length,
      })),
    checklist: {
      done: checklist.filter((item) => item.done).length,
      total: checklist.length,
    },
    priorities,
    workload: [...workload.entries()]
      .map(([assignee, counts]) => ({ assignee, ...counts }))
      .sort((a, b) => b.open - a.open),
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats a date key without the runtime time zone, so SSR and client agree.
export function formatDay(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}
