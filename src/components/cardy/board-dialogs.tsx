import { useState, type ReactNode } from 'react';
import { ArchiveRestore, Copy, Globe2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { fire, useBoard } from './board-context';
import { Kbd, SubmitButton } from './cardy-ui';
import { copyText, errorMessage, type Prompt } from './cardy-utils';

function Header({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <DialogHeader>
      <DialogTitle className='text-base font-semibold'>{title}</DialogTitle>
      <DialogDescription className={cn(!description && 'sr-only')}>
        {description ?? title}
      </DialogDescription>
    </DialogHeader>
  );
}

export function PromptDialog({ prompt, onClose }: { prompt: Prompt; onClose: () => void }) {
  const [value, setValue] = useState(prompt.value ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className='gap-5 sm:max-w-sm'>
        <Header title={prompt.title} description={prompt.description} />
        <form
          className='flex flex-col gap-4'
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError('');
            try {
              await prompt.action(value);
              onClose();
            } catch (cause) {
              setError(errorMessage(cause, 'Something went wrong. Try again.'));
            } finally {
              setPending(false);
            }
          }}
        >
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='prompt-value' className='text-[13px]'>
              {prompt.label}
            </Label>
            <Input
              id='prompt-value'
              autoFocus
              required
              maxLength={120}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => event.target.select()}
            />
            {error && (
              <p role='alert' className='text-[13px] text-destructive'>
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type='button' variant='ghost' disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton type='submit' isPending={pending} disabled={!value.trim()}>
              {prompt.submitLabel ?? 'Create'}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BoardSettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, run } = useBoard();
  const [workspaceName, setWorkspaceName] = useState(data.workspaceName);
  const [name, setName] = useState(data.board.name);
  const [description, setDescription] = useState(data.board.description);
  const [visibility, setVisibility] = useState(data.board.visibility);
  const [pending, setPending] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className='gap-5 sm:max-w-md'>
        <Header title='Board settings' />
        <form
          className='flex flex-col gap-4'
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            try {
              if (workspaceName !== data.workspaceName)
                await run({ type: 'workspace.rename', workspaceId: data.board.workspaceId, name: workspaceName });
              await run({ type: 'board.update', boardId: data.board.id, name, description, visibility });
              toast.success('Settings saved');
              onClose();
            } catch {
              /* The error is toasted; the form keeps its values. */
            } finally {
              setPending(false);
            }
          }}
        >
          <Field id='settings-workspace' label='Workspace name'>
            <Input id='settings-workspace' required maxLength={120} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
          </Field>
          <Field id='settings-board' label='Board name'>
            <Input id='settings-board' required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field id='settings-description' label='Description'>
            <Textarea id='settings-description' maxLength={20000} value={description} onChange={(e) => setDescription(e.target.value)} className='min-h-16' />
          </Field>
          <RadioGroup
            aria-label='Visibility'
            value={visibility}
            onValueChange={(value) => setVisibility(value === 'public' ? 'public' : 'private')}
            className='gap-2'
          >
            {(
              [
                ['private', LockKeyhole, 'Private', 'Only workspace members can open it.'],
                ['public', Globe2, 'Public', 'Anyone with the link can view. Members edit.'],
              ] as const
            ).map(([value, Icon, title, hint]) => (
              <Label
                key={value}
                htmlFor={`visibility-${value}`}
                className='flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 font-normal transition-colors hover:bg-muted/40 has-data-checked:border-primary/40 has-data-checked:bg-tint/60'
              >
                <RadioGroupItem id={`visibility-${value}`} value={value} className='mt-0.5' />
                <span className='flex flex-col gap-1'>
                  <span className='flex items-center gap-1.5 text-[13px] font-medium'>
                    <Icon className='size-3.5' />
                    {title}
                  </span>
                  <span className='text-xs text-muted-foreground'>{hint}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button type='button' variant='ghost' disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton type='submit' isPending={pending}>
              Save
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  const { data } = useBoard();
  const link = `${window.location.origin}/app?board=${data.board.id}`;
  const isPublic = data.board.visibility === 'public';
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='gap-5 sm:max-w-md'>
        <Header
          title='Share board'
          description={isPublic ? 'Anyone with the link can view. Only members can edit.' : 'Private. Only workspace members can open this link.'}
        />
        <div className='flex gap-2'>
          <Input aria-label='Board link' readOnly value={link} onFocus={(e) => e.target.select()} className='font-mono text-xs md:text-xs' />
          <Button variant='outline' onClick={() => void copyText(link)}>
            <Copy />
            Copy
          </Button>
        </div>
        {data.role === 'owner' && (
          <Button variant='link' className='h-auto self-start p-0 text-[13px]' onClick={onSettings}>
            {isPublic ? <Globe2 /> : <LockKeyhole />}
            Change visibility
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ArchivedCardsDialog({ onClose }: { onClose: () => void }) {
  const { data, run, pending, openCard } = useBoard();
  const archived = data.cards.filter((card) => card.archived);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='gap-4 sm:max-w-md'>
        <Header title='Archived cards' description={data.board.name} />
        {archived.length ? (
          <ul className='-mx-2 flex max-h-80 flex-col overflow-y-auto'>
            {archived.map((card) => (
              <li key={card.id} className='flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50'>
                <button
                  type='button'
                  className='min-w-0 flex-1 text-left'
                  onClick={() => {
                    onClose();
                    openCard(card.id);
                  }}
                >
                  <span className='block truncate text-[13px] font-medium'>{card.title}</span>
                  <span className='block text-xs text-muted-foreground'>
                    {data.lists.find((list) => list.id === card.listId)?.name}
                  </span>
                </button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={!data.canEdit || pending}
                  onClick={() =>
                    fire(
                      run({ type: 'card.archive', boardId: data.board.id, cardId: card.id, archived: false }).then(() =>
                        toast.success('Card restored')
                      )
                    )
                  }
                >
                  <ArchiveRestore />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className='py-6 text-center text-[13px] text-muted-foreground'>No archived cards.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['/'], 'Search cards'],
  [['N'], 'New card'],
  [['?'], 'Keyboard shortcuts'],
  [['Esc'], 'Close or clear'],
  [['⌘', '↵'], 'Save card'],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-4 sm:max-w-xs'>
        <Header title='Keyboard shortcuts' />
        <ul className='flex flex-col gap-2.5'>
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className='flex items-center justify-between text-[13px]'>
              {label}
              <span className='flex gap-1'>
                {keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className='border-t border-border pt-3 text-xs text-muted-foreground'>
          Drag cards between lists or onto calendar days. Every card also has a ⋯ menu for moving without a mouse.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={id} className='text-[13px]'>
        {label}
      </Label>
      {children}
    </div>
  );
}
