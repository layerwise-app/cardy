import { createFileRoute } from '@tanstack/react-router';
import { CardyApp } from '~/components/cardy/cardy-app';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/app')({
  validateSearch: (
    search: Record<string, unknown>
  ): { board?: string; invite?: string } => ({
    board: typeof search.board === 'string' ? search.board : undefined,
    invite: typeof search.invite === 'string' ? search.invite : undefined,
  }),
  head: () => ({
    meta: seo({
      title: 'Cardy',
      description: 'Boards, lists and cards for your team.',
    }),
  }),
  component: AppPage,
});

function AppPage() {
  const search = Route.useSearch();
  return (
    <CardyApp initialBoard={search.board} invitationToken={search.invite} />
  );
}
