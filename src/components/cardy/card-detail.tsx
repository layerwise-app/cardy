import { useState } from 'react';
import { Archive, ArchiveRestore, Command, CornerDownLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { isOverdue } from '~/lib/cardy.board';
import { PRIORITIES, PRIORITY_LABELS, type Card } from '~/lib/cardy.types';
import { fire, useBoard } from './board-context';
import {
  AssigneePicker,
  ChecklistEditor,
  Conversation,
  LabelPicker,
  Property,
} from './card-detail-parts';
import { PriorityIcon, StatusIcon, SubmitButton } from './cardy-ui';

type Draft = Pick<Card, 'title' | 'description' | 'labels' | 'assignees' | 'priority' | 'checklist'> & {
  dueDate: string;
};

function toDraft(card: Card): Draft {
  return {
    title: card.title,
    description: card.description,
    labels: card.labels,
    assignees: card.assignees,
    priority: card.priority,
    checklist: card.checklist,
    dueDate: card.dueDate ?? '',
  };
}

export function CardDetail({ card, onClose }: { card: Card; onClose: () => void }) {
  const { data, run, pending, today, doneId } = useBoard();
  const [draft, setDraft] = useState(() => toDraft(card));
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const canEdit = data.canEdit && !card.archived;
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(card));
  const listIndex = data.lists.findIndex((list) => list.id === card.listId);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  function requestClose() {
    if (saving) return;
    if (dirty || comment.trim()) setConfirmClose(true);
    else onClose();
  }
  async function save() {
    if (!canEdit || !dirty || !draft.title.trim() || saving) return;
    setSaving(true);
    try {
      const next: Draft = {
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim(),
        checklist: draft.checklist.map((item) => ({ ...item, title: item.title.trim() })),
        assignees: draft.assignees.filter((id) => data.members.some((m) => m.id === id)),
      };
      await run({
        type: 'card.update',
        boardId: data.board.id,
        cardId: card.id,
        ...next,
        dueDate: next.dueDate || null,
      });
      setDraft(next);
      toast.success('Card saved');
    } catch {
      /* Edits stay for a retry; the error is toasted. */
    } finally {
      setSaving(false);
    }
  }
  async function setArchived(archived: boolean) {
    try {
      await run({ type: 'card.archive', boardId: data.board.id, cardId: card.id, archived });
      toast.success(archived ? 'Card archived' : 'Card restored');
      if (archived) onClose();
    } catch {
      /* The error is toasted. */
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        showCloseButton={false}
        className='flex max-h-[min(92dvh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void save();
          }
        }}
      >
        <header className='flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 text-[13px]'>
          <StatusIcon index={listIndex} total={data.lists.length} />
          <span className='truncate text-muted-foreground'>{data.board.name}</span>
          <span className='text-faint'>/</span>
          <span className='truncate'>{data.lists[listIndex]?.name}</span>
          {card.archived && (
            <span className='rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground'>Archived</span>
          )}
          {!data.canEdit && (
            <span className='rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground'>Read only</span>
          )}
          <Button variant='ghost' size='icon-sm' className='ml-auto' aria-label='Close' onClick={requestClose}>
            <X />
          </Button>
        </header>
        <DialogTitle className='sr-only'>{card.title}</DialogTitle>
        <DialogDescription className='sr-only'>Card details, checklist and comments</DialogDescription>

        <div className='thin-scrollbar grid min-h-0 flex-1 scroll-py-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_260px]'>
          <div className='flex min-w-0 flex-col gap-6 p-5 sm:p-6'>
            <Textarea
              aria-label='Card title'
              maxLength={300}
              readOnly={!canEdit}
              value={draft.title}
              onChange={(event) => update({ title: event.target.value })}
              className='min-h-0 resize-none border-0 p-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-xl'
            />
            {canEdit ? (
              <Textarea
                aria-label='Description'
                placeholder='Add a description'
                maxLength={20000}
                value={draft.description}
                onChange={(event) => update({ description: event.target.value })}
                className='-mt-3 min-h-20 resize-y border-0 p-0 text-[13px] leading-relaxed shadow-none focus-visible:ring-0 md:text-[13px]'
              />
            ) : (
              <p className='-mt-3 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/85'>
                {draft.description || <span className='text-faint'>No description.</span>}
              </p>
            )}
            <ChecklistEditor
              items={draft.checklist}
              canEdit={canEdit}
              onChange={(checklist) => update({ checklist })}
            />
            <Conversation card={card} canEdit={canEdit} comment={comment} setComment={setComment} />
          </div>

          <aside className='flex flex-col gap-5 border-t border-border bg-muted/30 p-5 md:border-t-0 md:border-l'>
            <Property label='Status'>
              <Select
                value={card.listId}
                disabled={!canEdit || pending}
                onValueChange={(listId) =>
                  fire(
                    run({
                      type: 'card.move',
                      boardId: data.board.id,
                      cardId: card.id,
                      listId,
                      index: data.cards.filter((c) => c.listId === listId && !c.archived).length,
                    })
                  )
                }
              >
                <SelectTrigger size='sm' className='w-full bg-white' aria-label='Status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.lists.map((list, index) => (
                    <SelectItem key={list.id} value={list.id}>
                      <StatusIcon index={index} total={data.lists.length} />
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Property>
            <Property label='Priority'>
              <Select
                value={draft.priority}
                disabled={!canEdit}
                onValueChange={(value) => {
                  const priority = PRIORITIES.find((p) => p === value);
                  if (priority) update({ priority });
                }}
              >
                <SelectTrigger size='sm' className='w-full bg-white' aria-label='Priority'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      <PriorityIcon priority={priority} />
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Property>
            <Property label='Due date'>
              <div className='flex gap-1'>
                <Input
                  type='date'
                  aria-label='Due date'
                  disabled={!canEdit}
                  value={draft.dueDate}
                  onChange={(event) => update({ dueDate: event.target.value })}
                  className={cn(
                    'h-8 bg-white text-[13px] md:text-[13px]',
                    isOverdue({ ...card, dueDate: draft.dueDate || null }, today, doneId) &&
                      'border-red-300 text-red-600'
                  )}
                />
                {canEdit && draft.dueDate && (
                  <Button variant='ghost' size='icon-sm' aria-label='Clear due date' onClick={() => update({ dueDate: '' })}>
                    <X />
                  </Button>
                )}
              </div>
            </Property>
            <Property label='Assignees'>
              <AssigneePicker
                value={draft.assignees}
                canEdit={canEdit}
                onChange={(assignees) => update({ assignees })}
              />
            </Property>
            <Property label='Labels'>
              <LabelPicker value={draft.labels} canEdit={canEdit} onChange={(labels) => update({ labels })} />
            </Property>
            {data.canEdit && (
              <div className='mt-auto pt-2'>
                {card.archived ? (
                  <Button variant='outline' size='sm' className='w-full' disabled={pending} onClick={() => void setArchived(false)}>
                    <ArchiveRestore />
                    Restore card
                  </Button>
                ) : (
                  <Button
                    variant={confirmArchive ? 'destructive' : 'ghost'}
                    size='sm'
                    className='w-full justify-start'
                    disabled={pending}
                    onClick={() => (confirmArchive ? void setArchived(true) : setConfirmArchive(true))}
                    onBlur={() => setConfirmArchive(false)}
                  >
                    <Archive />
                    {confirmArchive ? 'Click again to archive' : 'Archive card'}
                  </Button>
                )}
              </div>
            )}
          </aside>
        </div>

        {(confirmClose || (canEdit && dirty)) && (
          <footer
            className={cn(
              'flex shrink-0 items-center gap-2 border-t border-border px-4 py-2.5 text-[13px]',
              confirmClose ? 'bg-amber-50' : 'bg-white'
            )}
          >
            {confirmClose ? (
              <>
                <span className='mr-auto'>Discard unsaved changes?</span>
                <Button variant='ghost' size='sm' onClick={() => setConfirmClose(false)}>
                  Keep editing
                </Button>
                <Button variant='destructive' size='sm' onClick={onClose}>
                  Discard
                </Button>
              </>
            ) : (
              <>
                <span className='mr-auto text-muted-foreground'>Unsaved changes</span>
                <Button variant='ghost' size='sm' disabled={saving} onClick={() => setDraft(toDraft(card))}>
                  Reset
                </Button>
                <SubmitButton
                  size='sm'
                  isPending={saving}
                  disabled={!draft.title.trim()}
                  aria-keyshortcuts='Meta+Enter Control+Enter'
                  onClick={() => void save()}
                >
                  Save
                  <kbd aria-hidden='true' className='inline-flex h-5 items-center gap-px rounded bg-white/20 px-1'>
                    <Command className='size-3' />
                    <CornerDownLeft className='size-3' />
                  </kbd>
                </SubmitButton>
              </>
            )}
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}
