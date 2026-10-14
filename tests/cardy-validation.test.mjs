import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertBoardReadAccess,
  assertWorkspacePermission,
  textInput,
  nextPosition,
  localDateKey,
  getWorkspaceRole,
  validateAction,
} from '../src/lib/cardy.types.ts';

const card = {
  type: 'card.update',
  boardId: 'board-1',
  cardId: 'card-1',
  title: 'A good idea',
  description: '',
  labels: ['Design'],
  assignees: ['member-1'],
  dueDate: '2026-10-16',
  priority: 'high',
  checklist: [{ id: 'item-1', title: 'First step', done: false }],
};

test('owner and member can work in their workspace, outsiders cannot', () => {
  assert.doesNotThrow(() => assertWorkspacePermission('owner'));
  assert.doesNotThrow(() => assertWorkspacePermission('member'));
  assert.throws(() => assertWorkspacePermission(null));
  assert.throws(() => assertWorkspacePermission(undefined));
});

test('workspace management requires the owner', () => {
  assert.doesNotThrow(() => assertWorkspacePermission('owner', true));
  assert.throws(() => assertWorkspacePermission('member', true));
  assert.throws(() => assertWorkspacePermission(null, true));
});

test('authentication admin roles never grant workspace access', () => {
  for (const role of ['admin', 'guest', '', true, {}]) {
    assert.equal(getWorkspaceRole(role), null);
    assert.throws(() => assertWorkspacePermission(role));
    assert.throws(() => assertBoardReadAccess('private', false, role));
  }
});

test('only active public boards can be read by outsiders', () => {
  for (const role of ['owner', 'member']) {
    for (const visibility of ['private', 'public']) {
      for (const archived of [true, false])
        assert.doesNotThrow(() =>
          assertBoardReadAccess(visibility, archived, role)
        );
    }
  }
  assert.doesNotThrow(() => assertBoardReadAccess('public', false, null));
  assert.throws(() => assertBoardReadAccess('private', false, null));
  assert.throws(() => assertBoardReadAccess('private', true, null));
  assert.throws(() => assertBoardReadAccess('public', true, null));
});

test('normalizes text and bounds payloads', () => {
  assert.equal(textInput('  hello  ', 'Name'), 'hello');
  assert.equal(textInput('', 'Description', 100, true), '');
  for (const value of ['', '  ', 42, null, undefined, 'a'.repeat(121)])
    assert.throws(() => textInput(value, 'Name'));
});

test('accepts a complete, valid card update', () => {
  assert.deepEqual(validateAction(structuredClone(card)), card);
  assert.doesNotThrow(() =>
    validateAction({
      ...card,
      dueDate: null,
      labels: [],
      assignees: [],
      checklist: [],
    })
  );
});

test('rejects invalid dates, priorities, labels, checklists and assignments', () => {
  for (const dueDate of ['tomorrow', '2026-02-31', '2026-13-01', '', 123])
    assert.throws(() => validateAction({ ...card, dueDate }));
  for (const priority of ['critical', '', null, undefined, 1])
    assert.throws(() => validateAction({ ...card, priority }));
  for (const labels of [['Unknown'], ['Design', 'Design'], null, 'Design'])
    assert.throws(() => validateAction({ ...card, labels }));
  for (const assignees of [null, [123], ['x'.repeat(201)]])
    assert.throws(() => validateAction({ ...card, assignees }));
  for (const checklist of [
    null,
    [{ id: '1', title: '', done: true }],
    [{ id: '1', title: 'Step', done: 'true' }],
    [null],
    [
      { id: '1', title: 'Step', done: true },
      { id: '1', title: 'Step', done: false },
    ],
  ])
    assert.throws(() => validateAction({ ...card, checklist }));
});

test('rejects missing required fields and unknown operations', () => {
  for (const type of [
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
  ])
    assert.throws(() => validateAction({ type }), type);
  assert.throws(() => validateAction({ type: 'workspace.delete' }));
  assert.throws(() => validateAction(null));
  const { description, ...incomplete } = card;
  assert.throws(() => validateAction(incomplete));
});

test('requires bounded integer positions for ordering', () => {
  const move = {
    type: 'card.move',
    boardId: 'board-1',
    cardId: 'card-1',
    listId: 'list-1',
    index: 0,
  };
  assert.doesNotThrow(() => validateAction(move));
  for (const index of [-1, 1.5, '1', NaN, 10001, undefined])
    assert.throws(() => validateAction({ ...move, index }));
});

test('normalizes invitation email and rejects malformed addresses', () => {
  assert.equal(
    validateAction({
      type: 'member.invite',
      workspaceId: 'space-1',
      email: ' Team@Example.com ',
    }).email,
    'team@example.com'
  );
  for (const email of ['hello', 'a@b', 'a b@example.com', '', null])
    assert.throws(() =>
      validateAction({ type: 'member.invite', workspaceId: 'space-1', email })
    );
});

test('archive and visibility fields must have exact types', () => {
  assert.doesNotThrow(() =>
    validateAction({
      type: 'board.archive',
      boardId: 'board-1',
      archived: true,
    })
  );
  assert.throws(() =>
    validateAction({
      type: 'board.archive',
      boardId: 'board-1',
      archived: 'true',
    })
  );
  assert.throws(() =>
    validateAction({
      type: 'board.update',
      boardId: 'board-1',
      name: 'Board',
      description: '',
      visibility: 'unlisted',
    })
  );
});

test('new and restored cards append after sparse persisted positions', () => {
  assert.equal(nextPosition([]), 0);
  assert.equal(
    nextPosition([{ position: 0 }, { position: 2 }, { position: 3 }]),
    4
  );
  assert.equal(nextPosition([{ position: 8 }, { position: 1 }]), 9);
});

test('date-only filters follow the local day, not UTC', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Shanghai';
    assert.equal(localDateKey(new Date('2026-10-08T17:00:00Z')), '2026-10-09');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('quick schedule and priority changes validate their single field', () => {
  const target = { boardId: 'board-1', cardId: 'card-1' };
  for (const dueDate of ['2026-10-31', null])
    assert.doesNotThrow(() =>
      validateAction({ type: 'card.schedule', ...target, dueDate })
    );
  for (const dueDate of ['2026-02-30', 'soon', undefined])
    assert.throws(() =>
      validateAction({ type: 'card.schedule', ...target, dueDate })
    );
  for (const priority of ['urgent', 'none'])
    assert.doesNotThrow(() =>
      validateAction({ type: 'card.prioritize', ...target, priority })
    );
  for (const priority of ['High', undefined, null])
    assert.throws(() =>
      validateAction({ type: 'card.prioritize', ...target, priority })
    );
  assert.throws(() =>
    validateAction({ type: 'card.prioritize', boardId: 'board-1', priority: 'low' })
  );
});
