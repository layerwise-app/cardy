import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { and, asc, count, eq } from 'drizzle-orm';
import { db } from '~/db';
import { attachment, board, card } from '~/db/schema';
import { getStorageErrorCode } from '~/lib/storage';
import {
  ATTACHMENT_LINK_SECONDS,
  formatBytes,
  isPreviewableImage,
  MAX_ATTACHMENTS_PER_CARD,
  validateAttachmentDelete,
  validateAttachmentRef,
  validateAttachmentUpload,
} from './cardy.attachments';
import {
  activityInsert,
  findRole,
  getSession,
  id,
  now,
  requireUser,
  writableBoard,
} from './cardy.server';
import { assertCardReadAccess } from './cardy.types';

async function editableCard(boardId: string, cardId: string) {
  const [target] = await db
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.boardId, boardId)));
  if (!target) throw new Error('Card does not belong to this board.');
  if (target.archived) throw new Error('Restore this card before editing it.');
  return target;
}

// Members, and anyone viewing an active public board, get short-lived links.
export const loadAttachments = createServerFn({ method: 'GET' })
  .validator(validateAttachmentRef)
  .handler(async ({ data }) => {
    const [found] = await db
      .select()
      .from(board)
      .where(eq(board.id, data.boardId));
    if (!found) throw new Error('Board not found.');
    const [target] = await db
      .select({ id: card.id, archived: card.archived })
      .from(card)
      .where(and(eq(card.id, data.cardId), eq(card.boardId, found.id)));
    if (!target) throw new Error('Card not found.');
    const session = await getSession();
    const role = session
      ? await findRole(found.workspaceId, session.user.id)
      : null;
    assertCardReadAccess(found.visibility, found.archived, target.archived, role);
    const rows = await db
      .select()
      .from(attachment)
      .where(eq(attachment.cardId, target.id))
      .orderBy(asc(attachment.createdAt), asc(attachment.id));
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        name: row.name,
        size: row.size,
        contentType: row.contentType,
        createdAt: row.createdAt,
        url: await env.STORAGE.signedUrl(row.key, {
          expiresIn: ATTACHMENT_LINK_SECONDS,
        }),
        downloadUrl: await env.STORAGE.signedUrl(row.key, {
          expiresIn: ATTACHMENT_LINK_SECONDS,
          download: row.name,
        }),
        preview: isPreviewableImage(row.contentType),
      }))
    );
  });

export const uploadAttachment = createServerFn({ method: 'POST' })
  .validator(validateAttachmentUpload)
  .handler(async ({ data }) => {
    const viewer = await requireUser();
    const found = await writableBoard(data.boardId, viewer.id);
    const target = await editableCard(found.id, data.cardId);
    const [{ total }] = await db
      .select({ total: count() })
      .from(attachment)
      .where(eq(attachment.cardId, target.id));
    if (total >= MAX_ATTACHMENTS_PER_CARD)
      throw new Error(
        `A card can have up to ${MAX_ATTACHMENTS_PER_CARD} attachments.`
      );
    const { maxFileBytes, readOnly } = await env.STORAGE.usage();
    if (readOnly)
      throw new Error('Storage is full. Delete some files and try again.');
    if (data.file.size > maxFileBytes)
      throw new Error(`Files can be up to ${formatBytes(maxFileBytes)}.`);

    const attachmentId = id();
    const key = `cards/${target.id}/${attachmentId}`;
    try {
      await env.STORAGE.put(key, data.file.stream(), {
        size: data.file.size,
        contentType: data.contentType,
        customMetadata: { name: data.name },
      });
    } catch (error) {
      const code = getStorageErrorCode(error);
      if (code === 'StorageQuotaExceeded')
        throw new Error('Storage is full. Delete some files and try again.');
      if (code === 'FileTooLarge') throw new Error('This file is too large.');
      if (code === 'BlockedContent')
        throw new Error('This file can’t be uploaded.');
      throw error;
    }
    try {
      await db.batch([
        db.insert(attachment).values({
          id: attachmentId,
          cardId: target.id,
          boardId: found.id,
          userId: viewer.id,
          key,
          name: data.name,
          size: data.file.size,
          contentType: data.contentType,
          createdAt: now(),
        }),
        activityInsert(found.id, viewer.id, `attached “${data.name}”`, target.id),
      ]);
    } catch (error) {
      // Without a D1 row nothing references the file, so remove it.
      await env.STORAGE.delete(key);
      throw error;
    }
    return { id: attachmentId };
  });

export const deleteAttachment = createServerFn({ method: 'POST' })
  .validator(validateAttachmentDelete)
  .handler(async ({ data }) => {
    const viewer = await requireUser();
    const found = await writableBoard(data.boardId, viewer.id);
    const [target] = await db
      .select()
      .from(attachment)
      .where(
        and(
          eq(attachment.id, data.attachmentId),
          eq(attachment.boardId, found.id)
        )
      );
    if (!target) throw new Error('Attachment not found.');
    await editableCard(found.id, target.cardId);
    // Remove the reference first so a failed file delete never leaves a broken row.
    await db.batch([
      db.delete(attachment).where(eq(attachment.id, target.id)),
      activityInsert(
        found.id,
        viewer.id,
        `removed attachment “${target.name}”`,
        target.cardId
      ),
    ]);
    await env.STORAGE.delete(target.key);
    return {};
  });

export type CardAttachment = Awaited<
  ReturnType<typeof loadAttachments>
>[number];
