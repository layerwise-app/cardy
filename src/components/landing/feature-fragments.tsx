import type { ReactNode } from 'react';
import { CalendarDays, Check, ChevronDown, Globe2, Link2, LockKeyhole } from 'lucide-react';
import { DueChip, Kbd, LabelChip, PersonAvatar, PriorityIcon, StatusIcon } from '~/components/cardy/cardy-ui';
import { cn } from '~/lib/utils';

// Static illustrations assembled from the app's own primitives. They are
// hidden from assistive tech and never look clickable.
export function Fragment({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      aria-hidden='true'
      className={cn(
        'lift rounded-2xl border border-border bg-white p-4 text-left shadow-[0_16px_40px_-24px_rgb(40_24_120/0.25)] select-none sm:p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[5px] border',
        checked ? 'border-primary bg-primary' : 'border-input bg-white'
      )}
    >
      {checked && <Check className='size-3 text-white' strokeWidth={3} />}
    </span>
  );
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex h-7 items-center gap-2 text-[12px]'>
      <span className='w-16 shrink-0 text-muted-foreground'>{label}</span>
      <span className='flex min-w-0 items-center gap-1.5'>{children}</span>
    </div>
  );
}

export function CardDetailFragment() {
  const checklist: [string, boolean][] = [
    ['Audit current header', true],
    ['Explore three layouts', true],
    ['Review with design', false],
    ['Build and ship', false],
  ];
  return (
    <Fragment className='flex flex-col gap-4 sm:flex-row sm:gap-6'>
      <div className='flex min-w-0 flex-1 flex-col gap-3'>
        <span className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          <StatusIcon index={1} total={3} />
          Website relaunch / In progress
        </span>
        <h3 className='text-[17px] font-semibold tracking-tight'>Redesign the board header</h3>
        <p className='text-[13px] leading-relaxed text-muted-foreground'>
          Tighten spacing and move view switching next to the title.
        </p>
        <div className='flex flex-col gap-2'>
          <span className='flex items-center justify-between text-[12px] font-medium'>
            Checklist
            <span className='font-mono text-[11px] text-faint'>2/4</span>
          </span>
          <span className='h-1 rounded-full bg-muted'>
            <span className='block h-full w-1/2 rounded-full bg-primary' />
          </span>
          {checklist.map(([item, done]) => (
            <span key={item} className='flex items-center gap-2 text-[13px]'>
              <Box checked={done} />
              <span className={done ? 'text-muted-foreground line-through' : ''}>{item}</span>
            </span>
          ))}
        </div>
        <div className='flex gap-2 border-t border-border pt-3'>
          <PersonAvatar name='Leo Park' />
          <span className='text-[12px]'>
            <span className='font-medium'>Leo Park</span> <span className='text-faint'>2h ago</span>
            <span className='mt-0.5 block text-muted-foreground'>Layout B reads best on mobile.</span>
          </span>
        </div>
      </div>
      <div className='flex flex-col gap-0.5 border-t border-border pt-3 sm:w-48 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5'>
        <Prop label='Status'>
          <StatusIcon index={1} total={3} />
          In progress
        </Prop>
        <Prop label='Priority'>
          <PriorityIcon priority='high' />
          High
        </Prop>
        <Prop label='Due'>
          <DueChip date='2026-10-16' className='px-0' />
        </Prop>
        <Prop label='Assignees'>
          <span className='flex -space-x-1.5'>
            <PersonAvatar name='Maya Chen' />
            <PersonAvatar name='Leo Park' />
          </span>
        </Prop>
        <Prop label='Labels'>
          <LabelChip name='Design' />
        </Prop>
      </div>
    </Fragment>
  );
}

const FILTER_ROWS = [
  { priority: 'urgent', title: 'Fix drag preview offset in Safari', list: 1, due: '2026-10-12', overdue: true },
  { priority: 'high', title: 'Redesign the board header', list: 1, due: '2026-10-16', overdue: false },
  { priority: 'medium', title: 'Mobile navigation pass', list: 2, due: '2026-10-14', overdue: false },
] as const;

function Pill({ label, value, active }: { label: string; value: ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border bg-white px-2.5 text-xs',
        active ? 'border-primary/40 bg-tint' : 'border-input'
      )}
    >
      <span className='text-muted-foreground'>{label}:</span>
      {value}
      <ChevronDown className='size-3 text-faint' />
    </span>
  );
}

export function FiltersFragment() {
  return (
    <Fragment className='flex flex-col gap-3 px-0 sm:px-0'>
      <div className='flex items-center gap-4 border-b border-border px-4 pb-2.5 text-[12px] text-muted-foreground sm:px-5'>
        <span className='relative font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-[11px] after:h-0.5 after:bg-primary'>
          List
        </span>
        <span>Board</span>
        <span>Calendar</span>
        <span className='max-sm:hidden'>Insights</span>
        <span className='ml-auto font-mono text-[11px] text-faint'>3 / 12</span>
      </div>
      <div className='flex flex-wrap gap-2 px-4 sm:px-5'>
        <Pill
          label='Assignee'
          active
          value={
            <>
              <PersonAvatar name='Maya Chen' size='xs' className='ring-0' />
              Maya
            </>
          }
        />
        <Pill label='Due' value='Due in 7 days' active />
        <Pill label='Priority' value='Any' />
      </div>
      <ul className='flex flex-col'>
        {FILTER_ROWS.map((row) => (
          <li
            key={row.title}
            className='flex h-11 items-center gap-3 border-t border-border px-4 text-[13px] first:border-t-0 sm:px-5'
          >
            <PriorityIcon priority={row.priority} />
            <span className='min-w-0 flex-1 truncate font-medium'>{row.title}</span>
            <span className='flex items-center gap-1.5 text-[12px] text-muted-foreground max-sm:hidden'>
              <StatusIcon index={row.list} total={4} />
              {row.list === 1 ? 'In progress' : 'In review'}
            </span>
            <DueChip date={row.due} overdue={row.overdue} />
            <PersonAvatar name='Maya Chen' size='xs' />
          </li>
        ))}
      </ul>
    </Fragment>
  );
}

export function SharingFragment() {
  const members = [
    ['Maya Chen', 'owner'],
    ['Leo Park', 'member'],
    ['Ana Ruiz', 'member'],
  ];
  return (
    <Fragment className='flex flex-col gap-4'>
      <div className='flex flex-col'>
        <span className='mb-1 text-[12px] font-medium'>Members</span>
        {members.map(([name, role]) => (
          <span key={name} className='flex h-9 items-center gap-2.5 text-[13px]'>
            <PersonAvatar name={name} />
            <span className='flex-1 font-medium'>{name}</span>
            <span className='font-mono text-[11px] text-faint capitalize'>{role}</span>
          </span>
        ))}
      </div>
      <div className='flex items-center gap-2 rounded-lg border border-primary/25 bg-tint p-1.5 pl-3 text-xs'>
        <Link2 className='size-4 shrink-0 text-primary' />
        <span className='min-w-0 flex-1 truncate font-mono text-muted-foreground'>/app?invite=7f3c2a91e4</span>
        <span className='shrink-0 rounded-md border border-border bg-white px-2 py-1 font-medium'>Copy</span>
      </div>
      <div className='grid gap-2 sm:grid-cols-2'>
        {(
          [
            [LockKeyhole, 'Private', 'Members only', false],
            [Globe2, 'Public', 'Anyone with the link can view', true],
          ] as const
        ).map(([Icon, title, hint, on]) => (
          <span
            key={title}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border p-3',
              on ? 'border-primary/40 bg-tint/60' : 'border-border'
            )}
          >
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
                on ? 'border-primary' : 'border-input'
              )}
            >
              {on && <span className='size-2 rounded-full bg-primary' />}
            </span>
            <span className='flex flex-col gap-0.5'>
              <span className='flex items-center gap-1.5 text-[13px] font-medium'>
                <Icon className='size-3.5' />
                {title}
              </span>
              <span className='text-[11px] text-muted-foreground'>{hint}</span>
            </span>
          </span>
        ))}
      </div>
    </Fragment>
  );
}

// Small visuals for the secondary feature tiles.
export function CalendarTile() {
  const pills: Record<number, string> = { 3: 'bg-primary/70', 9: 'bg-red-400', 11: 'bg-primary/70', 12: 'bg-amber-400', 16: 'bg-primary/40' };
  return (
    <div aria-hidden='true' className='grid grid-cols-7 gap-1'>
      {Array.from({ length: 21 }, (_, day) => (
        <span
          key={day}
          className={cn(
            'flex h-9 flex-col gap-1 rounded-md border border-border p-1 font-mono text-[9px] text-muted-foreground',
            day === 10 && 'border-primary bg-tint text-primary'
          )}
        >
          {day + 1}
          {pills[day] && <span className={cn('h-1.5 rounded-sm', pills[day])} />}
        </span>
      ))}
    </div>
  );
}

export function InsightsTile() {
  const bars: [string, number, string][] = [
    ['Backlog', 72, 'bg-faint/50'],
    ['In progress', 48, 'bg-amber-400'],
    ['Done', 90, 'bg-primary'],
  ];
  return (
    <div aria-hidden='true' className='flex flex-col gap-2.5'>
      <div className='flex gap-4'>
        <span className='flex flex-col'>
          <span className='text-xl font-semibold tabular-nums'>14</span>
          <span className='text-[11px] text-muted-foreground'>Open</span>
        </span>
        <span className='flex flex-col'>
          <span className='text-xl font-semibold text-red-600 tabular-nums'>2</span>
          <span className='text-[11px] text-muted-foreground'>Overdue</span>
        </span>
        <span className='flex flex-col'>
          <span className='flex items-center gap-1 text-xl font-semibold tabular-nums'>
            <CalendarDays className='size-4 text-faint' />5
          </span>
          <span className='text-[11px] text-muted-foreground'>This week</span>
        </span>
      </div>
      {bars.map(([label, width, tone]) => (
        <span key={label} className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='w-16 shrink-0'>{label}</span>
          <span className='h-1.5 flex-1 rounded-full bg-muted'>
            <span className={cn('block h-full rounded-full', tone)} style={{ width: `${width}%` }} />
          </span>
        </span>
      ))}
    </div>
  );
}

export function ShortcutsTile() {
  const keys: [string, string][] = [
    ['/', 'Search'],
    ['N', 'New card'],
    ['?', 'All shortcuts'],
    ['Esc', 'Close'],
  ];
  return (
    <div aria-hidden='true' className='grid grid-cols-2 gap-2'>
      {keys.map(([key, label]) => (
        <span key={key} className='flex h-9 items-center gap-2 rounded-md border border-border px-2 text-[12px]'>
          <Kbd>{key}</Kbd>
          {label}
        </span>
      ))}
    </div>
  );
}
