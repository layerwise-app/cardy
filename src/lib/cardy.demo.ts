import type { BoardData } from './cardy.functions';

const boardId = 'cardy-welcome';
const entries = [
  {
    title: 'Explore the next chapter of Cardy',
    labels: ['Research'],
    list: 0,
    description:
      'Gather ideas, collect inspiration, and make room for the next big thing.',
    cover: 'explore',
  },
  {
    title: 'Map out the onboarding journey',
    labels: ['Product', 'Design'],
    list: 0,
    description:
      'Make every first impression feel effortless. Sketch the flow from sign-up to the first completed task.',
  },
  {
    title: 'A little love for our empty states',
    labels: ['Design'],
    list: 0,
    description:
      'Helpful, human empty states that point people toward their next step.',
    checklist: [
      { id: 'a', title: 'Board empty state', done: true },
      { id: 'b', title: 'Search empty state', done: false },
      { id: 'c', title: 'Workspace empty state', done: false },
    ],
  },
  {
    title: 'Design the new board experience',
    labels: ['Design', 'High priority'],
    list: 1,
    description: 'Less friction. More focus. A calm home for every project.',
    cover: 'board',
    checklist: [
      { id: 'a', title: 'Wireframes', done: true },
      { id: 'b', title: 'Visual exploration', done: true },
      { id: 'c', title: 'Prototype', done: false },
      { id: 'd', title: 'Review', done: false },
    ],
    dueDate: '2026-10-16',
  },
  {
    title: 'Build a better card detail view',
    labels: ['Engineering'],
    list: 1,
    description:
      'Give every task the context it deserves: descriptions, dates, checklists, and conversations.',
    dueDate: '2026-10-19',
  },
  {
    title: 'Write words that feel like us',
    labels: ['Marketing'],
    list: 1,
    description: 'Keep it clear, thoughtful, and a little playful.',
  },
  {
    title: 'Polish the workspace navigation',
    labels: ['Design'],
    list: 2,
    description:
      'Review navigation hierarchy and workspace switching with the team.',
    cover: 'palette',
    dueDate: '2026-10-14',
  },
  {
    title: 'Make it work on the small screen',
    labels: ['Engineering', 'Product'],
    list: 2,
    description: 'A great experience should fit in your pocket.',
    checklist: [
      { id: 'a', title: 'Mobile navigation', done: true },
      { id: 'b', title: 'Touch controls', done: true },
      { id: 'c', title: 'Responsive dialogs', done: true },
    ],
  },
  {
    title: 'Find our visual direction',
    labels: ['Design'],
    list: 3,
    description: 'Warm colors, thoughtful details, and space to breathe.',
    cover: 'direction',
  },
  {
    title: 'Set up the project foundations',
    labels: ['Engineering'],
    list: 3,
    description:
      'React, TypeScript, and a solid foundation for a more organized day.',
  },
  {
    title: 'Say hello to Cardy',
    labels: ['Marketing'],
    list: 3,
    description: 'A little less chaos. A lot more clarity.',
  },
];

export const demoBoard: BoardData = {
  board: {
    id: boardId,
    workspaceId: boardId,
    name: 'Brand & website',
    description: 'A fresh chapter for Cardy. Let’s make something people love.',
    visibility: 'public',
    archived: false,
    color: 'coral',
    createdAt: 1791504000000,
  },
  workspaceName: 'Studio workspace',
  lists: ['Ideas', 'In progress', 'In review', 'Done'].map(
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
