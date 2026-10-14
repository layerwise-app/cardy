import type { ReactNode } from 'react';
import {
  Activity,
  Archive,
  Check,
  ChevronsUpDown,
  CircleUser,
  Keyboard,
  Kanban,
  ListChecks,
  LockKeyhole,
  LogOut,
  Plus,
  Users,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet';
import type { ApplicationData } from '~/lib/cardy.functions';
import type { Board } from '~/lib/cardy.types';
import { cn } from '~/lib/utils';
import { Logo, PersonAvatar } from './cardy-ui';

export type Section = 'board' | 'tasks' | 'activity' | 'archive';
type Workspace = ApplicationData['workspaces'][number];

export type SidebarProps = {
  viewer: { name: string; email: string } | null;
  workspaces: Workspace[];
  workspaceName: string;
  selectedWorkspaceId?: string;
  boards: Board[];
  // Shown when the viewer has no boards of their own (sample or public board).
  fallbackBoard: { id: string; name: string } | null;
  boardId: string;
  section: Section;
  memberCount: number;
  onSection: (section: Section) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onMembers: () => void;
  onShortcuts: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
  ...props
}: SidebarProps & { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
  return (
    <>
      <aside className='hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex'>
        <SidebarBody {...props} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side='left' className='w-72 gap-0 bg-sidebar p-0 md:hidden' showCloseButton={false}>
          <SheetTitle className='sr-only'>Navigation</SheetTitle>
          <SheetDescription className='sr-only'>Workspaces, boards and account</SheetDescription>
          <SidebarBody
            {...props}
            onSection={(section) => {
              props.onSection(section);
              onMobileOpenChange(false);
            }}
            onSelectBoard={(boardId) => {
              props.onSelectBoard(boardId);
              onMobileOpenChange(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarBody({
  viewer,
  workspaces,
  workspaceName,
  selectedWorkspaceId,
  boards,
  fallbackBoard,
  boardId,
  section,
  memberCount,
  onSection,
  onSelectWorkspace,
  onCreateWorkspace,
  onSelectBoard,
  onCreateBoard,
  onMembers,
  onShortcuts,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const active = boards.filter((board) => !board.archived);
  const archivedCount = boards.length - active.length;
  return (
    <div className='flex h-full min-h-0 flex-col gap-4 p-3'>
      <a
        href='/'
        className='flex h-8 items-center rounded-md px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
      >
        <Logo />
      </a>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex h-9 w-full items-center gap-2 rounded-md border border-border bg-white px-2 text-left text-[13px] shadow-xs transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50'
          >
            <span className='grid size-5 shrink-0 place-items-center rounded bg-foreground text-[10px] font-semibold text-white uppercase'>
              {workspaceName.slice(0, 1)}
            </span>
            <span className='min-w-0 flex-1 truncate font-medium'>{workspaceName}</span>
            <ChevronsUpDown className='size-3.5 text-muted-foreground' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-(--radix-dropdown-menu-trigger-width) min-w-52'>
          {workspaces.length > 0 && (
            <>
              <DropdownMenuLabel className='text-xs text-muted-foreground'>Workspaces</DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem key={workspace.id} onSelect={() => onSelectWorkspace(workspace.id)}>
                  <span className='min-w-0 flex-1 truncate'>{workspace.name}</span>
                  {workspace.id === selectedWorkspaceId && <Check className='text-primary' />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={onCreateWorkspace}>
            <Plus />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav aria-label='Workspace' className='flex flex-col gap-px'>
        <NavItem icon={<Kanban />} active={section === 'board'} onClick={() => onSection('board')}>
          Board
        </NavItem>
        <NavItem icon={<ListChecks />} active={section === 'tasks'} onClick={() => onSection('tasks')}>
          My tasks
        </NavItem>
        <NavItem icon={<Activity />} active={section === 'activity'} onClick={() => onSection('activity')}>
          Activity
        </NavItem>
        <NavItem icon={<Users />} count={memberCount || undefined} onClick={onMembers}>
          Members
        </NavItem>
        <NavItem
          icon={<Archive />}
          count={archivedCount || undefined}
          active={section === 'archive'}
          onClick={() => onSection('archive')}
        >
          Archived
        </NavItem>
      </nav>

      <div className='flex min-h-0 flex-1 flex-col gap-1'>
        <div className='flex h-6 items-center justify-between pr-0.5 pl-2'>
          <h2 className='text-xs font-medium text-muted-foreground'>Boards</h2>
          <Button variant='ghost' size='icon-xs' aria-label='Create board' onClick={onCreateBoard}>
            <Plus />
          </Button>
        </div>
        <nav aria-label='Boards' className='thin-scrollbar -m-1 flex min-h-0 scroll-py-1 flex-col gap-px overflow-y-auto p-1'>
          {active.map((board) => (
            <BoardLink
              key={board.id}
              name={board.name}
              locked={board.visibility === 'private'}
              active={section === 'board' && board.id === boardId}
              onClick={() => onSelectBoard(board.id)}
            />
          ))}
          {!active.length && fallbackBoard && (
            <BoardLink
              name={fallbackBoard.name}
              active={section === 'board' && fallbackBoard.id === boardId}
              onClick={() => onSelectBoard(fallbackBoard.id)}
            />
          )}
        </nav>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='flex h-11 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50'
          >
            {viewer ? (
              <PersonAvatar name={viewer.name} size='md' className='ring-0' />
            ) : (
              <CircleUser className='size-7 text-faint' strokeWidth={1.5} />
            )}
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[13px] font-medium'>{viewer?.name ?? 'Guest'}</span>
              <span className='block truncate text-[11px] text-muted-foreground'>
                {viewer?.email ?? 'Not signed in'}
              </span>
            </span>
            <ChevronsUpDown className='size-3.5 text-muted-foreground' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='top' align='start' className='w-(--radix-dropdown-menu-trigger-width) min-w-52'>
          <DropdownMenuItem onSelect={onShortcuts}>
            <Keyboard />
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {viewer ? (
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={onSignIn}>
              <CircleUser />
              Sign in
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavItem({
  icon,
  active,
  count,
  onClick,
  children,
}: {
  icon: ReactNode;
  active?: boolean;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-4',
        active && 'bg-sidebar-accent font-medium text-foreground'
      )}
    >
      {icon}
      <span className='flex-1 text-left'>{children}</span>
      {count !== undefined && <span className='font-mono text-[11px] text-faint tabular-nums'>{count}</span>}
    </button>
  );
}

function BoardLink({
  name,
  locked,
  active,
  onClick,
}: {
  name: string;
  locked?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50',
        active && 'bg-white font-medium text-foreground shadow-xs ring-1 ring-border hover:bg-white'
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-[3px] bg-faint/60 transition-colors',
          active && 'bg-primary'
        )}
      />
      <span className='min-w-0 flex-1 truncate text-left'>{name}</span>
      {locked && <LockKeyhole className='size-3 text-faint' />}
    </button>
  );
}
