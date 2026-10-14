import type { board, boardList, card } from '~/db/schema';

export type Board = typeof board.$inferSelect;
export type BoardList = typeof boardList.$inferSelect;
export type Card = typeof card.$inferSelect;
export const LABELS = [
  { name: 'Design', color: 'purple' },
  { name: 'Product', color: 'blue' },
  { name: 'Engineering', color: 'teal' },
  { name: 'Research', color: 'amber' },
  { name: 'Marketing', color: 'pink' },
  { name: 'Bug', color: 'red' },
] as const;
export type LabelColor = (typeof LABELS)[number]['color'];

// Ordered from most to least pressing; list sorting relies on this order.
export const PRIORITIES = ['urgent', 'high', 'medium', 'low', 'none'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
};

export type Action =
  | { type: 'workspace.create'; name: string }
  | { type: 'workspace.rename'; workspaceId: string; name: string }
  | { type: 'member.invite'; workspaceId: string; email: string }
  | { type: 'member.remove'; workspaceId: string; userId: string }
  | { type: 'invite.accept'; token: string }
  | { type: 'invite.revoke'; workspaceId: string; id: string }
  | { type: 'board.create'; workspaceId: string; name: string }
  | {
      type: 'board.update';
      boardId: string;
      name: string;
      description: string;
      visibility: 'public' | 'private';
    }
  | { type: 'board.archive'; boardId: string; archived: boolean }
  | { type: 'board.duplicate'; boardId: string }
  | { type: 'list.create'; boardId: string; name: string }
  | { type: 'list.rename'; boardId: string; listId: string; name: string }
  | { type: 'list.move'; boardId: string; listId: string; index: number }
  | { type: 'card.create'; boardId: string; listId: string; title: string }
  | {
      type: 'card.update';
      boardId: string;
      cardId: string;
      title: string;
      description: string;
      labels: string[];
      assignees: string[];
      dueDate: string | null;
      priority: Priority;
      checklist: Card['checklist'];
    }
  | {
      type: 'card.schedule';
      boardId: string;
      cardId: string;
      dueDate: string | null;
    }
  | {
      type: 'card.prioritize';
      boardId: string;
      cardId: string;
      priority: Priority;
    }
  | {
      type: 'card.move';
      boardId: string;
      cardId: string;
      listId: string;
      index: number;
    }
  | { type: 'card.archive'; boardId: string; cardId: string; archived: boolean }
  | { type: 'comment.create'; boardId: string; cardId: string; body: string };

export function textInput(
  value: unknown,
  field: string,
  max = 120,
  allowEmpty = false
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (!allowEmpty && !value.trim())
  )
    throw new Error(
      `${field} is required and must be under ${max} characters.`
    );
  return value.trim();
}

export function nextPosition(items: { position: number }[]): number {
  return (
    items.reduce((maximum, item) => Math.max(maximum, item.position), -1) + 1
  );
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Date-only values are stored as YYYY-MM-DD and must be real calendar days.
export function isDueDate(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value)
  );
}

export function getWorkspaceRole(value: unknown): 'owner' | 'member' | null {
  return value === 'owner' || value === 'member' ? value : null;
}

export function assertWorkspacePermission(
  role: 'owner' | 'member' | null | undefined,
  ownerOnly = false
): void {
  if (
    (role !== 'owner' && role !== 'member') ||
    (ownerOnly && role !== 'owner')
  )
    throw new Error(
      ownerOnly
        ? 'Only workspace owners can do this.'
        : 'You do not have access to this workspace.'
    );
}

export function assertBoardReadAccess(
  visibility: 'private' | 'public',
  archived: boolean,
  role: 'owner' | 'member' | null | undefined
): void {
  if (
    role !== 'owner' &&
    role !== 'member' &&
    (visibility !== 'public' || archived)
  )
    throw new Error(
      'This board is private. Sign in with a workspace account to view it.'
    );
}

export function validateAction(value: Action): Action {
  if (!value || typeof value !== 'object') throw new Error('Invalid request.');
  const types = [
    'workspace.create',
    'workspace.rename',
    'member.invite',
    'member.remove',
    'invite.accept',
    'invite.revoke',
    'board.create',
    'board.update',
    'board.archive',
    'board.duplicate',
    'list.create',
    'list.rename',
    'list.move',
    'card.create',
    'card.update',
    'card.schedule',
    'card.prioritize',
    'card.move',
    'card.archive',
    'comment.create',
  ];
  if (!types.includes(value.type)) throw new Error('Unknown operation.');
  const data = value as unknown as Record<string, unknown>;
  for (const key of [
    'workspaceId',
    'boardId',
    'listId',
    'cardId',
    'userId',
    'id',
    'token',
  ])
    if (key in data) textInput(data[key], key, 200);
  if ('name' in data) data.name = textInput(data.name, 'Name');
  if ('title' in data) data.title = textInput(data.title, 'Title', 300);
  if ('description' in data)
    data.description = textInput(data.description, 'Description', 20000, true);
  if ('body' in data) data.body = textInput(data.body, 'Comment', 5000);
  if (
    'index' in data &&
    (!Number.isInteger(data.index) ||
      Number(data.index) < 0 ||
      Number(data.index) > 10000)
  )
    throw new Error('Invalid position.');
  if ('archived' in data && typeof data.archived !== 'boolean')
    throw new Error('Invalid archive state.');
  if (
    'visibility' in data &&
    data.visibility !== 'public' &&
    data.visibility !== 'private'
  )
    throw new Error('Invalid visibility.');
  if ('email' in data) {
    data.email = textInput(data.email, 'Email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email)))
      throw new Error('Enter a valid email address.');
  }
  if (
    (value.type === 'card.update' || value.type === 'card.schedule') &&
    !isDueDate(value.dueDate)
  )
    throw new Error('Invalid due date.');
  if (
    (value.type === 'card.update' || value.type === 'card.prioritize') &&
    !PRIORITIES.includes(value.priority)
  )
    throw new Error('Invalid priority.');
  if (value.type === 'card.update') {
    if (
      !Array.isArray(value.labels) ||
      value.labels.length > 6 ||
      value.labels.some((l) => !LABELS.some((x) => x.name === l))
    )
      throw new Error('Invalid labels.');
    if (new Set(value.labels).size !== value.labels.length)
      throw new Error('Duplicate labels.');
    if (
      !Array.isArray(value.assignees) ||
      value.assignees.length > 100 ||
      value.assignees.some((id) => typeof id !== 'string' || id.length > 200)
    )
      throw new Error('Invalid assignees.');
    if (!Array.isArray(value.checklist) || value.checklist.length > 100)
      throw new Error('Invalid checklist.');
    value.checklist = value.checklist.map((item) => {
      if (!item || typeof item.done !== 'boolean')
        throw new Error('Invalid checklist state.');
      return {
        id: textInput(item.id, 'Checklist ID', 200),
        title: textInput(item.title, 'Checklist item', 300),
        done: item.done,
      };
    });
    if (
      new Set(value.checklist.map((x) => x.id)).size !== value.checklist.length
    )
      throw new Error('Duplicate checklist IDs.');
  }
  // Required properties are checked even if an untyped caller omitted them.
  if (
    (value.type.startsWith('board.') && value.type !== 'board.create') ||
    value.type.startsWith('list.') ||
    value.type.startsWith('card.') ||
    value.type === 'comment.create'
  )
    textInput(data.boardId, 'Board ID', 200);
  if (
    [
      'card.update',
      'card.schedule',
      'card.prioritize',
      'card.move',
      'card.archive',
      'comment.create',
    ].includes(value.type)
  )
    textInput(data.cardId, 'Card ID', 200);
  if (
    ['list.rename', 'list.move', 'card.create', 'card.move'].includes(
      value.type
    )
  )
    textInput(data.listId, 'List ID', 200);
  if (
    [
      'workspace.rename',
      'member.invite',
      'member.remove',
      'invite.revoke',
      'board.create',
    ].includes(value.type)
  )
    textInput(data.workspaceId, 'Workspace ID', 200);
  if (
    [
      'workspace.create',
      'workspace.rename',
      'board.create',
      'board.update',
      'list.create',
      'list.rename',
    ].includes(value.type)
  )
    textInput(data.name, 'Name');
  if (['card.create', 'card.update'].includes(value.type))
    textInput(data.title, 'Title', 300);
  if (value.type === 'comment.create') textInput(data.body, 'Comment', 5000);
  if (value.type === 'invite.accept') textInput(data.token, 'Invitation', 200);
  if (value.type === 'member.invite') textInput(data.email, 'Email', 254);
  if (value.type === 'member.remove') textInput(data.userId, 'Member', 200);
  if (value.type === 'invite.revoke') textInput(data.id, 'Invitation', 200);
  if (
    ['card.move', 'list.move'].includes(value.type) &&
    !Number.isInteger(data.index)
  )
    throw new Error('Position is required.');
  if (
    ['card.archive', 'board.archive'].includes(value.type) &&
    typeof data.archived !== 'boolean'
  )
    throw new Error('Archive state is required.');
  if (
    value.type === 'board.update' &&
    !['private', 'public'].includes(String(data.visibility))
  )
    throw new Error('Visibility is required.');
  if (value.type === 'card.update' || value.type === 'board.update')
    textInput(data.description, 'Description', 20000, true);
  return value;
}
