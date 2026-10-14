import type { BoardData } from './cardy.functions';
import type { Card } from './cardy.types';

const boardId = 'cardy-welcome';
const checklist = (items: Array<[string, boolean]>) =>
  items.map(([title, done], index) => ({ id: `c${index}`, title, done }));

const entries: Array<
  Pick<Card, 'title' | 'description' | 'labels' | 'priority'> & {
    list: number;
    dueDate?: string;
    checklist?: Card['checklist'];
  }
> = [
  {
    title: 'Interview five trial users',
    labels: ['Research'],
    list: 0,
    priority: 'medium',
    description: 'Focus on the first week: what they set up and where they stopped.',
    dueDate: '2026-10-23',
    checklist: checklist([
      ['Write the script', true],
      ['Book sessions', true],
      ['Run interviews', false],
      ['Share findings', false],
    ]),
  },
  {
    title: 'Audit pricing page copy',
    labels: ['Marketing'],
    list: 0,
    priority: 'low',
    description: 'Cut plan descriptions to one line each and align feature names.',
    dueDate: '2026-10-28',
  },
  {
    title: 'Add dark mode color tokens',
    labels: ['Design'],
    list: 0,
    priority: 'none',
    description: '',
  },
  {
    title: 'Fix drag preview offset in Safari',
    labels: ['Bug', 'Engineering'],
    list: 1,
    priority: 'urgent',
    description: 'The ghost card jumps 40px left when the board is scrolled.',
    dueDate: '2026-10-12',
  },
  {
    title: 'Redesign the board header',
    labels: ['Design', 'Product'],
    list: 1,
    priority: 'high',
    description: 'Fold view tabs, filters and sharing into one compact row.',
    dueDate: '2026-10-16',
    checklist: checklist([
      ['Wireframes', true],
      ['Visual pass', true],
      ['Prototype', false],
      ['Review', false],
    ]),
  },
  {
    title: 'Ship the calendar view',
    labels: ['Engineering'],
    list: 1,
    priority: 'high',
    description: 'Month grid of cards by due date with drag to reschedule.',
    dueDate: '2026-10-20',
    checklist: checklist([
      ['Month grid', true],
      ['Drag to reschedule', false],
      ['Mobile agenda', false],
    ]),
  },
  {
    title: 'Onboarding email sequence',
    labels: ['Marketing'],
    list: 2,
    priority: 'medium',
    description: 'Three emails over the first week. Needs legal sign-off.',
    dueDate: '2026-10-08',
  },
  {
    title: 'Mobile navigation pass',
    labels: ['Engineering', 'Design'],
    list: 2,
    priority: 'medium',
    description: 'Sidebar becomes a sheet below 768px.',
    dueDate: '2026-10-14',
    checklist: checklist([
      ['Sheet navigation', true],
      ['Touch targets', true],
      ['Dialogs', true],
    ]),
  },
  {
    title: 'Choose the new type scale',
    labels: ['Design'],
    list: 3,
    priority: 'low',
    description: 'Geist at 12, 13, 14, 16, 20 and 28.',
    dueDate: '2026-10-06',
  },
  {
    title: 'Set up error tracking',
    labels: ['Engineering'],
    list: 3,
    priority: 'medium',
    description: '',
    dueDate: '2026-10-02',
  },
  {
    title: 'Draft the launch post',
    labels: ['Marketing'],
    list: 3,
    priority: 'none',
    description: '',
  },
];

export const demoBoard: BoardData = {
  board: {
    id: boardId,
    workspaceId: boardId,
    name: 'Website relaunch',
    description: 'Plan and ship the new marketing site.',
    visibility: 'public',
    archived: false,
    color: 'coral',
    createdAt: 1791504000000,
  },
  workspaceName: 'Sample workspace',
  lists: ['Backlog', 'In progress', 'In review', 'Done'].map(
    (name, position) => ({
      id: `${boardId}-list-${position}`,
      boardId,
      name,
      position,
    })
  ),
  cards: entries.map(({ list, ...entry }, position) => ({
    id: `${boardId}-card-${position}`,
    boardId,
    listId: `${boardId}-list-${list}`,
    position,
    assignees: [],
    dueDate: null,
    checklist: [],
    cover: null,
    archived: false,
    createdAt: 1791504000000,
    ...entry,
  })),
  members: [],
  comments: [],
  history: [],
  invites: [],
  canEdit: false,
  role: null,
};
