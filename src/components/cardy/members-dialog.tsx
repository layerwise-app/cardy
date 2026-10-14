import { useState } from 'react';
import { Copy, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { fire, useBoard } from './board-context';
import { PersonAvatar, SubmitButton } from './cardy-ui';
import { copyText } from './cardy-utils';

export function MembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useBoard();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-5 sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-base font-semibold'>Members</DialogTitle>
          <DialogDescription>{data.workspaceName}</DialogDescription>
        </DialogHeader>
        {open && <MembersBody />}
      </DialogContent>
    </Dialog>
  );
}

function MembersBody() {
  const { data, run, pending } = useBoard();
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removeId, setRemoveId] = useState('');
  const owner = data.role === 'owner';
  const workspaceId = data.board.workspaceId;

  async function invite() {
    setInviting(true);
    try {
      const result = await run({ type: 'member.invite', workspaceId, email });
      if (result.token) setLink(`${window.location.origin}/app?invite=${result.token}`);
      setEmail('');
    } catch {
      /* The email stays for a retry; the error is toasted. */
    } finally {
      setInviting(false);
    }
  }

  return (
    <>
      <ul className='-mx-2 flex flex-col'>
        {data.members.map((member) => (
          <li key={member.id} className='flex h-10 items-center gap-2.5 rounded-md px-2 text-[13px]'>
            <PersonAvatar name={member.name} />
            <span className='min-w-0 flex-1 truncate font-medium'>{member.name}</span>
            <span className='font-mono text-[11px] text-faint capitalize'>{member.role}</span>
            {owner && member.role !== 'owner' && (
              <Button
                variant={removeId === member.id ? 'destructive' : 'ghost'}
                size={removeId === member.id ? 'xs' : 'icon-xs'}
                disabled={pending}
                aria-label={`Remove ${member.name}`}
                onBlur={() => setRemoveId('')}
                onClick={() => {
                  if (removeId !== member.id) return setRemoveId(member.id);
                  fire(
                    run({ type: 'member.remove', workspaceId, userId: member.id }).then(() =>
                      toast.success(`${member.name} removed`)
                    )
                  );
                  setRemoveId('');
                }}
              >
                {removeId === member.id ? 'Remove' : <X />}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {owner ? (
        <div className='flex flex-col gap-3 border-t border-border pt-4'>
          <form
            className='flex gap-2'
            onSubmit={(event) => {
              event.preventDefault();
              void invite();
            }}
          >
            <Input
              type='email'
              required
              aria-label='Email to invite'
              placeholder='teammate@company.com'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <SubmitButton type='submit' isPending={inviting} disabled={!email.trim()}>
              Invite
            </SubmitButton>
          </form>
          <p className='text-xs text-muted-foreground'>
            Creates a link valid for 7 days. Only the invited email can accept it.
          </p>
          {link && (
            <div className='flex items-center gap-2 rounded-lg border border-primary/25 bg-tint p-1.5 pl-3'>
              <Link2 className='size-4 shrink-0 text-primary' />
              <Input
                aria-label='Invitation link'
                readOnly
                value={link}
                onFocus={(event) => event.target.select()}
                className='h-7 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0 md:text-xs'
              />
              <Button size='sm' variant='outline' className='bg-white' onClick={() => void copyText(link)}>
                <Copy />
                Copy
              </Button>
            </div>
          )}
          {data.invites.length > 0 && (
            <div className='flex flex-col gap-1'>
              <h3 className='text-xs font-medium text-muted-foreground'>Pending</h3>
              <ul className='-mx-2 flex flex-col'>
                {data.invites.map((item) => (
                  <li key={item.id} className='flex h-9 items-center gap-2 rounded-md px-2 text-[13px]'>
                    <span className='min-w-0 flex-1 truncate'>{item.email}</span>
                    <span className='font-mono text-[11px] text-faint'>
                      expires {new Date(item.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <Button
                      variant='ghost'
                      size='xs'
                      disabled={pending}
                      onClick={() =>
                        fire(
                          run({ type: 'invite.revoke', workspaceId, id: item.id }).then(() =>
                            toast.success('Invitation revoked')
                          )
                        )
                      }
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className='border-t border-border pt-4 text-xs text-muted-foreground'>
          Only workspace owners can invite or remove members.
        </p>
      )}
    </>
  );
}
