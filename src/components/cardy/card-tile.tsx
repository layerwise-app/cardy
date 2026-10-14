import type { DragEvent } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CheckSquare,
  Ellipsis,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import { addDays, isOverdue } from '~/lib/cardy.board';
import { PRIORITIES, PRIORITY_LABELS, type Card } from '~/lib/cardy.types';
import { fire, memberName, useBoard } from './board-context';
import { DueChip, LabelChip, PersonAvatar, PriorityIcon } from './cardy-ui';

export function CardTile({
  card,
  index,
  listCards,
  dragging,
  onDragStart,
  onDragEnd,
  onDropBefore,
}: {
  card: Card;
  index: number;
  listCards: Card[];
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore?: (event: DragEvent) => void;
}) {
  const { data, pending, today, doneId, openCard } = useBoard();
  const comments = data.comments.filter((c) => c.cardId === card.id).length;
  const checked = card.checklist.filter((item) => item.done).length;
  const done = card.listId === doneId;
  const canDrag = data.canEdit && !pending;
  return (
    <article
      draggable={canDrag}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDropBefore && event.preventDefault()}
      onDrop={onDropBefore}
      className={cn(
        'group relative rounded-lg border border-border bg-white shadow-[0_1px_2px_rgb(23_21_31/0.04)] transition-[border-color,box-shadow,opacity] hover:border-input hover:shadow-[0_2px_8px_-2px_rgb(23_21_31/0.08)]',
        canDrag && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40'
      )}
    >
      <button
        type='button'
        onClick={() => openCard(card.id)}
        className='flex w-full flex-col gap-2 rounded-lg p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
      >
        <span className='flex items-start gap-2 pr-5'>
          <PriorityIcon priority={card.priority} className='mt-px' />
          <span
            className={cn(
              'line-clamp-3 text-[13px] leading-[1.35rem] font-medium text-foreground',
              done && 'text-muted-foreground'
            )}
          >
            {card.title}
          </span>
        </span>
        {card.labels.length > 0 && (
          <span className='flex flex-wrap gap-1'>
            {card.labels.map((label) => (
              <LabelChip key={label} name={label} />
            ))}
          </span>
        )}
        {(card.dueDate ||
          card.checklist.length > 0 ||
          comments > 0 ||
          card.assignees.length > 0) && (
          <span className='flex items-center gap-2 text-[11px] text-muted-foreground'>
            {card.dueDate && (
              <DueChip
                date={card.dueDate}
                overdue={isOverdue(card, today, doneId)}
                done={done}
                className='-ml-1.5'
              />
            )}
            {card.checklist.length > 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 tabular-nums',
                  checked === card.checklist.length && 'text-primary'
                )}
              >
                <CheckSquare className='size-3' />
                {checked}/{card.checklist.length}
              </span>
            )}
            {comments > 0 && (
              <span className='inline-flex items-center gap-1 tabular-nums'>
                <MessageSquare className='size-3' />
                {comments}
              </span>
            )}
            <span className='ml-auto flex -space-x-0.5'>
              {card.assignees.slice(0, 3).map((id) => (
                <PersonAvatar key={id} name={memberName(data, id)} size='xs' />
              ))}
            </span>
          </span>
        )}
      </button>
      {data.canEdit && (
        <CardMenu card={card} index={index} listCards={listCards} />
      )}
    </article>
  );
}

function CardMenu({
  card,
  index,
  listCards,
}: {
  card: Card;
  index: number;
  listCards: Card[];
}) {
  const { data, run, pending, today, openCard } = useBoard();
  const boardId = data.board.id;
  const move = (listId: string, position: number) =>
    fire(run({ type: 'card.move', boardId, cardId: card.id, listId, index: position }));
  const schedule = (dueDate: string | null) =>
    fire(run({ type: 'card.schedule', boardId, cardId: card.id, dueDate }));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={`Actions for ${card.title}`}
          className='absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 data-[state=open]:bg-muted data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100'
        >
          <Ellipsis className='size-4' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto min-w-48'>
        <DropdownMenuItem onSelect={() => openCard(card.id)}>
          Open card
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PriorityIcon priority={card.priority} />
            Priority
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='min-w-40'>
            <DropdownMenuRadioGroup
              value={card.priority}
              onValueChange={(value) => {
                const priority = PRIORITIES.find((p) => p === value);
                if (priority && priority !== card.priority)
                  fire(run({ type: 'card.prioritize', boardId, cardId: card.id, priority }));
              }}
            >
              {PRIORITIES.map((priority) => (
                <DropdownMenuRadioItem key={priority} value={priority} disabled={pending}>
                  <PriorityIcon priority={priority} />
                  {PRIORITY_LABELS[priority]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CalendarDays />
            Due date
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='min-w-40'>
            {today &&
              [
                ['Today', 0],
                ['Tomorrow', 1],
                ['In a week', 7],
              ].map(([label, days]) => (
                <DropdownMenuItem
                  key={label}
                  disabled={pending}
                  onSelect={() => schedule(addDays(today, Number(days)))}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem
              disabled={pending || !card.dueDate}
              onSelect={() => schedule(null)}
            >
              Clear date
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRight />
            Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='min-w-40'>
            {data.lists.map((list) => (
              <DropdownMenuItem
                key={list.id}
                disabled={pending || list.id === card.listId}
                onSelect={() =>
                  move(
                    list.id,
                    data.cards.filter((c) => c.listId === list.id && !c.archived).length
                  )
                }
              >
                {list.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending || index === 0}
          onSelect={() => move(card.listId, index - 1)}
        >
          <ArrowUp />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending || index === listCards.length - 1}
          onSelect={() => move(card.listId, index + 1)}
        >
          <ArrowDown />
          Move down
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
