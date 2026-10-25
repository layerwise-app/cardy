// Assignment email content. Pure, so `node --test` can load it.

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// People added to a card by someone else; self-assignment sends nothing.
export function newAssignees(
  before: string[],
  after: string[],
  actorId: string
): string[] {
  return [...new Set(after)].filter(
    (userId) => userId !== actorId && !before.includes(userId)
  );
}

export function cardLink(origin: string, boardId: string, cardId: string) {
  const url = new URL('/app', origin);
  url.searchParams.set('board', boardId);
  url.searchParams.set('card', cardId);
  return url.toString();
}

const oneLine = (value: string, max: number) => {
  const line = value.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

export function assignmentEmail(input: {
  actorName: string;
  cardTitle: string;
  boardName: string;
  link: string;
}) {
  const actor = oneLine(input.actorName, 100);
  const title = oneLine(input.cardTitle, 200);
  const boardName = oneLine(input.boardName, 120);
  return {
    subject: `${actor} assigned you to “${title}”`,
    text: `${actor} assigned you to “${title}” on ${boardName}.\n\nOpen the card: ${input.link}`,
    html: `<p>${escapeHtml(actor)} assigned you to <strong>${escapeHtml(title)}</strong> on ${escapeHtml(boardName)}.</p><p><a href="${escapeHtml(input.link)}">Open the card</a></p>`,
  };
}
