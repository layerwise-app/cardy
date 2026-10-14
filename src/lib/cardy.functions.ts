import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '~/db';
import {
  activity,
  board,
  boardList,
  card,
  comment,
  invitation,
  membership,
  user,
  workspace,
} from '~/db/schema';
import { auth } from '~/lib/auth';
import {
  assertBoardReadAccess,
  assertWorkspacePermission,
  getWorkspaceRole,
  nextPosition,
  PRIORITY_LABELS,
  textInput,
  validateAction,
} from './cardy.types';
import { demoBoard } from './cardy.demo';

const DEMO = 'cardy-welcome';
const now = () => Date.now();
const id = () => crypto.randomUUID();
const getSession = () => auth.api.getSession({ headers: getRequestHeaders() });

async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error('Sign in to make changes.');
  return session.user;
}

async function requireMember(
  workspaceId: string,
  userId: string,
  owner = false
) {
  const [member] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.workspaceId, workspaceId),
        eq(membership.userId, userId)
      )
    );
  assertWorkspacePermission(member?.role, owner);
  return member;
}

async function writableBoard(
  boardId: string,
  userId: string,
  allowArchived = false
) {
  const [found] = await db.select().from(board).where(eq(board.id, boardId));
  if (!found) throw new Error('Board not found.');
  await requireMember(found.workspaceId, userId);
  if (found.archived && !allowArchived)
    throw new Error('Restore this board before editing it.');
  return found;
}

async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function activityInsert(
  boardId: string,
  userId: string | null,
  message: string,
  cardId: string | null = null
) {
  return db
    .insert(activity)
    .values({ id: id(), boardId, cardId, userId, message, createdAt: now() });
}

async function seedDemo() {
  const [exists] = await db
    .select({ id: board.id })
    .from(board)
    .where(eq(board.id, DEMO));
  if (exists) return;
  // Fixed IDs and conflict guards make concurrent first requests safe.
  await db.batch([
    db
      .insert(workspace)
      .values({ id: DEMO, name: demoBoard.workspaceName, createdAt: now() })
      .onConflictDoNothing(),
    db
      .insert(board)
      .values({
        id: DEMO,
        workspaceId: DEMO,
        name: demoBoard.board.name,
        description: demoBoard.board.description,
        visibility: 'public',
        createdAt: now(),
      })
      .onConflictDoNothing(),
    ...demoBoard.lists.map((list) =>
      db.insert(boardList).values(list).onConflictDoNothing()
    ),
    ...demoBoard.cards.map((sample) =>
      db.insert(card).values(sample).onConflictDoNothing()
    ),
    db
      .insert(activity)
      .values({
        id: `${DEMO}-activity`,
        boardId: DEMO,
        message: 'opened the sample board',
        createdAt: now(),
      })
      .onConflictDoNothing(),
  ]);
}

export const loadApplication = createServerFn({ method: 'POST' }).handler(
  async () => {
    await seedDemo();
    const session = await getSession();
    if (!session)
      return {
        viewer: null,
        workspaces: [],
        boards: [],
        pendingInvites: [],
        demoBoardId: DEMO,
      };
    const workspaces = await db
      .select({ id: workspace.id, name: workspace.name, role: membership.role })
      .from(membership)
      .innerJoin(workspace, eq(workspace.id, membership.workspaceId))
      .where(and(eq(membership.userId, session.user.id), or(eq(membership.role, 'owner'), eq(membership.role, 'member'))));
    const boards = workspaces.length
      ? await db
          .select()
          .from(board)
          .where(
            inArray(
              board.workspaceId,
              workspaces.map((w) => w.id)
            )
          )
          .orderBy(asc(board.createdAt))
      : [];
    const pendingInvites = session.user.emailVerified
      ? await db
          .select({
            id: invitation.id,
            workspaceName: workspace.name,
            expiresAt: invitation.expiresAt,
          })
          .from(invitation)
          .innerJoin(workspace, eq(workspace.id, invitation.workspaceId))
          .where(
            and(
              eq(invitation.email, session.user.email.toLowerCase()),
              isNull(invitation.acceptedAt)
            )
          )
      : [];
    return {
      viewer: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      },
      workspaces,
      boards,
      pendingInvites: pendingInvites.filter((i) => i.expiresAt > now()),
      demoBoardId: DEMO,
    };
  }
);

export const loadBoard = createServerFn({ method: 'GET' })
  .validator((value: { boardId: string }) => ({
    boardId: textInput(value?.boardId, 'Board ID', 200),
  }))
  .handler(async ({ data }) => {
    const [found] = await db
      .select()
      .from(board)
      .where(eq(board.id, data.boardId));
    if (!found) throw new Error('Board not found.');
    const session = await getSession();
    const [member] = session
      ? await db
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.workspaceId, found.workspaceId),
              eq(membership.userId, session.user.id)
            )
          )
      : [];
    const role = getWorkspaceRole(member?.role);
    assertBoardReadAccess(found.visibility, found.archived, role);
    const [space] = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, found.workspaceId));
    const lists = await db
      .select()
      .from(boardList)
      .where(eq(boardList.boardId, found.id))
      .orderBy(asc(boardList.position), asc(boardList.id));
    const cards = await db
      .select()
      .from(card)
      .where(
        and(
          eq(card.boardId, found.id),
          role ? undefined : eq(card.archived, false)
        )
      )
      .orderBy(asc(card.position), asc(card.id));
    const members = await db
      .select({ id: user.id, name: user.name, role: membership.role })
      .from(membership)
      .innerJoin(user, eq(user.id, membership.userId))
      .where(and(eq(membership.workspaceId, found.workspaceId), or(eq(membership.role, 'owner'), eq(membership.role, 'member'))));
    const comments = cards.length
      ? await db
          .select({
            id: comment.id,
            cardId: comment.cardId,
            body: comment.body,
            createdAt: comment.createdAt,
            author: user.name,
            userId: comment.userId,
          })
          .from(comment)
          .innerJoin(user, eq(comment.userId, user.id))
          .where(
            inArray(
              comment.cardId,
              cards.map((c) => c.id)
            )
          )
          .orderBy(asc(comment.createdAt))
      : [];
    const history = await db
      .select({
        id: activity.id,
        cardId: activity.cardId,
        message: activity.message,
        createdAt: activity.createdAt,
        author: user.name,
      })
      .from(activity)
      .leftJoin(user, eq(activity.userId, user.id))
      .where(eq(activity.boardId, found.id))
      .orderBy(desc(activity.createdAt))
      .limit(100);
    const invites =
      role === 'owner'
        ? await db
            .select({
              id: invitation.id,
              email: invitation.email,
              expiresAt: invitation.expiresAt,
            })
            .from(invitation)
            .where(
              and(
                eq(invitation.workspaceId, found.workspaceId),
                isNull(invitation.acceptedAt)
              )
            )
        : [];
    return {
      board: found,
      workspaceName: space.name,
      lists,
      cards,
      members,
      comments,
      history: role
        ? history
        : history.filter(
            (entry) => !entry.cardId || cards.some((c) => c.id === entry.cardId)
          ),
      invites: invites.filter((i) => i.expiresAt > now()),
      canEdit: Boolean(role) && !found.archived,
      role,
    };
  });

export const mutateCardy = createServerFn({ method: 'POST' })
  .validator(validateAction)
  .handler(async ({ data }) => {
    const viewer = await requireUser();
    if (data.type === 'workspace.create') {
      const workspaceId = id();
      const boardId = id();
      const listIds = [id(), id(), id(), id()];
      await db.batch([
        db
          .insert(workspace)
          .values({ id: workspaceId, name: data.name, createdAt: now() }),
        db
          .insert(membership)
          .values({ workspaceId, userId: viewer.id, role: 'owner' }),
        db.insert(board).values({
          id: boardId,
          workspaceId,
          name: 'My first board',
          createdAt: now(),
        }),
        ...['Ideas', 'In progress', 'In review', 'Done'].map((name, position) =>
          db
            .insert(boardList)
            .values({ id: listIds[position], boardId, name, position })
        ),
        activityInsert(boardId, viewer.id, 'created this board'),
      ]);
      return { id: boardId, workspaceId };
    }
    if (data.type === 'invite.accept') {
      if (!viewer.emailVerified)
        throw new Error('Verify your email before accepting an invitation.');
      const [invite] = await db
        .select()
        .from(invitation)
        .where(eq(invitation.tokenHash, await hashToken(data.token)));
      if (
        !invite ||
        invite.acceptedAt ||
        invite.expiresAt < now() ||
        invite.email !== viewer.email.toLowerCase()
      )
        throw new Error(
          'This invitation is expired, already used, or belongs to another email address.'
        );
      await db.batch([
        db
          .insert(membership)
          .values({
            workspaceId: invite.workspaceId,
            userId: viewer.id,
            role: 'member',
          })
          .onConflictDoNothing(),
        db
          .update(invitation)
          .set({ acceptedAt: now() })
          .where(eq(invitation.id, invite.id)),
      ]);
      return { workspaceId: invite.workspaceId };
    }
    if ('workspaceId' in data) {
      await requireMember(
        data.workspaceId,
        viewer.id,
        data.type !== 'board.create'
      );
      if (data.type === 'workspace.rename') {
        await db
          .update(workspace)
          .set({ name: data.name })
          .where(eq(workspace.id, data.workspaceId));
        return {};
      }
      if (data.type === 'member.invite') {
        const token = crypto.randomUUID() + crypto.randomUUID();
        const invitationId = id();
        await db.insert(invitation).values({
          id: invitationId,
          workspaceId: data.workspaceId,
          email: data.email,
          tokenHash: await hashToken(token),
          expiresAt: now() + 7 * 86400000,
        });
        // Invitations are delivered by an owner-shared link; auth email remains OTP-only.
        return { token, id: invitationId };
      }
      if (data.type === 'member.remove') {
        const [target] = await db
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.workspaceId, data.workspaceId),
              eq(membership.userId, data.userId)
            )
          );
        if (!target || target.role === 'owner')
          throw new Error('Workspace owners cannot be removed.');
        const boards = await db
          .select({ id: board.id })
          .from(board)
          .where(eq(board.workspaceId, data.workspaceId));
        const cards = boards.length
          ? await db
              .select()
              .from(card)
              .where(
                inArray(
                  card.boardId,
                  boards.map((b) => b.id)
                )
              )
          : [];
        await db.batch([
          db
            .delete(membership)
            .where(
              and(
                eq(membership.workspaceId, data.workspaceId),
                eq(membership.userId, data.userId)
              )
            ),
          ...cards
            .filter((c) => c.assignees.includes(data.userId))
            .map((c) =>
              db
                .update(card)
                .set({
                  assignees: c.assignees.filter((x) => x !== data.userId),
                })
                .where(eq(card.id, c.id))
            ),
        ]);
        return {};
      }
      if (data.type === 'invite.revoke') {
        const [target] = await db
          .select({ id: invitation.id })
          .from(invitation)
          .where(
            and(
              eq(invitation.id, data.id),
              eq(invitation.workspaceId, data.workspaceId)
            )
          );
        if (!target)
          throw new Error('Invitation does not belong to this workspace.');
        await db
          .delete(invitation)
          .where(
            and(
              eq(invitation.id, data.id),
              eq(invitation.workspaceId, data.workspaceId)
            )
          );
        return {};
      }
      if (data.type === 'board.create') {
        const boardId = id();
        await db.batch([
          db.insert(board).values({
            id: boardId,
            workspaceId: data.workspaceId,
            name: data.name,
            createdAt: now(),
          }),
          ...['To do', 'In progress', 'Done'].map((name, position) =>
            db.insert(boardList).values({ id: id(), boardId, name, position })
          ),
          activityInsert(boardId, viewer.id, 'created this board'),
        ]);
        return { id: boardId };
      }
    }
    if (!('boardId' in data)) throw new Error('Invalid operation.');
    const found = await writableBoard(
      data.boardId,
      viewer.id,
      data.type === 'board.archive'
    );
    if (data.type === 'board.update' || data.type === 'board.archive') {
      await requireMember(found.workspaceId, viewer.id, true);
      await db.batch([
        db
          .update(board)
          .set(
            data.type === 'board.update'
              ? {
                  name: data.name,
                  description: data.description,
                  visibility: data.visibility,
                }
              : { archived: data.archived }
          )
          .where(eq(board.id, found.id)),
        activityInsert(
          found.id,
          viewer.id,
          data.type === 'board.update'
            ? 'updated board settings'
            : data.archived
              ? 'archived this board'
              : 'restored this board'
        ),
      ]);
      return {};
    }
    if (data.type === 'board.duplicate') {
      const lists = await db
        .select()
        .from(boardList)
        .where(eq(boardList.boardId, found.id));
      const cards = await db
        .select()
        .from(card)
        .where(eq(card.boardId, found.id));
      const boardId = id();
      const listMap = new Map(lists.map((l) => [l.id, id()]));
      await db.batch([
        db.insert(board).values({
          ...found,
          id: boardId,
          name: `${found.name.slice(0, 113)} (copy)`,
          visibility: 'private',
          archived: false,
          createdAt: now(),
        }),
        ...lists.map((l) =>
          db.insert(boardList).values({ ...l, id: listMap.get(l.id)!, boardId })
        ),
        ...cards
          .filter((c) => !c.archived)
          .map((c) =>
            db.insert(card).values({
              ...c,
              id: id(),
              boardId,
              listId: listMap.get(c.listId)!,
              checklist: c.checklist.map((x) => ({ ...x, id: id() })),
              createdAt: now(),
            })
          ),
        activityInsert(boardId, viewer.id, `duplicated “${found.name}”`),
      ]);
      return { id: boardId };
    }
    if (data.type === 'list.create') {
      const lists = await db
        .select()
        .from(boardList)
        .where(eq(boardList.boardId, found.id));
      await db.batch([
        db.insert(boardList).values({
          id: id(),
          boardId: found.id,
          name: data.name,
          position: nextPosition(lists),
        }),
        activityInsert(found.id, viewer.id, `added list “${data.name}”`),
      ]);
      return {};
    }
    if ('listId' in data) {
      const [target] = await db
        .select()
        .from(boardList)
        .where(
          and(eq(boardList.id, data.listId), eq(boardList.boardId, found.id))
        );
      if (!target) throw new Error('List does not belong to this board.');
    }
    if (data.type === 'list.rename') {
      await db.batch([
        db
          .update(boardList)
          .set({ name: data.name })
          .where(eq(boardList.id, data.listId)),
        activityInsert(found.id, viewer.id, `renamed a list to “${data.name}”`),
      ]);
      return {};
    }
    if (data.type === 'list.move') {
      const lists = await db
        .select()
        .from(boardList)
        .where(eq(boardList.boardId, found.id))
        .orderBy(asc(boardList.position), asc(boardList.id));
      const ordered = lists.filter((l) => l.id !== data.listId);
      ordered.splice(
        Math.min(data.index, ordered.length),
        0,
        lists.find((l) => l.id === data.listId)!
      );
      await db.batch([
        activityInsert(found.id, viewer.id, 'reordered lists'),
        ...ordered.map((l, position) =>
          db.update(boardList).set({ position }).where(eq(boardList.id, l.id))
        ),
      ]);
      return {};
    }
    if (data.type === 'card.create') {
      const cards = await db
        .select()
        .from(card)
        .where(and(eq(card.listId, data.listId), eq(card.archived, false)));
      const cardId = id();
      await db.batch([
        db.insert(card).values({
          id: cardId,
          boardId: found.id,
          listId: data.listId,
          title: data.title,
          position: nextPosition(cards),
          createdAt: now(),
        }),
        activityInsert(found.id, viewer.id, `added “${data.title}”`, cardId),
      ]);
      return { id: cardId };
    }
    if (!('cardId' in data)) throw new Error('Invalid operation.');
    const [target] = await db
      .select()
      .from(card)
      .where(and(eq(card.id, data.cardId), eq(card.boardId, found.id)));
    if (!target) throw new Error('Card does not belong to this board.');
    if (target.archived && data.type !== 'card.archive')
      throw new Error('Restore this card before editing it.');
    if (data.type === 'card.update') {
      const members = await db
        .select({ userId: membership.userId })
        .from(membership)
        .where(and(eq(membership.workspaceId, found.workspaceId), or(eq(membership.role, 'owner'), eq(membership.role, 'member'))));
      if (data.assignees.some((uid) => !members.some((m) => m.userId === uid)))
        throw new Error('Assignees must be workspace members.');
      await db.batch([
        db
          .update(card)
          .set({
            title: data.title,
            description: data.description,
            labels: data.labels,
            assignees: [...new Set(data.assignees)],
            dueDate: data.dueDate,
            priority: data.priority,
            checklist: data.checklist,
          })
          .where(eq(card.id, target.id)),
        activityInsert(found.id, viewer.id, 'updated this card', target.id),
      ]);
    } else if (data.type === 'card.schedule') {
      await db.batch([
        db
          .update(card)
          .set({ dueDate: data.dueDate })
          .where(eq(card.id, target.id)),
        activityInsert(
          found.id,
          viewer.id,
          data.dueDate ? `set the due date to ${data.dueDate}` : 'cleared the due date',
          target.id
        ),
      ]);
    } else if (data.type === 'card.prioritize') {
      await db.batch([
        db
          .update(card)
          .set({ priority: data.priority })
          .where(eq(card.id, target.id)),
        activityInsert(
          found.id,
          viewer.id,
          `set priority to ${PRIORITY_LABELS[data.priority].toLowerCase()}`,
          target.id
        ),
      ]);
    } else if (data.type === 'card.archive') {
      const peers =
        target.archived && !data.archived
          ? await db
              .select({ position: card.position })
              .from(card)
              .where(
                and(eq(card.listId, target.listId), eq(card.archived, false))
              )
          : [];
      await db.batch([
        db
          .update(card)
          .set({
            archived: data.archived,
            position:
              target.archived && !data.archived
                ? nextPosition(peers)
                : target.position,
          })
          .where(eq(card.id, target.id)),
        activityInsert(
          found.id,
          viewer.id,
          data.archived ? 'archived this card' : 'restored this card',
          target.id
        ),
      ]);
    } else if (data.type === 'card.move') {
      const cards = await db
        .select()
        .from(card)
        .where(and(eq(card.boardId, found.id), eq(card.archived, false)))
        .orderBy(asc(card.position), asc(card.id));
      const destination = cards.filter(
        (c) => c.listId === data.listId && c.id !== target.id
      );
      destination.splice(Math.min(data.index, destination.length), 0, target);
      const source = cards.filter(
        (c) => c.listId === target.listId && c.id !== target.id
      );
      await db.batch([
        activityInsert(found.id, viewer.id, 'moved this card', target.id),
        ...(target.listId === data.listId
          ? []
          : source.map((c, position) =>
              db.update(card).set({ position }).where(eq(card.id, c.id))
            )),
        ...destination.map((c, position) =>
          db
            .update(card)
            .set({ listId: data.listId, position })
            .where(eq(card.id, c.id))
        ),
      ]);
    } else if (data.type === 'comment.create') {
      await db.batch([
        db.insert(comment).values({
          id: id(),
          cardId: target.id,
          userId: viewer.id,
          body: data.body,
          createdAt: now(),
        }),
        activityInsert(
          found.id,
          viewer.id,
          'commented on this card',
          target.id
        ),
      ]);
    }
    return {};
  });

export type ApplicationData = Awaited<ReturnType<typeof loadApplication>>;
export type BoardData = Awaited<ReturnType<typeof loadBoard>>;
