import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_FILTERS,
  activeFilterCount,
  addDays,
  boardInsights,
  cardsByDate,
  doneListId,
  filterCards,
  formatDay,
  isOverdue,
  monthGrid,
  shiftMonth,
  sortCards,
} from '../src/lib/cardy.board.ts';

const today = '2026-10-13';
const lists = [
  { id: 'todo', boardId: 'b', name: 'To do', position: 0 },
  { id: 'done', boardId: 'b', name: 'Shipped', position: 2 },
  { id: 'doing', boardId: 'b', name: 'Doing', position: 1 },
];
const make = (id, fields = {}) => ({
  id,
  boardId: 'b',
  listId: 'todo',
  title: id,
  description: '',
  labels: [],
  assignees: [],
  dueDate: null,
  priority: 'none',
  checklist: [],
  cover: null,
  position: 0,
  archived: false,
  createdAt: 0,
  ...fields,
});
const cards = [
  make('late', { dueDate: '2026-10-10', priority: 'urgent', assignees: ['ana'], labels: ['Bug'] }),
  make('soon', { dueDate: '2026-10-19', priority: 'low', listId: 'doing', assignees: ['ana', 'li'] }),
  make('later', { dueDate: '2026-10-20', priority: 'high', position: 1 }),
  make('shipped', { dueDate: '2026-10-01', listId: 'done', checklist: [{ id: 'a', title: 'QA', done: true }] }),
  make('undated', { position: 2, checklist: [{ id: 'b', title: 'Spec', done: false }] }),
];

test('date helpers cross month and year boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(formatDay('2026-01-05'), 'Jan 5');
});

test('month grid starts on Monday and covers the whole month', () => {
  const october = monthGrid('2026-10');
  assert.equal(october[0][0], '2026-09-28');
  assert.ok(october.every((week) => week.length === 7));
  assert.ok(october.flat().includes('2026-10-31'));
  assert.equal(october.at(-1).at(-1), '2026-11-01');
  assert.equal(monthGrid('2027-02').length, 4);
});

test('the last list by position marks cards as done', () => {
  assert.equal(doneListId(lists), 'done');
  assert.equal(doneListId(lists.slice(0, 1)), null);
  assert.equal(isOverdue(cards[0], today, 'done'), true);
  assert.equal(isOverdue(cards[3], today, 'done'), false);
  assert.equal(isOverdue(cards[0], '', 'done'), false);
});

test('filters combine search, label, assignee, priority and due date', () => {
  const ids = (filters) =>
    filterCards(cards, { ...EMPTY_FILTERS, ...filters }, today, 'done').map((c) => c.id);
  assert.deepEqual(ids({ search: 'SPEC' }), ['undated']);
  assert.deepEqual(ids({ label: 'Bug' }), ['late']);
  assert.deepEqual(ids({ assignee: 'li' }), ['soon']);
  assert.deepEqual(ids({ assignee: 'none', due: 'dated' }), ['later', 'shipped']);
  assert.deepEqual(ids({ priority: 'high' }), ['later']);
  assert.deepEqual(ids({ due: 'overdue' }), ['late']);
  assert.deepEqual(ids({ due: 'week' }), ['soon']);
  assert.deepEqual(ids({ due: 'none' }), ['undated']);
  assert.equal(activeFilterCount({ ...EMPTY_FILTERS, search: 'x', due: 'none' }), 1);
});

test('sorting keeps undated cards last and falls back to board order', () => {
  const ids = (key, direction) => sortCards(cards, lists, key, direction).map((c) => c.id);
  assert.deepEqual(ids('due', 'asc'), ['shipped', 'late', 'soon', 'later', 'undated']);
  assert.deepEqual(ids('due', 'desc'), ['later', 'soon', 'late', 'shipped', 'undated']);
  assert.deepEqual(ids('priority', 'asc'), ['late', 'later', 'soon', 'undated', 'shipped']);
  assert.deepEqual(ids('list', 'asc'), ['late', 'later', 'undated', 'soon', 'shipped']);
});

test('cards group by due date with the most pressing first', () => {
  const grouped = cardsByDate([
    make('a', { dueDate: today, priority: 'low' }),
    make('b', { dueDate: today, priority: 'urgent' }),
    make('c'),
  ]);
  assert.deepEqual(grouped.get(today).map((c) => c.id), ['b', 'a']);
  assert.equal(grouped.size, 1);
});

test('insights summarize progress, deadlines and workload', () => {
  const insights = boardInsights(cards, lists, today);
  assert.equal(insights.open, 4);
  assert.equal(insights.done, 1);
  assert.equal(insights.doneList.name, 'Shipped');
  assert.deepEqual(insights.overdue.map((c) => c.id), ['late']);
  assert.deepEqual(insights.dueSoon.map((c) => c.id), ['soon']);
  assert.deepEqual(insights.lists.map((l) => [l.name, l.count]), [
    ['To do', 3],
    ['Doing', 1],
    ['Shipped', 1],
  ]);
  assert.deepEqual(insights.checklist, { done: 1, total: 2 });
  assert.equal(insights.priorities.urgent, 1);
  assert.equal(insights.priorities.none, 1);
  assert.deepEqual(insights.workload, [
    { assignee: 'ana', open: 2, overdue: 1 },
    { assignee: null, open: 2, overdue: 0 },
    { assignee: 'li', open: 1, overdue: 0 },
  ]);
});
