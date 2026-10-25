import { getRequest, getRequestHeaders } from '@tanstack/react-start/server';
import { env, waitUntil } from 'cloudflare:workers';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~/db';
import { activity, board, membership, user } from '~/db/schema';
import { auth } from '~/lib/auth';
import { assignmentEmail } from './cardy.email';
import { assertWorkspacePermission, getWorkspaceRole } from './cardy.types';

// Server-only helpers shared by the Cardy server functions.

export const now = () => Date.now();
export const id = () => crypto.randomUUID();
export const getSession = () =>
  auth.api.getSession({ headers: getRequestHeaders() });

// Links in email point at the published app's own origin.
export const appOrigin = () =>
  env.BETTER_AUTH_URL || new URL(getRequest().url).origin;

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error('Sign in to make changes.');
  return session.user;
}

export async function findRole(workspaceId: string, userId: string) {
  const [member] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.workspaceId, workspaceId),
        eq(membership.userId, userId)
      )
    );
  return getWorkspaceRole(member?.role);
}

export async function requireMember(
  workspaceId: string,
  userId: string,
  owner = false
) {
  assertWorkspacePermission(await findRole(workspaceId, userId), owner);
}

export async function writableBoard(
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

type AssignmentNotice = {
  userIds: string[];
  actorName: string;
  cardTitle: string;
  boardName: string;
  link: string;
};

// Emails people newly assigned to a card after the response is sent, so email
// never delays or fails the assignment.
export function notifyAssignees(input: AssignmentNotice) {
  waitUntil(sendAssignmentEmails(input));
}

async function sendAssignmentEmails(input: AssignmentNotice) {
  try {
    // Recipients come from D1; unverified addresses are skipped to avoid bounces.
    const recipients = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(and(inArray(user.id, input.userIds), eq(user.emailVerified, true)));
    const message = assignmentEmail(input);
    await Promise.all(
      recipients.map(async (recipient) => {
        const { error } = await env.EMAIL.send({ to: recipient.email, ...message });
        if (error)
          console.warn(
            `[email] assignment to ${recipient.id}: ${error.code} ${error.message}`
          );
      })
    );
  } catch (error) {
    console.warn('[email] assignment notification failed', error);
  }
}

export function activityInsert(
  boardId: string,
  userId: string | null,
  message: string,
  cardId: string | null = null
) {
  return db
    .insert(activity)
    .values({ id: id(), boardId, cardId, userId, message, createdAt: now() });
}
