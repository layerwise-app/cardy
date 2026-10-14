import {
  Archive,
  CalendarDays,
  ChartColumn,
  Copy,
  Ellipsis,
  Kanban,
  ListFilter,
  Rows3,
  Settings2,
  Share2,
  UserPlus,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';
import { useBoard } from './board-context';
import { PersonAvatar } from './cardy-ui';

export type BoardView = 'board' | 'list' | 'calendar' | 'insights';

const VIEWS: { value: BoardView; label: string; icon: typeof Kanban }[] = [
  { value: 'board', label: 'Board', icon: Kanban },
  { value: 'list', label: 'List', icon: Rows3 },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'insights', label: 'Insights', icon: ChartColumn },
];

export type BoardHeaderActions = {
  invite: () => void;
  share: () => void;
  settings: () => void;
  archivedCards: () => void;
  duplicate: () => void;
  archive: () => void;
};

export function BoardHeader({
  isDemo,
  view,
  onViewChange,
  filtersOpen,
  filterCount,
  onToggleFilters,
  actions,
}: {
  isDemo: boolean;
  view: BoardView;
  onViewChange: (view: BoardView) => void;
  filtersOpen: boolean;
  filterCount: number;
  onToggleFilters: () => void;
  actions: BoardHeaderActions;
}) {
  const { data, pending } = useBoard();
  const owner = data.role === 'owner';
  const badge = isDemo
    ? 'Sample'
    : data.board.archived
      ? 'Archived'
      : data.board.visibility === 'public'
        ? 'Public'
        : 'Private';
  return (
    <div className='shrink-0 border-b border-border'>
      <div className='flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-3 sm:px-6'>
        <div className='flex min-w-0 items-center gap-2'>
          <h1 className='truncate text-[17px] font-semibold tracking-tight'>{data.board.name}</h1>
          <span
            className={cn(
              'rounded-full border px-2 py-px font-mono text-[10px] tracking-wide uppercase',
              badge === 'Sample' ? 'border-primary/25 bg-tint text-primary' : 'border-border text-muted-foreground'
            )}
          >
            {badge}
          </span>
          {data.role && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon-sm' aria-label='Board actions'>
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-auto min-w-48'>
                <DropdownMenuItem disabled={data.board.archived || pending} onSelect={actions.duplicate}>
                  <Copy />
                  Duplicate board
                </DropdownMenuItem>
                {owner && (
                  <DropdownMenuItem disabled={data.board.archived} onSelect={actions.settings}>
                    <Settings2 />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={actions.archivedCards}>
                  <Archive />
                  Archived cards
                </DropdownMenuItem>
                {owner && !data.board.archived && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant='destructive' onSelect={actions.archive}>
                      <Archive />
                      Archive board
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {data.members.length > 0 && (
            <span className='hidden -space-x-1.5 sm:flex'>
              {data.members.slice(0, 4).map((member) => (
                <PersonAvatar key={member.id} name={member.name} />
              ))}
              {data.members.length > 4 && (
                <span className='grid size-6 place-items-center rounded-full bg-muted text-[10px] ring-2 ring-white'>
                  +{data.members.length - 4}
                </span>
              )}
            </span>
          )}
          <Button variant='outline' size='sm' onClick={actions.invite}>
            <UserPlus />
            Invite
          </Button>
          <Button variant='outline' size='sm' onClick={actions.share}>
            <Share2 />
            <span className='max-sm:sr-only'>Share</span>
          </Button>
        </div>
      </div>
      {data.board.description && (
        <p className='mt-0.5 truncate px-4 text-[13px] text-muted-foreground sm:px-6'>{data.board.description}</p>
      )}
      <div className='mt-2 flex items-end gap-2 px-4 sm:px-6'>
        <Tabs
          value={view}
          onValueChange={(value) => onViewChange(VIEWS.find((v) => v.value === value)?.value ?? 'board')}
          className='min-w-0'
        >
          <TabsList variant='line' className='thin-scrollbar h-9 max-w-full gap-3 overflow-x-auto p-0'>
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className='flex-none px-0.5 text-[13px] group-data-horizontal/tabs:after:bottom-[-1px] group-data-[variant=line]/tabs-list:data-active:after:bg-primary'
              >
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className='mb-1.5 ml-auto flex h-8 items-center gap-1'>
          {view !== 'insights' && (
            <Button
              variant={filtersOpen || filterCount ? 'secondary' : 'ghost'}
              size='sm'
              aria-expanded={filtersOpen}
              onClick={onToggleFilters}
            >
              <ListFilter />
              <span className='max-sm:sr-only'>Filter</span>
              {filterCount > 0 && (
                <span className='grid size-4 place-items-center rounded-full bg-primary text-[10px] text-white'>
                  {filterCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
