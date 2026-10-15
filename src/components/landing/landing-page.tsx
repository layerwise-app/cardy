import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Logo } from '~/components/cardy/cardy-ui';
import { Button } from '~/components/ui/button';
import { useReveal } from '~/hooks/use-reveal';
import { cn } from '~/lib/utils';
import {
  CalendarTile,
  CardDetailFragment,
  FiltersFragment,
  InsightsTile,
  SharingFragment,
  ShortcutsTile,
} from './feature-fragments';
import { PoweredByLayerwise } from '~/components/powered-by-layerwise';
import { HeroBoard } from './hero-board';

// Feeds the --i stagger index used by the .rise and [data-reveal] transitions.
const order = (i: number) => ({ '--i': i }) as CSSProperties;

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  const revealRef = useReveal<HTMLDivElement>();
  return (
    <div ref={revealRef} className='min-h-dvh overflow-x-clip bg-background text-foreground'>
      <header className='sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md'>
        <nav className='mx-auto flex h-14 max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-6'>
          <Link to='/' className='mr-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50'>
            <Logo />
          </Link>
          {signedIn ? (
            <Button asChild size='sm'>
              <Link to='/app'>Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant='ghost' size='sm'>
                <Link to='/app'>Demo</Link>
              </Button>
              <Button asChild variant='ghost' size='sm'>
                <Link to='/sign-in'>Sign in</Link>
              </Button>
              <Button asChild size='sm'>
                <Link to='/sign-up'>Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className='relative'>
          <div className='landing-grid pointer-events-none absolute inset-0 -z-0' />
          <div className='relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28'>
            <h1
              className='rise max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-6xl'
              style={order(0)}
            >
              Plan the work. Watch it move.
            </h1>
            <p className='rise mt-5 max-w-xl text-base text-balance text-muted-foreground sm:text-lg' style={order(1)}>
              Boards with priorities, due dates and checklists, shared with your team.
            </p>
            <div className='rise mt-8 flex flex-wrap justify-center gap-3' style={order(2)}>
              <Button asChild size='lg' className='nudge h-11 px-5 text-[15px]'>
                <Link to={signedIn ? '/app' : '/sign-up'}>
                  {signedIn ? 'Open app' : 'Get started'}
                  <ArrowRight />
                </Link>
              </Button>
              {!signedIn && (
                <Button asChild size='lg' variant='outline' className='h-11 bg-white px-5 text-[15px]'>
                  <Link to='/app'>Try the demo</Link>
                </Button>
              )}
            </div>
            <div className='rise mt-14 flex w-full justify-center sm:mt-16' style={order(3)}>
              <HeroBoard />
            </div>
          </div>
        </section>

        <Feature
          title='Everything about a task, on the card.'
          body='Checklists, priority, due dates, labels, comments and a full history.'
        >
          <CardDetailFragment />
        </Feature>
        <Feature
          flip
          title='Find the right cards fast.'
          body='Filter by person, label, priority or due date, then switch to a list or calendar.'
        >
          <FiltersFragment />
        </Feature>
        <Feature title='Bring your team in.' body='Invite by email, keep boards private, or share a read-only link.'>
          <SharingFragment />
        </Feature>

        <section className='mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24'>
          <div className='grid gap-4 md:grid-cols-3'>
            <Tile index={0} title='Calendar' body='Drag a card onto a day to reschedule it.'>
              <CalendarTile />
            </Tile>
            <Tile index={1} title='Insights' body='Open work, overdue cards and workload per person.'>
              <InsightsTile />
            </Tile>
            <Tile index={2} title='Shortcuts' body='Search, create and close without the mouse.'>
              <ShortcutsTile />
            </Tile>
          </div>
        </section>

        <section className='border-t border-border bg-white'>
          <div
            data-reveal
            className='mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28'
          >
            <h2 className='text-3xl font-semibold tracking-[-0.03em] sm:text-4xl'>Start your first board.</h2>
            <div className='flex flex-wrap justify-center gap-3'>
              <Button asChild size='lg' className='nudge h-11 px-5 text-[15px]'>
                <Link to={signedIn ? '/app' : '/sign-up'}>
                  {signedIn ? 'Open app' : 'Get started'}
                  <ArrowRight />
                </Link>
              </Button>
              {!signedIn && (
                <Button asChild size='lg' variant='outline' className='h-11 px-5 text-[15px]'>
                  <Link to='/app'>Try the demo</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className='border-t border-border bg-white'>
        <div className='mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 text-[13px] text-muted-foreground sm:px-6'>
          <Logo className='text-sm' />
          <span className='mr-auto'>© {new Date().getFullYear()}</span>
          <Link to='/app' className='transition-colors hover:text-foreground'>
            Demo
          </Link>
          <Link to={signedIn ? '/app' : '/sign-in'} className='transition-colors hover:text-foreground'>
            {signedIn ? 'Open app' : 'Sign in'}
          </Link>
        </div>
        <div className='mx-auto flex max-w-6xl justify-center px-4 pb-6 sm:px-6'>
          <PoweredByLayerwise />
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  body,
  flip,
  children,
}: {
  title: string;
  body: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section className='mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[5fr_7fr] md:gap-14 md:py-20'>
      <div data-reveal className={cn('flex flex-col gap-3', flip && 'md:order-2')}>
        <h2 className='text-[28px] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[34px]'>
          {title}
        </h2>
        <p className='max-w-md text-base text-pretty text-muted-foreground'>{body}</p>
      </div>
      <div data-reveal style={order(1)} className={cn('min-w-0', flip && 'md:order-1')}>
        {children}
      </div>
    </section>
  );
}

function Tile({ index, title, body, children }: { index: number; title: string; body: string; children: ReactNode }) {
  return (
    <div data-reveal style={order(index)}>
      <div className='lift flex h-full flex-col gap-5 rounded-2xl border border-border bg-white p-5'>
        <div className='min-h-[132px]'>{children}</div>
        <div className='mt-auto flex flex-col gap-1'>
          <h3 className='text-[15px] font-semibold'>{title}</h3>
          <p className='text-[13px] text-muted-foreground'>{body}</p>
        </div>
      </div>
    </div>
  );
}
