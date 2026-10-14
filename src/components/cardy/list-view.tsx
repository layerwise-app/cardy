import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  isOverdue,
  sortCards,
  type SortDirection,
  type SortKey,
} from '~/lib/cardy.board';
import type { Card } from '~/lib/cardy.types';
import { memberName, useBoard } from './board-context';
import {
  DueChip,
  LabelChip,
  PersonAvatar,
  PriorityIcon,
  StatusIcon,
} from './cardy-ui';

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'priority', label: 'Priority', className: 'w-10' },
  { key: 'title', label: 'Title', className: 'min-w-64' },
  { key: 'list', label: 'Status', className: 'w-36' },
  { key: 'due', label: 'Due', className: 'w-24' },
  { key: 'assignees', label: 'Assignees', className: 'w-28' },
];

export function ListView({
  cards,
  empty,
}: {
  cards: Card[];
  empty: string;
}) {
  const { data, today, doneId, openCard } = useBoard();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'list',
    direction: 'asc',
  });
  const sorted = sortCards(cards, data.lists, sort.key, sort.direction);

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  }

  if (!cards.length)
    return (
      <p className='mx-4 my-6 rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-muted-foreground sm:mx-6'>
        {empty}
      </p>
    );

  return (
    <div className='thin-scrollbar -mt-1 overflow-x-auto pt-1'>
      <table className='w-full min-w-[720px] border-separate border-spacing-0 text-[13px]'>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope='col'
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className={cn(
                  'sticky top-0 z-10 border-b border-border bg-background px-2 py-0 text-left font-normal first:pl-4 sm:first:pl-6',
                  column.className
                )}
              >
                <button
                  type='button'
                  onClick={() => toggle(column.key)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground',
                    sort.key === column.key && 'text-foreground'
                  )}
                >
                  {column.key === 'priority' ? (
                    <>
                      <PriorityIcon priority='high' className='opacity-60' />
                      <span className='sr-only'>{column.label}</span>
                    </>
                  ) : (
                    column.label
                  )}
                  {sort.key === column.key &&
                    (sort.direction === 'asc' ? (
                      <ArrowUp className='size-3' />
                    ) : (
                      <ArrowDown className='size-3' />
                    ))}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => {
            const listIndex = data.lists.findIndex((l) => l.id === card.listId);
            const comments = data.comments.filter((c) => c.cardId === card.id).length;
            const checked = card.checklist.filter((item) => item.done).length;
            const done = card.listId === doneId;
            return (
              <tr
                key={card.id}
                onClick={() => openCard(card.id)}
                className='group cursor-pointer transition-colors hover:bg-muted/60'
              >
                <td className='border-b border-border py-2 pr-2 pl-4 sm:pl-6'>
                  <PriorityIcon priority={card.priority} />
                </td>
                <td className='border-b border-border px-2 py-2'>
                  <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                    <button
                      type='button'
                      onClick={(event) => {
                        event.stopPropagation();
                        openCard(card.id);
                      }}
                      className={cn(
                        'rounded text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                        done && 'text-muted-foreground'
                      )}
                    >
                      {card.title}
                    </button>
                    {card.labels.map((label) => (
                      <LabelChip key={label} name={label} />
                    ))}
                    {card.checklist.length > 0 && (
                      <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums'>
                        <CheckSquare className='size-3' />
                        {checked}/{card.checklist.length}
                      </span>
                    )}
                    {comments > 0 && (
                      <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums'>
                        <MessageSquare className='size-3' />
                        {comments}
                      </span>
                    )}
                  </div>
                </td>
                <td className='border-b border-border px-2 py-2'>
                  <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
                    <StatusIcon index={listIndex} total={data.lists.length} />
                    <span className='truncate'>{data.lists[listIndex]?.name}</span>
                  </span>
                </td>
                <td className='border-b border-border px-2 py-2'>
                  {card.dueDate ? (
                    <DueChip
                      date={card.dueDate}
                      overdue={isOverdue(card, today, doneId)}
                      done={done}
                      className='-ml-1.5'
                    />
                  ) : (
                    <span className='text-faint'>—</span>
                  )}
                </td>
                <td className='border-b border-border px-2 py-2'>
                  <span className='flex -space-x-0.5'>
                    {card.assignees.slice(0, 4).map((id) => (
                      <PersonAvatar key={id} name={memberName(data, id)} size='xs' />
                    ))}
                    {!card.assignees.length && <span className='text-faint'>—</span>}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
