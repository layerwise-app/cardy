import { createFileRoute } from '@tanstack/react-router';
import { CardyApp } from '~/components/cardy/cardy-app';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { board?: string; invite?: string } => ({
    board: typeof search.board === 'string' ? search.board : undefined,
    invite: typeof search.invite === 'string' ? search.invite : undefined,
  }),
  head: () => ({
    meta: seo({
      title: 'Cardy | A little less chaos. A lot more clarity.',
      description:
        'A thoughtful home for your team’s tasks, ideas, and next big thing.',
    }),
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return (
    <CardyApp initialBoard={search.board} invitationToken={search.invite} />
  );
}
