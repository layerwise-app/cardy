import { useState, type DragEvent, type HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import {
  cardsByDate,
  formatDay,
  isOverdue,
  monthGrid,
  shiftMonth,
} from '~/lib/cardy.board';
import type { Card } from '~/lib/cardy.types';
import { fire, useBoard } from './board-context';
import { PriorityIcon } from './cardy-ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const VISIBLE_PER_DAY = 3;

export function CalendarView({ cards }: { cards: Card[] }) {
  const { data, run, pending, today } = useBoard();
  // Null follows the current month until the user navigates away.
  const [picked, setPicked] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const month = picked ?? today.slice(0, 7);
  if (!month) return null;

  const weeks = monthGrid(month);
  const byDate = cardsByDate(cards);
  const undated = cards.filter((card) => !card.dueDate);
  const [year, monthNumber] = month.split('-').map(Number);
  const canDrag = data.canEdit && !pending;

  function drop(day: string | null) {
    const card = cards.find((c) => c.id === dragId);
    setDragId(null);
    setOverDay(null);
    if (!card || !canDrag || card.dueDate === day) return;
    fire(run({ type: 'card.schedule', boardId: data.board.id, cardId: card.id, dueDate: day }));
  }
  const dragProps = (card: Card) => ({
    draggable: canDrag,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.id);
      setDragId(card.id);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverDay(null);
    },
  });
  const dropProps = (day: string | null) => ({
    onDragOver: (event: DragEvent) => {
      if (!dragId) return;
      event.preventDefault();
      setOverDay(day ?? 'none');
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      drop(day);
    },
  });

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-6'>
      <div className='flex items-center gap-2'>
        <h2 className='text-[15px] font-semibold tracking-tight'>
          {MONTHS[monthNumber - 1]} <span className='text-muted-foreground'>{year}</span>
        </h2>
        <div className='ml-auto flex items-center gap-1'>
          <Button
            variant='outline'
            size='sm'
            disabled={month === today.slice(0, 7)}
            onClick={() => setPicked(null)}
          >
            Today
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Previous month'
            onClick={() => setPicked(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Next month'
            onClick={() => setPicked(shiftMonth(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 gap-4'>
        <div className='hidden min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white md:flex'>
          <div className='grid grid-cols-7 border-b border-border'>
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className='px-2 py-1.5 font-mono text-[10px] tracking-wide text-faint uppercase'
              >
                {day}
              </span>
            ))}
          </div>
          <div
            className='thin-scrollbar grid min-h-0 flex-1 grid-cols-7 overflow-y-auto'
            style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(6.5rem, 1fr))` }}
          >
            {weeks.flat().map((day) => {
              const dayCards = byDate.get(day) ?? [];
              const outside = !day.startsWith(month);
              return (
                <div
                  key={day}
                  {...dropProps(day)}
                  className={cn(
                    'flex min-w-0 flex-col gap-1 border-r border-b border-border p-1.5 transition-colors [&:nth-child(7n)]:border-r-0',
                    outside && 'bg-muted/40',
                    overDay === day && 'bg-tint'
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 place-items-center rounded-full text-xs tabular-nums',
                      outside ? 'text-faint' : 'text-muted-foreground',
                      day === today && 'bg-primary font-semibold text-white'
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {dayCards.slice(0, VISIBLE_PER_DAY).map((card) => (
                    <CalendarPill key={card.id} card={card} {...dragProps(card)} />
                  ))}
                  {dayCards.length > VISIBLE_PER_DAY && (
                    <MoreCards day={day} cards={dayCards} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside
          {...dropProps(null)}
          className={cn(
            'hidden w-60 shrink-0 flex-col gap-2 rounded-xl border border-dashed border-input p-3 transition-colors lg:flex',
            overDay === 'none' && 'border-primary/40 bg-tint'
          )}
        >
          <h3 className='flex items-center justify-between text-xs font-medium text-muted-foreground'>
            No due date
            <span className='font-mono text-faint'>{undated.length}</span>
          </h3>
          <div className='thin-scrollbar -m-1 flex min-h-0 scroll-py-1 flex-col gap-1 overflow-y-auto p-1'>
            {undated.map((card) => (
              <CalendarPill key={card.id} card={card} {...dragProps(card)} />
            ))}
            {!undated.length && (
              <p className='py-4 text-center text-xs text-faint'>Every card has a date.</p>
            )}
          </div>
        </aside>

        <Agenda month={month} byDate={byDate} />
      </div>
    </div>
  );
}

function CalendarPill({
  card,
  className,
  ...props
}: { card: Card } & HTMLAttributes<HTMLButtonElement>) {
  const { today, doneId, openCard } = useBoard();
  const overdue = isOverdue(card, today, doneId);
  const done = card.listId === doneId;
  return (
    <button
      type='button'
      title={card.title}
      onClick={() => openCard(card.id)}
      {...props}
      className={cn(
        'flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 text-left text-[11.5px] font-medium transition-colors',
        overdue
          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-border bg-white text-foreground hover:border-input hover:bg-muted/50',
        done && 'text-faint line-through',
        props.draggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
    >
      <PriorityIcon priority={card.priority} className='size-3.5' />
      <span className='truncate'>{card.title}</span>
    </button>
  );
}

function MoreCards({ day, cards }: { day: string; cards: Card[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='h-5 rounded px-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          {cards.length - VISIBLE_PER_DAY} more
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 gap-1.5 p-2'>
        <p className='px-1 pb-1 text-xs font-medium text-muted-foreground'>{formatDay(day)}</p>
        {cards.map((card) => (
          <CalendarPill key={card.id} card={card} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Narrow screens get a day-by-day agenda instead of a cramped grid.
function Agenda({ month, byDate }: { month: string; byDate: Map<string, Card[]> }) {
  const { today } = useBoard();
  const days = [...byDate.keys()].filter((day) => day.startsWith(month)).sort();
  return (
    <div className='flex flex-1 flex-col gap-4 md:hidden'>
      {days.map((day) => (
        <section key={day} className='flex flex-col gap-1.5'>
          <h3
            className={cn(
              'text-xs font-medium text-muted-foreground',
              day === today && 'text-primary'
            )}
          >
            {formatDay(day)}
            {day === today && ' · Today'}
          </h3>
          {byDate.get(day)?.map((card) => (
            <CalendarPill key={card.id} card={card} className='h-9 text-[13px]' />
          ))}
        </section>
      ))}
      {!days.length && (
        <p className='rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-muted-foreground'>
          No cards due this month.
        </p>
      )}
    </div>
  );
}
