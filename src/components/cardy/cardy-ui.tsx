import type { ComponentProps, ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { formatDay } from '~/lib/cardy.board';
import {
  LABELS,
  PRIORITY_LABELS,
  type LabelColor,
  type Priority,
} from '~/lib/cardy.types';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 32 32'
      aria-hidden='true'
      className={cn('size-6 shrink-0', className)}
    >
      <rect width='32' height='32' rx='8' fill='#6C47FF' />
      <rect x='11' y='6' width='10' height='5' rx='1.5' fill='#fff' fillOpacity='.38' />
      <rect x='9' y='9' width='14' height='5' rx='2' fill='#fff' fillOpacity='.66' />
      <rect x='7' y='12' width='18' height='14' rx='3' fill='#fff' />
      <rect x='10.5' y='16' width='8' height='2' rx='1' fill='#6C47FF' />
      <rect x='10.5' y='20' width='5' height='2' rx='1' fill='#C9BCFF' />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground',
        className
      )}
    >
      <LogoMark />
      Cardy
    </span>
  );
}

const AVATAR_TONES = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-800',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function PersonAvatar({
  name,
  size = 'sm',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  // Hashing the name keeps a person's color stable across views.
  const tone =
    AVATAR_TONES[
      [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        AVATAR_TONES.length
    ];
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-white select-none',
        size === 'xs' && 'size-5 text-[9px]',
        size === 'sm' && 'size-6 text-[10px]',
        size === 'md' && 'size-8 text-xs',
        tone,
        className
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}

export const LABEL_DOT: Record<LabelColor, string> = {
  purple: 'bg-violet-500',
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
};

export function labelDot(name: string) {
  const color = LABELS.find((label) => label.name === name)?.color;
  return color ? LABEL_DOT[color] : 'bg-faint';
}

export function LabelChip({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-full border border-border bg-white px-2 text-[11px] font-medium text-foreground/75',
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', labelDot(name))} />
      {name}
    </span>
  );
}

export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const label = PRIORITY_LABELS[priority];
  if (priority === 'urgent')
    return (
      <svg
        viewBox='0 0 16 16'
        role='img'
        aria-label={label}
        className={cn('size-4 shrink-0', className)}
      >
        <title>{label}</title>
        <rect x='1.5' y='1.5' width='13' height='13' rx='3.5' fill='#E5484D' />
        <rect x='7.1' y='4' width='1.8' height='5.2' rx='.9' fill='#fff' />
        <circle cx='8' cy='11.4' r='1' fill='#fff' />
      </svg>
    );
  const filled = { high: 3, medium: 2, low: 1, none: 0 }[priority];
  return (
    <svg
      viewBox='0 0 16 16'
      role='img'
      aria-label={label}
      className={cn('size-4 shrink-0 text-foreground/70', className)}
    >
      <title>{label}</title>
      {priority === 'none'
        ? [2.5, 6.75, 11].map((x) => (
            <rect key={x} x={x} y='7.25' width='2.5' height='1.5' rx='.75' fill='currentColor' opacity='.45' />
          ))
        : [0, 1, 2].map((bar) => (
            <rect
              key={bar}
              x={2 + bar * 4.5}
              y={10 - bar * 3.5}
              width='3'
              height={4 + bar * 3.5}
              rx='1'
              fill='currentColor'
              opacity={bar < filled ? 1 : 0.22}
            />
          ))}
    </svg>
  );
}

// Workflow progress by list position: open circle, partial pie, then a check.
export function StatusIcon({
  index,
  total,
  className,
}: {
  index: number;
  total: number;
  className?: string;
}) {
  const done = total > 1 && index === total - 1;
  const progress = total > 1 ? index / (total - 1) : 0;
  return (
    <svg
      viewBox='0 0 14 14'
      aria-hidden='true'
      className={cn('size-3.5 shrink-0', className)}
    >
      {done ? (
        <>
          <circle cx='7' cy='7' r='6.25' fill='#6C47FF' />
          <path
            d='M4.4 7.2l1.8 1.8 3.4-3.7'
            fill='none'
            stroke='#fff'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </>
      ) : index === 0 ? (
        <circle
          cx='7'
          cy='7'
          r='5.75'
          fill='none'
          stroke='#9A96A8'
          strokeWidth='1.5'
          strokeDasharray='2.2 1.8'
        />
      ) : (
        <>
          <circle cx='7' cy='7' r='5.75' fill='none' stroke='#E8A13A' strokeWidth='1.5' />
          <circle
            cx='7'
            cy='7'
            r='2.5'
            fill='none'
            stroke='#E8A13A'
            strokeWidth='5'
            strokeDasharray={`${(progress * 15.71).toFixed(2)} 15.71`}
            transform='rotate(-90 7 7)'
          />
        </>
      )}
    </svg>
  );
}

export function DueChip({
  date,
  overdue,
  done,
  className,
}: {
  date: string;
  overdue?: boolean;
  done?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium tabular-nums',
        overdue
          ? 'bg-red-50 text-red-600'
          : done
            ? 'text-faint line-through'
            : 'text-muted-foreground',
        className
      )}
    >
      <CalendarDays className='size-3' />
      {formatDay(date)}
    </span>
  );
}

// Async actions keep a stable label and swap the icon for a spinner while pending.
export function SubmitButton({
  isPending,
  icon,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { isPending: boolean; icon?: ReactNode }) {
  return (
    <Button disabled={disabled || isPending} aria-busy={isPending} {...props}>
      {isPending ? <Spinner /> : icon}
      {children}
    </Button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className='inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-white px-1 font-mono text-[10px] font-medium text-muted-foreground'>
      {children}
    </kbd>
  );
}
