import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isPreviewableImage,
  validateAttachmentDelete,
  validateAttachmentUpload,
} from '../src/lib/cardy.attachments.ts';
import {
  assignmentEmail,
  cardLink,
  newAssignees,
} from '../src/lib/cardy.email.ts';
import { assertCardReadAccess } from '../src/lib/cardy.types.ts';

const form = (file, fields = { boardId: 'board-1', cardId: 'card-1' }) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  if (file) data.set('file', file);
  return data;
};

test('outsiders read attachments only on active cards of active public boards', () => {
  for (const role of ['owner', 'member'])
    for (const visibility of ['private', 'public'])
      for (const boardArchived of [true, false])
        for (const cardArchived of [true, false])
          assert.doesNotThrow(() =>
            assertCardReadAccess(visibility, boardArchived, cardArchived, role)
          );
  assert.doesNotThrow(() => assertCardReadAccess('public', false, false, null));
  assert.throws(() => assertCardReadAccess('public', false, true, null));
  assert.throws(() => assertCardReadAccess('public', true, false, null));
  assert.throws(() => assertCardReadAccess('private', false, false, null));
  assert.throws(() => assertCardReadAccess('private', false, false, 'admin'));
});

test('validates uploads before they reach Storage', () => {
  const upload = validateAttachmentUpload(
    form(new File(['hello'], ' notes\n.txt ', { type: 'text/plain' }))
  );
  assert.equal(upload.boardId, 'board-1');
  assert.equal(upload.cardId, 'card-1');
  assert.equal(upload.name, 'notes.txt');
  assert.equal(upload.contentType, 'text/plain');
  assert.equal(
    validateAttachmentUpload(form(new File(['x'], 'a', { type: 'bad type' })))
      .contentType,
    'application/octet-stream'
  );
  assert.throws(() => validateAttachmentUpload(form(null)));
  assert.throws(() => validateAttachmentUpload(form(new File([], 'empty.txt'))));
  assert.throws(() =>
    validateAttachmentUpload(
      form(new File([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)], 'big.bin'))
    )
  );
  assert.throws(() =>
    validateAttachmentUpload(form(new File(['x'], 'a.txt'), { boardId: 'b' }))
  );
  assert.throws(() => validateAttachmentUpload({ file: 'x' }));
  assert.throws(() => validateAttachmentDelete({ boardId: 'b' }));
});

test('formats sizes and previews only raster images', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(50 * 1024 * 1024), '50 MB');
  assert.equal(isPreviewableImage('image/png'), true);
  assert.equal(isPreviewableImage('image/svg+xml'), false);
  assert.equal(isPreviewableImage('application/pdf'), false);
});

test('emails only people newly assigned by someone else', () => {
  assert.deepEqual(newAssignees(['a'], ['a', 'b', 'c', 'c'], 'c'), ['b']);
  assert.deepEqual(newAssignees(['a', 'b'], ['a'], 'c'), []);
  assert.deepEqual(newAssignees([], ['me'], 'me'), []);
});

test('assignment email escapes card text and links back to the card', () => {
  const link = cardLink('https://cardy.layerwise.site', 'board 1', 'card&1');
  assert.equal(
    link,
    'https://cardy.layerwise.site/app?board=board+1&card=card%261'
  );
  const email = assignmentEmail({
    actorName: 'Ada',
    cardTitle: 'Fix <script>\nlogin',
    boardName: 'Launch',
    link,
  });
  assert.equal(email.subject, 'Ada assigned you to “Fix <script> login”');
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('card%261'));
  assert.ok(email.text.includes(link));
});
