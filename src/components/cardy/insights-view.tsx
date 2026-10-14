import type { ReactNode } from 'react';
import { cn } from '~/lib/utils';
import { boardInsights } from '~/lib/cardy.board';
import { PRIORITIES, PRIORITY_LABELS, type Card } from '~/lib/cardy.types';
import { memberName, useBoard } from './board-context';
import { DueChip, PersonAvatar, PriorityIcon, StatusIcon } from './cardy-ui';

export function InsightsView({ cards }: { cards: Card[] }) {
  const { data, today, doneId } = useBoard();
  const insights = boardInsights(cards, data.lists, today);
  const checklistPercent = insights.checklist.total
    ? Math.round((insights.checklist.done / insights.checklist.total) * 100)
    : 0;
  const listMax = Math.max(1, ...insights.lists.map((list) => list.count));
  const priorityMax = Math.max(1, ...Object.values(insights.priorities));
  const workloadMax = Math.max(1, ...insights.workload.map((row) => row.open));

  return (
    <div className='thin-scrollbar min-h-0 flex-1 overflow-y-auto'>
      <div className='flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6'>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          <Stat label='Open' value={insights.open} detail={`of ${insights.total} cards`} />
          <Stat
            label='Overdue'
            value={insights.overdue.length}
            tone={insights.overdue.length ? 'danger' : undefined}
            detail={insights.overdue.length ? 'needs attention' : 'on track'}
          />
          <Stat label='Due in 7 days' value={insights.dueSoon.length} detail='open cards' />
          <Stat
            label='Checklists'
            value={`${checklistPercent}%`}
            detail={`${insights.checklist.done} of ${insights.checklist.total} items`}
          >
            <Bar value={checklistPercent} max={100} className='mt-3' />
          </Stat>
        </div>

        <div className='grid gap-3 lg:grid-cols-2'>
          <Panel title='Cards by list'>
            {insights.lists.map((list, index) => (
              <Row
                key={list.id}
                icon={<StatusIcon index={index} total={insights.lists.length} />}
                label={list.name}
                value={list.count}
              >
                <Bar value={list.count} max={listMax} />
              </Row>
            ))}
          </Panel>
          <Panel title='Open cards by priority'>
            {PRIORITIES.map((priority) => (
              <Row
                key={priority}
                icon={<PriorityIcon priority={priority} />}
                label={PRIORITY_LABELS[priority]}
                value={insights.priorities[priority]}
              >
                <Bar
                  value={insights.priorities[priority]}
                  max={priorityMax}
                  className={priority === 'urgent' ? '[&>span]:bg-red-500' : undefined}
                />
              </Row>
            ))}
          </Panel>
        </div>

        <div className='grid gap-3 lg:grid-cols-3'>
          <Panel title='Workload' className='lg:col-span-1'>
            {insights.workload.map((row) => (
              <Row
                key={row.assignee ?? 'none'}
                icon={
                  row.assignee ? (
                    <PersonAvatar name={memberName(data, row.assignee)} size='xs' />
                  ) : (
                    <span className='size-5 rounded-full border border-dashed border-faint' />
                  )
                }
                label={row.assignee ? memberName(data, row.assignee) : 'Unassigned'}
                value={row.open}
                note={row.overdue ? `${row.overdue} late` : undefined}
              >
                <Bar value={row.open} max={workloadMax} />
              </Row>
            ))}
            {!insights.workload.length && <Empty>No open cards.</Empty>}
          </Panel>
          <Panel title='Due in the next 7 days'>
            <CardRows cards={insights.dueSoon} empty='Nothing due this week.' />
          </Panel>
          <Panel title='Overdue'>
            <CardRows cards={insights.overdue} empty='Nothing overdue.' overdue />
          </Panel>
        </div>
        {!doneId && (
          <p className='text-xs text-muted-foreground'>
            Add a second list to track completed work. The last list counts as done.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
  children,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'danger';
  children?: ReactNode;
}) {
  return (
    <div className='rounded-xl border border-border bg-white p-4'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'danger' && 'text-red-600'
        )}
      >
        {value}
      </p>
      <p className='text-xs text-faint'>{detail}</p>
      {children}
    </div>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-white p-4', className)}>
      <h3 className='mb-3 text-[13px] font-semibold'>{title}</h3>
      <div className='flex flex-col gap-2.5'>{children}</div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  note,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className='grid grid-cols-[1.25rem_minmax(0,7rem)_1fr_auto] items-center gap-2 text-[13px]'>
      <span className='flex justify-center'>{icon}</span>
      <span className='truncate text-muted-foreground'>{label}</span>
      {children}
      <span className='min-w-6 text-right font-mono text-xs tabular-nums'>
        {value}
        {note && <span className='ml-1.5 text-red-600'>{note}</span>}
      </span>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <span
        className='block h-full rounded-full bg-primary transition-[width] duration-500'
        style={{ width: `${(value / max) * 100}%` }}
      />
    </span>
  );
}

function CardRows({
  cards,
  empty,
  overdue,
}: {
  cards: Card[];
  empty: string;
  overdue?: boolean;
}) {
  const { openCard } = useBoard();
  if (!cards.length) return <Empty>{empty}</Empty>;
  return (
    <ul className='-mx-2 flex flex-col'>
      {cards.map((card) => (
        <li key={card.id}>
          <button
            type='button'
            onClick={() => openCard(card.id)}
            className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60'
          >
            <PriorityIcon priority={card.priority} />
            <span className='min-w-0 flex-1 truncate'>{card.title}</span>
            {card.dueDate && <DueChip date={card.dueDate} overdue={overdue} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className='py-3 text-center text-xs text-faint'>{children}</p>;
}
