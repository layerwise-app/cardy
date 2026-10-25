// Card attachment rules shared by the browser and server. No value imports, so
// `node --test` can load this module without the bundler's path aliases.

// Uploads go through the app Worker, which accepts about 90 MB per request.
// The plan's own per-file limit is checked on the server as well.
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_CARD = 50;
// Signed links are short-lived; the card detail refetches them before expiry.
export const ATTACHMENT_LINK_SECONDS = 15 * 60;

const PREVIEW_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
];

export function isPreviewableImage(contentType: string): boolean {
  return PREVIEW_TYPES.includes(contentType);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function idField(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200)
    throw new Error(`${field} is required.`);
  return value.trim();
}

export function validateAttachmentRef(value: {
  boardId: string;
  cardId: string;
}) {
  return {
    boardId: idField(value?.boardId, 'Board ID'),
    cardId: idField(value?.cardId, 'Card ID'),
  };
}

export function validateAttachmentDelete(value: {
  boardId: string;
  attachmentId: string;
}) {
  return {
    boardId: idField(value?.boardId, 'Board ID'),
    attachmentId: idField(value?.attachmentId, 'Attachment ID'),
  };
}

// Browser: form.set('boardId', ...); form.set('cardId', ...); form.set('file', file).
export function validateAttachmentUpload(form: FormData) {
  if (!(form instanceof FormData)) throw new Error('Invalid upload.');
  const file = form.get('file');
  if (!(file instanceof File)) throw new Error('Choose a file to attach.');
  if (file.size === 0) throw new Error('This file is empty.');
  if (file.size > MAX_ATTACHMENT_BYTES)
    throw new Error(
      `Files can be up to ${formatBytes(MAX_ATTACHMENT_BYTES)}.`
    );
  // Control characters would break headers and download names.
  const name =
    file.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) ||
    'file';
  return {
    ...validateAttachmentRef({
      boardId: form.get('boardId') as string,
      cardId: form.get('cardId') as string,
    }),
    file,
    name,
    contentType: /^[\w.+-]{1,100}\/[\w.+-]{1,100}$/.test(file.type)
      ? file.type.toLowerCase()
      : 'application/octet-stream',
  };
}
