import { useState, type ReactNode } from 'react';
import { Archive, ArchiveRestore, MailOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import type { Board } from '~/lib/cardy.types';
import { fire, useBoard } from './board-context';
import { Time } from './card-detail-parts';
import { PersonAvatar, SubmitButton } from './cardy-ui';
import type { RunAction } from './cardy-utils';
import { ListView } from './list-view';

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='thin-scrollbar min-h-0 flex-1 overflow-y-auto'>
      <div className='mx-auto flex max-w-5xl flex-col gap-4 py-6'>
        <h1 className='px-4 text-lg font-semibold tracking-tight sm:px-6'>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className='mx-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-input px-6 py-14 text-center sm:mx-6'>
      <span className='grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5'>
        {icon}
      </span>
      <h2 className='text-sm font-medium'>{title}</h2>
      {children}
    </div>
  );
}

export function MyTasks({ viewerId }: { viewerId: string }) {
  const { data } = useBoard();
  const mine = data.cards.filter((card) => !card.archived && card.assignees.includes(viewerId));
  return (
    <Page title='My tasks'>
      <ListView cards={mine} empty={`No cards on ${data.board.name} are assigned to you.`} />
    </Page>
  );
}

export function ActivityFeed() {
  const { data, openCard } = useBoard();
  return (
    <Page title='Activity'>
      <ol className='mx-4 flex flex-col rounded-xl border border-border bg-white sm:mx-6'>
        {data.history.map((entry) => (
          <li key={entry.id} className='flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0'>
            <PersonAvatar name={entry.author ?? 'Cardy'} />
            <div className='min-w-0 flex-1 text-[13px]'>
              <p>
                <strong className='font-medium'>{entry.author ?? 'Cardy'}</strong>{' '}
                <span className='text-muted-foreground'>{entry.message}</span>
              </p>
              <Time value={entry.createdAt} />
            </div>
            {entry.cardId && data.cards.some((card) => card.id === entry.cardId) && (
              <Button variant='ghost' size='xs' onClick={() => entry.cardId && openCard(entry.cardId)}>
                Open
              </Button>
            )}
          </li>
        ))}
        {!data.history.length && (
          <li className='px-4 py-10 text-center text-[13px] text-muted-foreground'>No activity yet.</li>
        )}
      </ol>
    </Page>
  );
}

export function ArchivedBoards({
  boards,
  isOwner,
  run,
  pending,
  onOpen,
}: {
  boards: Board[];
  isOwner: boolean;
  run: RunAction;
  pending: boolean;
  onOpen: (boardId: string) => void;
}) {
  return (
    <Page title='Archived boards'>
      {boards.length ? (
        <ul className='mx-4 grid gap-3 sm:mx-6 sm:grid-cols-2 lg:grid-cols-3'>
          {boards.map((board) => (
            <li key={board.id} className='flex flex-col gap-3 rounded-xl border border-border bg-white p-4'>
              <div className='min-w-0'>
                <h2 className='truncate text-[13px] font-medium'>{board.name}</h2>
                {board.description && (
                  <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>{board.description}</p>
                )}
              </div>
              <div className='mt-auto flex gap-2'>
                <Button variant='outline' size='sm' onClick={() => onOpen(board.id)}>
                  View
                </Button>
                {isOwner && (
                  <Button
                    size='sm'
                    disabled={pending}
                    onClick={() =>
                      fire(
                        run({ type: 'board.archive', boardId: board.id, archived: false }).then(() => {
                          toast.success('Board restored');
                          onOpen(board.id);
                        })
                      )
                    }
                  >
                    <ArchiveRestore />
                    Restore
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Archive />} title='No archived boards' />
      )}
    </Page>
  );
}

export function InvitationBanner({
  token,
  signedIn,
  verified,
  run,
  onSignIn,
  onAccepted,
}: {
  token: string;
  signedIn: boolean;
  verified: boolean;
  run: RunAction;
  onSignIn: () => void;
  onAccepted: (workspaceId?: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const ready = signedIn && verified;
  return (
    <div className='flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-primary/15 bg-tint px-4 py-2.5 text-[13px] sm:px-6'>
      <MailOpen className='size-4 text-primary' />
      <span className='flex-1'>
        {ready
          ? 'You have a workspace invitation.'
          : signedIn
            ? 'Verify your email to accept this invitation.'
            : 'Sign in with the invited email to accept this invitation.'}
      </span>
      <SubmitButton
        size='sm'
        isPending={pending}
        onClick={async () => {
          if (!ready) return onSignIn();
          setPending(true);
          try {
            const result = await run({ type: 'invite.accept', token });
            onAccepted(result.workspaceId);
          } catch {
            /* The error is toasted. */
          } finally {
            setPending(false);
          }
        }}
      >
        {ready ? 'Accept' : signedIn ? 'Verify email' : 'Sign in'}
      </SubmitButton>
    </div>
  );
}

export function Banner({
  tone = 'info',
  action,
  children,
}: {
  tone?: 'info' | 'error';
  action: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={
        tone === 'error'
          ? 'flex shrink-0 items-center gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-[13px] text-destructive sm:px-6'
          : 'flex shrink-0 items-center gap-3 border-b border-primary/15 bg-tint/70 px-4 py-2 text-[13px] sm:px-6'
      }
    >
      <span className='min-w-0 flex-1'>{children}</span>
      <Button size='xs' variant={tone === 'error' ? 'outline' : 'default'} onClick={action.onClick}>
        {action.label}
      </Button>
    </div>
  );
}
