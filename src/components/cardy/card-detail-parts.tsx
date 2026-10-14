import { useState, type ReactNode } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { LABELS, type Card } from '~/lib/cardy.types';
import { useBoard } from './board-context';
import { PersonAvatar, SubmitButton, labelDot } from './cardy-ui';

type ChecklistItem = Card['checklist'][number];

export function ChecklistEditor({
  items,
  canEdit,
  onChange,
}: {
  items: ChecklistItem[];
  canEdit: boolean;
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [title, setTitle] = useState('');
  const done = items.filter((item) => item.done).length;
  if (!canEdit && !items.length) return null;
  return (
    <section className='flex flex-col gap-2'>
      <h3 className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
        Checklist
        {items.length > 0 && (
          <span className='font-mono text-faint tabular-nums'>
            {done}/{items.length}
          </span>
        )}
        {items.length > 0 && (
          <span className='ml-1 h-1 flex-1 overflow-hidden rounded-full bg-muted'>
            <span
              className='block h-full rounded-full bg-primary transition-[width] duration-300'
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </span>
        )}
      </h3>
      <ul className='flex flex-col'>
        {items.map((item) => (
          <li
            key={item.id}
            className='group -mx-2 flex min-h-8 items-center gap-2.5 rounded-md px-2 hover:bg-muted/50'
          >
            <Checkbox
              aria-label={`Complete ${item.title}`}
              checked={item.done}
              disabled={!canEdit}
              onCheckedChange={() =>
                onChange(items.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))
              }
            />
            <span
              className={cn(
                'flex-1 text-[13px]',
                item.done && 'text-muted-foreground line-through decoration-faint'
              )}
            >
              {item.title}
            </span>
            {canEdit && (
              <Button
                variant='ghost'
                size='icon-xs'
                aria-label={`Remove ${item.title}`}
                className='opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
                onClick={() => onChange(items.filter((x) => x.id !== item.id))}
              >
                <X />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          className='flex gap-2'
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || items.length >= 100) return;
            onChange([...items, { id: crypto.randomUUID(), title: title.trim(), done: false }]);
            setTitle('');
          }}
        >
          <Input
            aria-label='New checklist item'
            placeholder='Add an item'
            maxLength={300}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className='h-8 text-[13px] md:text-[13px]'
          />
          <Button
            type='submit'
            variant='outline'
            size='icon-sm'
            aria-label='Add checklist item'
            disabled={!title.trim() || items.length >= 100}
          >
            <Plus />
          </Button>
        </form>
      )}
    </section>
  );
}

export function Conversation({
  card,
  canEdit,
  comment,
  setComment,
}: {
  card: Card;
  canEdit: boolean;
  comment: string;
  setComment: (value: string) => void;
}) {
  const { data, run } = useBoard();
  const [posting, setPosting] = useState(false);
  const comments = data.comments.filter((entry) => entry.cardId === card.id);
  const history = data.history.filter((entry) => entry.cardId === card.id);
  async function post() {
    if (!comment.trim() || posting) return;
    setPosting(true);
    try {
      await run({ type: 'comment.create', boardId: data.board.id, cardId: card.id, body: comment });
      setComment('');
    } catch {
      /* The draft stays for a retry; the error is toasted. */
    } finally {
      setPosting(false);
    }
  }
  return (
    <Tabs defaultValue='comments' className='gap-3'>
      <TabsList className='h-8'>
        <TabsTrigger value='comments' className='px-3 text-[13px]'>
          Comments
          <span className='min-w-4 rounded-full bg-foreground/8 px-1 text-[11px] leading-4 tabular-nums'>
            {comments.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value='activity' className='px-3 text-[13px]'>
          Activity
        </TabsTrigger>
      </TabsList>
      <TabsContent value='comments' className='flex flex-col gap-4'>
        {comments.map((entry) => (
          <div key={entry.id} className='flex gap-2.5'>
            <PersonAvatar name={entry.author} />
            <div className='min-w-0 flex-1'>
              <p className='flex items-baseline gap-2 text-[13px]'>
                <strong className='font-medium'>{entry.author}</strong>
                <Time value={entry.createdAt} />
              </p>
              <p className='mt-0.5 text-[13px] whitespace-pre-wrap text-foreground/85'>
                {entry.body}
              </p>
            </div>
          </div>
        ))}
        {!comments.length && <p className='text-[13px] text-faint'>No comments yet.</p>}
        {canEdit && (
          <form
            className='flex flex-col gap-2 rounded-lg border border-input bg-white p-2 focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-primary/10'
            onSubmit={(event) => {
              event.preventDefault();
              void post();
            }}
          >
            <Textarea
              aria-label='Write a comment'
              placeholder='Write a comment'
              maxLength={5000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  event.stopPropagation();
                  void post();
                }
              }}
              className='min-h-14 resize-none border-0 p-1 text-[13px] shadow-none focus-visible:ring-0 md:text-[13px]'
            />
            <SubmitButton type='submit' size='sm' className='self-end' isPending={posting} disabled={!comment.trim()}>
              Comment
            </SubmitButton>
          </form>
        )}
      </TabsContent>
      <TabsContent value='activity'>
        <ol className='flex flex-col gap-2.5 border-l border-border pl-4'>
          {history.map((entry) => (
            <li key={entry.id} className='relative text-[13px] text-muted-foreground'>
              <span className='absolute top-1.5 -left-[19px] size-1.5 rounded-full bg-input' />
              <strong className='font-medium text-foreground'>{entry.author ?? 'Cardy'}</strong>{' '}
              {entry.message} <Time value={entry.createdAt} />
            </li>
          ))}
          {!history.length && <li className='text-[13px] text-faint'>No activity yet.</li>}
        </ol>
      </TabsContent>
    </Tabs>
  );
}

export function Time({ value }: { value: number }) {
  return (
    <time dateTime={new Date(value).toISOString()} className='font-mono text-[11px] text-faint'>
      {new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}
    </time>
  );
}

export function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-xs text-muted-foreground'>{label}</span>
      {children}
    </div>
  );
}

export function LabelPicker({
  value,
  canEdit,
  onChange,
}: {
  value: string[];
  canEdit: boolean;
  onChange: (labels: string[]) => void;
}) {
  const shown = canEdit ? LABELS.map((label) => label.name) : value;
  if (!shown.length) return <span className='text-[13px] text-faint'>None</span>;
  return (
    <div className='flex flex-wrap gap-1.5'>
      {shown.map((name) => {
        const selected = value.includes(name);
        return (
          <button
            key={name}
            type='button'
            disabled={!canEdit}
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((l) => l !== name) : [...value, name])
            }
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs transition-colors disabled:cursor-default',
              selected
                ? 'border-primary/30 bg-tint text-foreground'
                : 'border-border bg-white text-muted-foreground hover:border-input hover:text-foreground'
            )}
          >
            <span className={cn('size-1.5 rounded-full', labelDot(name))} />
            {name}
            {selected && canEdit && <Check className='size-3 text-primary' />}
          </button>
        );
      })}
    </div>
  );
}

export function AssigneePicker({
  value,
  canEdit,
  onChange,
}: {
  value: string[];
  canEdit: boolean;
  onChange: (assignees: string[]) => void;
}) {
  const { data } = useBoard();
  const members = canEdit ? data.members : data.members.filter((m) => value.includes(m.id));
  if (!members.length)
    return (
      <span className='text-[13px] text-faint'>
        {data.members.length ? 'Unassigned' : 'Members appear once a workspace exists.'}
      </span>
    );
  return (
    <div className='-mx-2 flex flex-col'>
      {members.map((member) => (
        <label
          key={member.id}
          className={cn(
            'flex h-8 items-center gap-2 rounded-md px-2 text-[13px]',
            canEdit && 'cursor-pointer hover:bg-muted/60'
          )}
        >
          {canEdit && (
            <Checkbox
              checked={value.includes(member.id)}
              onCheckedChange={() =>
                onChange(
                  value.includes(member.id)
                    ? value.filter((id) => id !== member.id)
                    : [...value, member.id]
                )
              }
            />
          )}
          <PersonAvatar name={member.name} size='xs' />
          <span className='truncate'>{member.name}</span>
        </label>
      ))}
    </div>
  );
}
