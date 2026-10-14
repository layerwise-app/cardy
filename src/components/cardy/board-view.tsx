import { useState } from 'react';
import { ArrowLeft, ArrowRight, Ellipsis, Pencil, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import type { BoardList, Card } from '~/lib/cardy.types';
import { fire, useBoard } from './board-context';
import { CardTile } from './card-tile';
import { StatusIcon, SubmitButton } from './cardy-ui';

type Dragging = { type: 'card' | 'list'; id: string } | null;

export function BoardView({
  cards,
  visible,
  filtered,
  composerList,
  setComposerList,
  onAddList,
}: {
  cards: Card[];
  visible: Card[];
  filtered: boolean;
  composerList: string | null;
  setComposerList: (listId: string | null) => void;
  onAddList: () => void;
}) {
  const { data, run, pending } = useBoard();
  const [dragging, setDragging] = useState<Dragging>(null);
  const [dropList, setDropList] = useState<string | null>(null);

  async function dropOn(listId: string, position?: number) {
    if (!dragging || !data.canEdit || pending) return;
    const current = dragging;
    setDragging(null);
    setDropList(null);
    if (current.type === 'card')
      fire(
        run({
          type: 'card.move',
          boardId: data.board.id,
          cardId: current.id,
          listId,
          index:
            position ??
            cards.filter((c) => c.listId === listId && c.id !== current.id).length,
        })
      );
    else if (current.id !== listId)
      fire(
        run({
          type: 'list.move',
          boardId: data.board.id,
          listId: current.id,
          index: data.lists.findIndex((l) => l.id === listId),
        })
      );
  }
  const endDrag = () => {
    setDragging(null);
    setDropList(null);
  };

  return (
    <div className='thin-scrollbar min-h-0 flex-1 overflow-x-auto overflow-y-hidden'>
      <div className='flex h-full items-start gap-3 px-4 py-4 sm:px-6'>
        {data.lists.map((list, index) => {
          const listCards = cards.filter((c) => c.listId === list.id);
          const shown = visible.filter((c) => c.listId === list.id);
          return (
            <section
              key={list.id}
              aria-label={list.name}
              onDragOver={(event) => {
                if (!data.canEdit || !dragging) return;
                event.preventDefault();
                setDropList(list.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void dropOn(list.id);
              }}
              className={cn(
                'flex max-h-full w-[272px] shrink-0 flex-col rounded-xl bg-muted/70 transition-colors',
                dropList === list.id && 'bg-tint ring-1 ring-primary/30'
              )}
            >
              <ColumnHeader
                list={list}
                index={index}
                count={listCards.length}
                onAdd={() => setComposerList(list.id)}
                onDragStart={() => setDragging({ type: 'list', id: list.id })}
                onDragEnd={endDrag}
              />
              <div className='thin-scrollbar flex min-h-0 flex-col gap-2 overflow-y-auto px-2 pb-2'>
                {shown.map((card) => {
                  const position = listCards.findIndex((c) => c.id === card.id);
                  return (
                    <CardTile
                      key={card.id}
                      card={card}
                      index={position}
                      listCards={listCards}
                      dragging={dragging?.id === card.id}
                      onDragStart={() => setDragging({ type: 'card', id: card.id })}
                      onDragEnd={endDrag}
                      onDropBefore={
                        dragging?.type === 'card' && dragging.id !== card.id
                          ? (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void dropOn(list.id, position);
                            }
                          : undefined
                      }
                    />
                  );
                })}
                {!shown.length && composerList !== list.id && (
                  <p className='rounded-lg border border-dashed border-input px-3 py-5 text-center text-xs text-faint'>
                    {filtered ? 'No matching cards' : 'No cards'}
                  </p>
                )}
                {composerList === list.id ? (
                  <Composer listId={list.id} onClose={() => setComposerList(null)} />
                ) : (
                  data.canEdit && (
                    <button
                      type='button'
                      onClick={() => setComposerList(list.id)}
                      className='flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-white hover:text-foreground'
                    >
                      <Plus className='size-3.5' />
                      Add card
                    </button>
                  )
                )}
              </div>
            </section>
          );
        })}
        {data.canEdit && (
          <button
            type='button'
            onClick={onAddList}
            className='flex h-10 w-[272px] shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-input px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-tint/50 hover:text-foreground'
          >
            <Plus className='size-3.5' />
            Add list
          </button>
        )}
      </div>
    </div>
  );
}

function ColumnHeader({
  list,
  index,
  count,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  list: BoardList;
  index: number;
  count: number;
  onAdd: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { data, run, pending, ask } = useBoard();
  const move = (to: number) =>
    fire(run({ type: 'list.move', boardId: data.board.id, listId: list.id, index: to }));
  return (
    <header className='flex h-10 shrink-0 items-center gap-2 pr-1.5 pl-3'>
      <StatusIcon index={index} total={data.lists.length} />
      <h2
        draggable={data.canEdit && !pending}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', list.id);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className={cn(
          'truncate text-[13px] font-semibold',
          data.canEdit && 'cursor-grab active:cursor-grabbing'
        )}
      >
        {list.name}
      </h2>
      <span className='text-xs text-faint tabular-nums'>{count}</span>
      {data.canEdit && (
        <span className='ml-auto flex items-center'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon-xs' aria-label={`Actions for ${list.name}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-auto min-w-40'>
              <DropdownMenuItem
                onSelect={() =>
                  ask({
                    title: 'Rename list',
                    label: 'List name',
                    value: list.name,
                    submitLabel: 'Rename',
                    action: (name) =>
                      run({ type: 'list.rename', boardId: data.board.id, listId: list.id, name }),
                  })
                }
              >
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem disabled={pending || index === 0} onSelect={() => move(index - 1)}>
                <ArrowLeft />
                Move left
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending || index === data.lists.length - 1}
                onSelect={() => move(index + 1)}
              >
                <ArrowRight />
                Move right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant='ghost' size='icon-xs' aria-label={`Add card to ${list.name}`} onClick={onAdd}>
            <Plus />
          </Button>
        </span>
      )}
    </header>
  );
}

function Composer({ listId, onClose }: { listId: string; onClose: () => void }) {
  const { data, run } = useBoard();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    const value = title.trim();
    if (!value || saving) return;
    setSaving(true);
    // Clear right away so the next title can be typed while this one saves.
    setTitle('');
    try {
      await run({ type: 'card.create', boardId: data.board.id, listId, title: value });
    } catch {
      /* The title comes back for a retry unless a new one was typed; the error is toasted. */
      setTitle((current) => current || value);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className='rounded-lg border border-primary/40 bg-white p-2 shadow-[0_0_0_3px_rgb(108_71_255/0.12)]'
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Textarea
        autoFocus
        aria-label='Card title'
        placeholder='Card title'
        maxLength={300}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void submit();
          }
          if (event.key === 'Escape') onClose();
        }}
        className='min-h-12 resize-none border-0 p-1 text-[13px] shadow-none focus-visible:ring-0 md:text-[13px]'
      />
      <div className='mt-1 flex items-center justify-end gap-1'>
        <Button type='button' variant='ghost' size='sm' onClick={onClose}>
          Cancel
        </Button>
        <SubmitButton type='submit' size='sm' isPending={saving} disabled={!title.trim()}>
          Add card
        </SubmitButton>
      </div>
    </form>
  );
}
