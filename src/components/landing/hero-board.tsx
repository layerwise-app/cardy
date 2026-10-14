import { Check } from 'lucide-react';
import { LabelChip, PersonAvatar, PriorityIcon, StatusIcon } from '~/components/cardy/cardy-ui';

const COLUMNS = [
  {
    name: 'To do',
    count: 3,
    cards: [
      { title: 'Audit pricing page copy', label: 'Marketing', date: 'Oct 28' },
      { title: 'Draft launch email', label: 'Marketing', date: 'Oct 30' },
    ],
  },
  { name: 'In progress', count: 2, cards: [{ title: 'Fix Safari drag preview', label: 'Bug', date: 'Oct 16' }] },
  {
    name: 'Done',
    count: 4,
    cards: [
      { title: 'Choose the type scale', label: 'Design', date: 'Oct 6' },
      { title: 'Set up analytics', label: 'Engineering', date: 'Oct 2' },
    ],
  },
];

const CHECKLIST = ['Wireframes', 'Copy review', 'Ship to staging'];

// Decorative product loop; the keyframes live in landing.css and stop under reduced motion.
export function HeroBoard() {
  return (
    <div
      aria-hidden='true'
      className='hb overflow-hidden rounded-2xl border border-border bg-white text-left shadow-[0_24px_60px_-24px_rgb(40_24_120/0.28)] select-none'
    >
      <div className='flex h-10 items-center gap-2 border-b border-border px-4 text-[12px]'>
        <span className='size-2 rounded-[3px] bg-primary' />
        <span className='font-medium'>Website relaunch</span>
        <span className='ml-3 flex items-center gap-3 text-muted-foreground'>
          <span className='relative font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-[13px] after:h-0.5 after:bg-primary'>
            Board
          </span>
          <span>List</span>
          <span>Calendar</span>
        </span>
        <span className='ml-auto flex -space-x-0.5'>
          <PersonAvatar name='Maya Chen' size='xs' />
          <PersonAvatar name='Leo Park' size='xs' />
          <PersonAvatar name='Ana Ruiz' size='xs' />
        </span>
      </div>
      <div className='bg-[#f7f6fb] p-3'>
        <div className='hb-cols'>
          {COLUMNS.map((column, index) => (
            <div key={column.name} className='hb-col flex flex-col gap-2'>
              <div className='flex h-[26px] items-center gap-1.5 px-1 text-[12px]'>
                <StatusIcon index={index} total={3} />
                <span className='font-semibold'>{column.name}</span>
                <span className='text-faint'>{column.count}</span>
              </div>
              <div className='hb-slot' />
              {column.cards.map((card) => (
                <MiniCard key={card.title} {...card} done={index === 2} />
              ))}
            </div>
          ))}
          <MovingCard />
        </div>
      </div>
    </div>
  );
}

function MiniCard({ title, label, date, done }: { title: string; label: string; date: string; done: boolean }) {
  return (
    <div className='flex flex-col gap-2 rounded-[10px] border border-border bg-white p-2.5 shadow-[0_1px_2px_rgb(23_21_31/0.05)]'>
      <span className={done ? 'text-[12px] font-medium text-muted-foreground' : 'text-[12px] font-medium'}>
        {title}
      </span>
      <span className='flex items-center gap-1.5'>
        <LabelChip name={label} className='h-[18px] px-1.5 text-[10px]' />
        <span className={done ? 'text-[10px] text-faint line-through' : 'text-[10px] text-muted-foreground'}>
          {date}
        </span>
      </span>
    </div>
  );
}

function MovingCard() {
  return (
    <div className='hb-mover z-10 flex flex-col gap-2 rounded-[10px] border border-primary/25 bg-white p-2.5'>
      <span className='flex items-start gap-1.5'>
        <PriorityIcon priority='high' className='mt-px size-3.5' />
        <span className='text-[12px] leading-tight font-semibold'>Launch the homepage</span>
      </span>
      <div className='flex gap-2'>
        <div className='flex flex-col gap-1.5'>
          {CHECKLIST.map((item) => (
            <span
              key={item}
              className='hb-check grid size-3.5 place-items-center rounded-[4px] border border-primary bg-primary'
            >
              <Check className='size-2.5 text-white' strokeWidth={3.5} />
            </span>
          ))}
        </div>
        <div className='flex flex-col gap-1.5 text-[11px] leading-[14px] text-muted-foreground'>
          {CHECKLIST.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <span className='h-1 overflow-hidden rounded-full bg-muted'>
        <span className='hb-progress block h-full origin-left rounded-full bg-primary' />
      </span>
      <span className='mt-auto flex items-center gap-1.5'>
        <LabelChip name='Design' className='h-[18px] px-1.5 text-[10px]' />
        <span className='text-[10px] text-muted-foreground'>Oct 20</span>
        <PersonAvatar name='Maya Chen' size='xs' className='hb-avatar ml-auto' />
      </span>
      <span className='hb-done-badge absolute -top-2 -right-2 flex h-5 items-center gap-1 rounded-full bg-primary px-2 text-[10px] font-semibold text-white opacity-0 shadow-sm'>
        <Check className='size-3' strokeWidth={3} />
        Done
      </span>
      <svg viewBox='0 0 16 16' className='hb-cursor absolute -right-1.5 -bottom-2 size-5 opacity-0 drop-shadow'>
        <path d='M2 1.5l11 5.2-4.6 1.3-1.9 4.5z' fill='#17151F' stroke='#fff' strokeWidth='1.2' strokeLinejoin='round' />
      </svg>
    </div>
  );
}
