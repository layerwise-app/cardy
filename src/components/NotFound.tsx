import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { Logo } from '~/components/cardy/cardy-ui';
import { Button } from '~/components/ui/button';

export function StatusPage({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className='flex min-h-dvh flex-col items-center bg-background px-4 py-6 text-foreground'>
      <Link to='/' aria-label='Cardy home' className='self-start sm:ml-4'>
        <Logo />
      </Link>
      <div className='flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-2 pb-16 text-center'>
        <span className='mb-2 grid size-12 place-items-center rounded-full bg-tint text-primary [&_svg]:size-6'>{icon}</span>
        <h1 className='text-xl font-semibold tracking-tight'>{title}</h1>
        <div className='text-sm text-muted-foreground'>{children}</div>
        <div className='mt-4 flex flex-wrap justify-center gap-2'>{actions}</div>
      </div>
    </div>
  );
}

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <StatusPage
      icon={<Compass />}
      title='Page not found'
      actions={
        <Button asChild>
          <Link to='/app'>Open Cardy</Link>
        </Button>
      }
    >
      {children || 'The link may have changed or been removed.'}
    </StatusPage>
  );
}
