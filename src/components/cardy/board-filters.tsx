import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  type CardFilters,
  type DueFilter,
} from '~/lib/cardy.board';
import { LABELS, PRIORITIES, PRIORITY_LABELS } from '~/lib/cardy.types';
import { useBoard } from './board-context';
import { PersonAvatar, PriorityIcon, labelDot } from './cardy-ui';

const DUE_OPTIONS: [DueFilter, string][] = [
  ['overdue', 'Overdue'],
  ['week', 'Due in 7 days'],
  ['dated', 'Has a date'],
  ['none', 'No date'],
];

export function BoardFilters({
  filters,
  onChange,
  matches,
  total,
}: {
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
  matches: number;
  total: number;
}) {
  const { data } = useBoard();
  const set = (patch: Partial<CardFilters>) => onChange({ ...filters, ...patch });
  const active = activeFilterCount(filters) > 0 || filters.search.trim() !== '';
  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6'>
      <Filter label='Label' value={filters.label} onChange={(label) => set({ label })} allLabel='Any label'>
        {LABELS.map((label) => (
          <SelectItem key={label.name} value={label.name}>
            <span className={cn('size-2 rounded-full', labelDot(label.name))} />
            {label.name}
          </SelectItem>
        ))}
      </Filter>
      <Filter label='Assignee' value={filters.assignee} onChange={(assignee) => set({ assignee })} allLabel='Anyone'>
        <SelectItem value='none'>Unassigned</SelectItem>
        {data.members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <PersonAvatar name={member.name} size='xs' className='ring-0' />
            {member.name}
          </SelectItem>
        ))}
      </Filter>
      <Filter
        label='Priority'
        value={filters.priority}
        onChange={(value) => set({ priority: PRIORITIES.find((p) => p === value) ?? 'all' })}
        allLabel='Any priority'
      >
        {PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            <PriorityIcon priority={priority} />
            {PRIORITY_LABELS[priority]}
          </SelectItem>
        ))}
      </Filter>
      <Filter
        label='Due'
        value={filters.due}
        onChange={(value) => set({ due: DUE_OPTIONS.find(([key]) => key === value)?.[0] ?? 'all' })}
        allLabel='Any date'
      >
        {DUE_OPTIONS.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </Filter>
      <span className='ml-auto font-mono text-[11px] text-muted-foreground tabular-nums'>
        {matches} / {total}
      </span>
      <Button variant='ghost' size='xs' disabled={!active} onClick={() => onChange(EMPTY_FILTERS)}>
        <X />
        Clear
      </Button>
    </div>
  );
}

function Filter({
  label,
  value,
  allLabel,
  onChange,
  children,
}: {
  label: string;
  value: string;
  allLabel: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const active = value !== 'all';
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size='sm'
        className={cn(
          'gap-1 rounded-full bg-white px-2.5 text-xs shadow-none data-[size=sm]:h-7',
          active && 'border-primary/40 bg-tint text-foreground'
        )}
      >
        <span className='text-muted-foreground'>{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position='popper' align='start'>
        <SelectItem value='all'>{allLabel}</SelectItem>
        <SelectSeparator />
        {children}
      </SelectContent>
    </Select>
  );
}
