import { createFileRoute, redirect } from '@tanstack/react-router';
import { LandingPage } from '~/components/landing/landing-page';
import { getAuthSession } from '~/lib/auth.functions';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { board?: string; invite?: string } => ({
    board: typeof search.board === 'string' ? search.board : undefined,
    invite: typeof search.invite === 'string' ? search.invite : undefined,
  }),
  // Board and invitation links shared before the app moved to /app keep working.
  beforeLoad: ({ search }) => {
    if (search.board || search.invite) throw redirect({ to: '/app', search });
  },
  loader: async () => ({ signedIn: Boolean(await getAuthSession()) }),
  head: () => ({
    meta: seo({
      title: 'Cardy | Plan the work. Watch it move.',
      description:
        'Boards with priorities, due dates and checklists, shared with your team.',
    }),
  }),
  component: Home,
});

function Home() {
  const { signedIn } = Route.useLoaderData();
  return <LandingPage signedIn={signedIn} />;
}
