import { useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { StatusPage } from './NotFound';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  return (
    <StatusPage
      icon={<TriangleAlert />}
      title='Something went wrong'
      actions={
        <>
          <Button onClick={() => void router.invalidate()}>Try again</Button>
          <Button variant='outline' onClick={() => window.history.back()}>
            Go back
          </Button>
        </>
      }
    >
      {error instanceof Error && error.message ? error.message : 'Reload the page or try again in a moment.'}
    </StatusPage>
  );
}
