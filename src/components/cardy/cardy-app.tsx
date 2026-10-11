import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Ellipsis,
  FolderKanban,
  Globe2,
  GripVertical,
  LayoutGrid,
  List,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  CalendarDays,
  Circle,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  loadApplication,
  loadBoard,
  mutateCardy,
  type BoardData,
  type ApplicationData,
} from '~/lib/cardy.functions';
import { demoBoard } from '~/lib/cardy.demo';
import { LABELS, localDateKey, type Action, type Card } from '~/lib/cardy.types';
import { authClient, useSession } from '~/lib/auth-client';
import { useIsMobile } from '~/hooks/use-mobile';
import { AuthDialog, CardDetails, MembersDialog } from './cardy-dialogs';
import { Brand, Cover, IconButton, PersonAvatar } from './cardy-ui';
import { copyText, type RunAction } from './cardy-utils';

type Section = 'board' | 'tasks' | 'activity' | 'archive';
type Prompt = {
  title: string;
  description: string;
  label: string;
  value?: string;
  action: (value: string) => Promise<unknown>;
};

export function CardyApp({
  initialBoard,
  invitationToken,
}: {
  initialBoard?: string;
  invitationToken?: string;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useSession();
  const isMobile = useIsMobile();
  const application = useQuery({
    queryKey: ['cardy', 'application'],
    queryFn: ({ signal }) =>
      readRequest(signal, (requestSignal) =>
        loadApplication({ signal: requestSignal })
      ),
    enabled: typeof window !== 'undefined',
    networkMode: 'always',
    retry: false,
    staleTime: 30000,
  });
  const [boardId, setBoardId] = useState(initialBoard || demoBoard.board.id);
  const [workspaceId, setWorkspaceId] = useState('');
  const boardQuery = useQuery({
    queryKey: ['cardy', 'board', boardId],
    queryFn: ({ signal }) =>
      readRequest(signal, (requestSignal) =>
        loadBoard({ data: { boardId }, signal: requestSignal })
      ),
    enabled: Boolean(application.data),
    networkMode: 'always',
    retry: false,
  });
  const data =
    boardQuery.data ?? (boardId === demoBoard.board.id ? demoBoard : null);
  const viewer = application.data?.viewer ?? session.data?.user ?? null;
  const workspaces = application.data?.workspaces ?? [];
  const selectedWorkspace =
    workspaces.find((w) => w.id === (workspaceId || data?.board.workspaceId)) ??
    workspaces[0];
  const navigationWorkspaceName = selectedWorkspace?.name ?? data?.workspaceName ?? demoBoard.workspaceName;
  const boards = (application.data?.boards ?? []).filter(
    (b) => b.workspaceId === selectedWorkspace?.id
  );
  const [section, setSection] = useState<Section>('board');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [labelFilter, setLabelFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [cardId, setCardId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [archivedCardsOpen, setArchivedCardsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [dragging, setDragging] = useState<{
    type: 'card' | 'list';
    id: string;
  } | null>(null);
  const [dropList, setDropList] = useState<string | null>(null);
  const [addingList, setAddingList] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedCard = data?.cards.find((c) => c.id === cardId);
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: (action: Action) => mutateCardy({ data: action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cardy'] });
    },
    onError: (error) => toast.error(error.message),
  });
  const run: RunAction = async (action) => await mutation.mutateAsync(action);

  useEffect(() => {
    if (
      !initialBoard &&
      application.data?.boards.length &&
      boardId === demoBoard.board.id
    )
      setBoardId(
        application.data.boards.find((b) => !b.archived)?.id ??
          demoBoard.board.id
      );
  }, [application.data, initialBoard, boardId]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setSearch('');
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function selectBoard(nextId: string) {
    setBoardId(nextId);
    setSection('board');
    setCardId(null);
    setSearch('');
    setMobileOpen(false);
    setLabelFilter('');
    setAssigneeFilter('');
    setDueFilter('');
    void navigate({
      to: '/',
      search: { board: nextId, invite: invitationToken },
      replace: true,
    });
  }
  function requestEdit() {
    if (!viewer) setAuthOpen(true);
    else
      setPrompt({
        title: 'A space for your next big thing',
        description:
          'Create your workspace. You’ll get a private board, ready for your first idea.',
        label: 'Workspace name',
        value: `${viewer.name.split(' ')[0]}’s workspace`,
        action: async (name) => {
          const result = await run({ type: 'workspace.create', name });
          if (result.workspaceId) setWorkspaceId(result.workspaceId);
          if (result.id) selectBoard(result.id);
          toast.success('Your workspace is ready. Make yourself at home.');
        },
      });
  }
  function createBoard() {
    if (!selectedWorkspace) {
      requestEdit();
      return;
    }
    setPrompt({
      title: 'Make room for a new project',
      description: 'Start with a name. The big ideas can come next.',
      label: 'Board name',
      action: async (name) => {
        const result = await run({
          type: 'board.create',
          workspaceId: selectedWorkspace.id,
          name,
        });
        if (result.id) selectBoard(result.id);
        toast.success('Board created');
      },
    });
  }
  function newList() {
    if (data?.board.archived) {
      toast.info(
        'Restore this board from Archived boards before adding lists.'
      );
      setSection('archive');
      return;
    }
    if (!data?.canEdit) {
      requestEdit();
      return;
    }
    setPrompt({
      title: 'Add a list',
      description: 'Give your workflow a little more room.',
      label: 'List name',
      action: (name) => run({ type: 'list.create', boardId, name }),
    });
  }
  async function dropOn(listId: string, position?: number) {
    if (!dragging || !data?.canEdit || mutation.isPending) return;
    const current = dragging;
    setDragging(null);
    setDropList(null);
    try {
      if (current.type === 'card')
        await run({
          type: 'card.move',
          boardId,
          cardId: current.id,
          listId,
          index:
            position ??
            data.cards.filter(
              (c) => c.listId === listId && !c.archived && c.id !== current.id
            ).length,
        });
      else
        await run({
          type: 'list.move',
          boardId,
          listId: current.id,
          index: data.lists.findIndex((l) => l.id === listId),
        });
    } catch {
      /* Errors are shown by the mutation handler. */
    }
  }
  async function addCard(listId: string) {
    if (!cardTitle.trim() || mutation.isPending) return;
    try {
      await run({ type: 'card.create', boardId, listId, title: cardTitle });
      setCardTitle('');
      setAddingList(null);
    } catch {
      /* Keep the draft for retry. */
    }
  }
  const cards = data?.cards.filter((c) => !c.archived) ?? [];
  const today = localDateKey(new Date());
  const filtered = cards.filter((c) => {
    const matchesSearch =
      `${c.title} ${c.description} ${c.labels.join(' ')} ${c.checklist.map((x) => x.title).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const due =
      !dueFilter ||
      (dueFilter === 'none'
        ? !c.dueDate
        : dueFilter === 'overdue'
          ? Boolean(c.dueDate && c.dueDate < today)
          : Boolean(c.dueDate));
    return (
      matchesSearch &&
      (!labelFilter || c.labels.includes(labelFilter)) &&
      (!assigneeFilter || c.assignees.includes(assigneeFilter)) &&
      due
    );
  });
  const filterCount = [labelFilter, assigneeFilter, dueFilter].filter(
    Boolean
  ).length;
  const isDemo = boardId === demoBoard.board.id;

  return (
    <div className='cardy-shell' data-sync-state={application.status}>
      {mobileOpen && (
        <button
          className='sidebar-backdrop'
          aria-label='Close navigation'
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`cardy-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        inert={isMobile && !mobileOpen}
        aria-hidden={isMobile && !mobileOpen}
      >
        <div className='sidebar-brand-row'>
          <a href='/' aria-label='Cardy home'>
            <Brand />
          </a>
          <IconButton
            label='Close navigation'
            onClick={() => setMobileOpen(false)}
          >
            <PanelLeftClose size={17} />
          </IconButton>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='workspace-switch'>
              <span className='workspace-avatar'>
                {navigationWorkspaceName.slice(0, 1)}
              </span>
              <span>
                <strong>{navigationWorkspaceName}</strong>
                <small>
                  {selectedWorkspace
                    ? `${selectedWorkspace.role === 'owner' ? 'Your' : 'Team'} workspace`
                    : isDemo ? 'A little space to create' : 'Public workspace view'}
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='cardy-menu' align='start'>
            {workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onClick={() => {
                  setWorkspaceId(w.id);
                  const first = application.data?.boards.find(
                    (b) => b.workspaceId === w.id && !b.archived
                  );
                  if (first) selectBoard(first.id);
                }}
              >
                {w.name}
                {w.id === selectedWorkspace?.id && <Check size={14} />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={requestEdit}>
              <Plus /> Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className='sidebar-section-caption'>WORKSPACE</div>
        <nav className='primary-nav' aria-label='Workspace navigation'>
          <button
            className={section === 'board' ? 'nav-active' : ''}
            onClick={() => setSection('board')}
          >
            <LayoutGrid />
            Boards
            <span className='nav-count'>
              {boards.filter((b) => !b.archived).length || 1}
            </span>
          </button>
          <button
            className={section === 'tasks' ? 'nav-active' : ''}
            onClick={() => setSection('tasks')}
          >
            <CheckCheck />
            My tasks
          </button>
          <button
            className={section === 'activity' ? 'nav-active' : ''}
            onClick={() => setSection('activity')}
          >
            <Activity />
            Activity
          </button>
          <button
            onClick={() => (data?.role ? setMembersOpen(true) : requestEdit())}
          >
            <Users />
            Members
            {data?.members.length ? (
              <span className='nav-count'>{data.members.length}</span>
            ) : null}
          </button>
        </nav>
        <div className='sidebar-section-caption board-caption'>
          {selectedWorkspace ? 'YOUR BOARDS' : isDemo ? 'SAMPLE BOARD' : 'PUBLIC BOARD'}
          <IconButton label='Create board' onClick={createBoard}>
            <Plus size={15} />
          </IconButton>
        </div>
        <nav className='board-nav' aria-label='Boards'>
          {boards
            .filter((b) => !b.archived)
            .map((b, index) => (
              <button
                className={b.id === boardId ? 'board-active' : ''}
                key={b.id}
                onClick={() => selectBoard(b.id)}
              >
                <span className={`board-dot dot-${index % 4}`} />
                {b.name}
                {b.visibility === 'private' && <LockKeyhole size={12} />}
              </button>
            ))}
          {!boards.length && (
            <button
              className='board-active'
              onClick={() => selectBoard(data?.board.id ?? demoBoard.board.id)}
            >
              <span className='board-dot dot-0' />
              {data?.board.name ?? demoBoard.board.name}
              {isDemo ? <Sparkles size={13} /> : <Globe2 size={13} />}
            </button>
          )}
          <button className='new-board-link' onClick={createBoard}>
            <Plus size={15} />
            Create a board
          </button>
        </nav>
        <button
          className={`archive-nav ${section === 'archive' ? 'nav-active' : ''}`}
          onClick={() => setSection('archive')}
        >
          <Archive size={16} />
          Archived boards
        </button>
        <div className='sidebar-spacer' />
        <div className='sidebar-note'>
          <span className='note-spark'>
            <Sparkles size={17} />
          </span>
          <strong>Good things start small.</strong>
          <p>
            Your next big idea?
            <br />
            Give it a little space.
          </p>
          <button onClick={requestEdit}>
            {viewer ? 'Create a workspace' : 'Make yourself at home'}
            <ArrowUpRight size={15} />
          </button>
          <span className='note-orbit' />
        </div>
        <div className='sidebar-bottom'>
          <button onClick={() => setHelpOpen(true)}>
            <CircleHelp size={16} />A little help
            <ArrowUpRight size={13} />
          </button>
          <button
            onClick={() =>
              data?.role === 'owner' ? setSettingsOpen(true) : requestEdit()
            }
          >
            <Settings2 size={16} />
            Workspace settings
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='profile-button'>
              <PersonAvatar name={viewer?.name ?? 'Hello, friend'} />
              <span>
                <strong>{viewer?.name ?? 'Hello, friend'}</strong>
                <small>
                  {viewer ? 'Personal account' : 'Welcome to Cardy'}
                </small>
              </span>
              <ChevronDown size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='cardy-menu' align='end'>
            {viewer ? (
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const result = await authClient.signOut();
                    if (result.error)
                      throw new Error(
                        result.error.message ?? 'Could not sign out. Try again.'
                      );
                    queryClient.clear();
                    setBoardId(demoBoard.board.id);
                    window.location.assign('/');
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Could not sign out. Try again.'
                    );
                  }
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setAuthOpen(true)}>
                Sign in / create account
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <main className='cardy-main' inert={isMobile && mobileOpen}>
        <header className='app-topbar'>
          <div className='topbar-path'>
            <IconButton
              label='Open navigation'
              className='icon-button mobile-menu'
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </IconButton>
            <span className='breadcrumb-icon'>
              <FolderKanban size={16} />
            </span>
            <span>
              {data?.workspaceName ?? selectedWorkspace?.name ?? 'Workspace'}
            </span>
            <ChevronRight size={13} />
            <strong>
              {section === 'board'
                ? (data?.board.name ?? 'Board')
                : section === 'tasks'
                  ? 'My tasks'
                  : section === 'activity'
                    ? 'Activity'
                    : 'Archived boards'}
            </strong>
          </div>
          <div className='topbar-actions'>
            <label className='global-search'>
              <Search size={15} />
              <input
                ref={searchRef}
                aria-label='Search cards'
                placeholder='Search this board...'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSection('board');
                }}
              />
              <kbd>⌘ K</kbd>
            </label>
            <IconButton
              label='Activity and notifications'
              onClick={() => setSection('activity')}
            >
              <Bell size={18} />
            </IconButton>
            <span className='topbar-divider' />
            <IconButton
              label='Help and keyboard shortcuts'
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={18} />
            </IconButton>
          </div>
        </header>

        {application.isPending && (
          <div
            className='sync-loading'
            role='status'
          >
            <Loader2 size={11} className='animate-spin' />
            Connecting to your workspace...
          </div>
        )}
        {application.isError && (
          <div className='connection-banner' role='alert'>
            <span>
              We couldn’t load your workspace.
              {isDemo
                ? ' You’re viewing a read-only sample.'
                : ' Please try again.'}
            </span>
            <button onClick={() => void application.refetch()}>
              Try again
            </button>
          </div>
        )}
        {invitationToken && (
          <InvitationBanner
            token={invitationToken}
            viewer={Boolean(viewer)}
            verified={Boolean(viewer?.emailVerified)}
            run={run}
            signIn={() => setAuthOpen(true)}
            onAccepted={(joinedWorkspaceId) => {
              toast.success('You joined the workspace.');
              const latest = queryClient.getQueryData<ApplicationData>([
                'cardy',
                'application',
              ]);
              const joinedBoard = latest?.boards.find(
                (b) => b.workspaceId === joinedWorkspaceId && !b.archived
              );
              if (joinedWorkspaceId) setWorkspaceId(joinedWorkspaceId);
              if (joinedBoard) {
                setBoardId(joinedBoard.id);
                setSection('board');
              }
              void navigate({
                to: '/',
                search: { board: joinedBoard?.id },
                replace: true,
              });
            }}
          />
        )}
        {!data && section === 'board' ? (
          <div className='page-empty'>
            {application.isPending || boardQuery.isLoading ? (
              <>
                <Loader2 className='animate-spin' />
                <h2>Making a little room...</h2>
              </>
            ) : (
              <>
                <LockKeyhole size={30} />
                <h2>This space is private</h2>
                <p>
                  {boardQuery.error?.message ??
                    'Select a board or create a workspace to get started.'}
                </p>
                <Button
                  onClick={viewer ? requestEdit : () => setAuthOpen(true)}
                >
                  {viewer ? 'Create workspace' : 'Sign in'}
                </Button>
              </>
            )}
          </div>
        ) : section === 'board' && data ? (
          <>
            <section className='board-heading'>
              <div className='board-heading-main'>
                <div className='board-heading-label'>
                  <span className='project-symbol'>
                    <FolderKanban size={21} />
                  </span>
                  <span>YOUR IDEAS, IN GOOD COMPANY</span>
                  {isDemo && <span className='sample-pill'>SAMPLE BOARD</span>}
                  {data.board.archived && (
                    <span className='sample-pill'>ARCHIVED · READ ONLY</span>
                  )}
                </div>
                <div className='board-title-row'>
                  <h1>{data.board.name}</h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className='board-title-menu'
                        aria-label='Board actions'
                      >
                        <Ellipsis size={22} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='cardy-menu' align='start'>
                      <DropdownMenuItem
                        disabled={data.board.archived || mutation.isPending}
                        onClick={() => {
                          if (!data.canEdit) {
                            requestEdit();
                            return;
                          }
                          void run({ type: 'board.duplicate', boardId })
                            .then((result) => {
                              if (result.id) selectBoard(result.id);
                              toast.success('Board duplicated');
                            })
                            .catch(() => {});
                        }}
                      >
                        <Copy />
                        Duplicate board
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={data.role !== 'owner' || data.board.archived}
                        onClick={() => setSettingsOpen(true)}
                      >
                        <Settings2 />
                        Board settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!data.role}
                        onClick={() => setArchivedCardsOpen(true)}
                      >
                        <Archive />
                        Archived cards
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={data.role !== 'owner' || data.board.archived}
                        onClick={() =>
                          setPrompt({
                            title: 'Archive this board?',
                            description:
                              'The board will be hidden from your sidebar. You can restore it from Archived boards.',
                            label: 'Type ARCHIVE to confirm',
                            action: async (value) => {
                              if (value !== 'ARCHIVE')
                                throw new Error('Type ARCHIVE to confirm.');
                              await run({
                                type: 'board.archive',
                                boardId,
                                archived: true,
                              });
                              setSection('archive');
                            },
                          })
                        }
                      >
                        <Archive />
                        Archive board
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p>
                  {data.board.description ||
                    'A little space for your next big thing.'}
                </p>
              </div>
              <div className='board-heading-actions'>
                <div className='board-people'>
                  {data.members.slice(0, 4).map((member, i) => (
                    <PersonAvatar
                      name={member.name}
                      index={i}
                      key={member.id}
                    />
                  ))}
                  {!data.members.length && (
                    <span className='sample-people'>
                      <Users size={18} />
                    </span>
                  )}
                </div>
                <button
                  className='soft-button'
                  onClick={() =>
                    data.role ? setMembersOpen(true) : requestEdit()
                  }
                >
                  <Plus size={15} />
                  Invite
                </button>
                <button
                  className='primary-button'
                  onClick={() => setShareOpen(true)}
                >
                  <ArrowUpRight size={15} />
                  Share board
                </button>
              </div>
            </section>
            <div className='board-toolbar'>
              <div className='board-tabs'>
                <button
                  className={view === 'board' ? 'tab-active' : ''}
                  onClick={() => setView('board')}
                >
                  <LayoutGrid size={15} />
                  Board
                </button>
                <button
                  className={view === 'list' ? 'tab-active' : ''}
                  onClick={() => setView('list')}
                >
                  <List size={16} />
                  List
                </button>
                <button onClick={() => setSection('activity')}>
                  <Activity size={15} />
                  Activity
                </button>
              </div>
              <div className='board-tools'>
                <span className='visibility-label'>
                  {data.board.visibility === 'public' ? (
                    <Globe2 size={13} />
                  ) : (
                    <LockKeyhole size={13} />
                  )}
                  {isDemo
                    ? 'Read-only preview'
                    : !data.canEdit ? 'Read-only board' : `${data.board.visibility === 'public' ? 'Public' : 'Private'} board`}
                </span>
                <span className='tool-divider' />
                <button
                  className={`filter-button ${filterCount ? 'filter-active' : ''}`}
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <SlidersHorizontal size={15} />
                  Filter{filterCount ? <span>{filterCount}</span> : null}
                </button>
                <button
                  className='soft-button add-list-top'
                  disabled={data.board.archived}
                  onClick={newList}
                >
                  <Plus size={15} />
                  Add list
                </button>
              </div>
            </div>
            {filterOpen && (
              <div className='filter-panel'>
                <label>
                  Label
                  <select
                    value={labelFilter}
                    onChange={(e) => setLabelFilter(e.target.value)}
                  >
                    <option value=''>All labels</option>
                    {LABELS.map((label) => (
                      <option key={label.name}>{label.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Assignee
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                  >
                    <option value=''>Everyone</option>
                    {data.members.map((member) => (
                      <option value={member.id} key={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <select
                    value={dueFilter}
                    onChange={(e) => setDueFilter(e.target.value)}
                  >
                    <option value=''>Any date</option>
                    <option value='overdue'>Overdue</option>
                    <option value='dated'>Has a due date</option>
                    <option value='none'>No due date</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    setLabelFilter('');
                    setAssigneeFilter('');
                    setDueFilter('');
                    setSearch('');
                  }}
                >
                  Clear filters
                </button>
                <IconButton
                  label='Close filters'
                  onClick={() => setFilterOpen(false)}
                >
                  <X size={16} />
                </IconButton>
              </div>
            )}
            {(search || filterCount > 0) && (
              <div className='search-summary'>
                {filtered.length} {filtered.length === 1 ? 'card' : 'cards'}{' '}
                match{search && <> “{search}”</>}
                <button
                  onClick={() => {
                    setSearch('');
                    setLabelFilter('');
                    setAssigneeFilter('');
                    setDueFilter('');
                  }}
                >
                  Clear
                </button>
              </div>
            )}
            {view === 'board' ? (
              <div className={`kanban-area ${dragging ? 'is-dragging' : ''}`}>
                <div className='kanban-columns'>
                  {data.lists.map((list, index) => {
                    const listCards = filtered.filter(
                      (c) => c.listId === list.id
                    );
                    const allListCards = cards.filter(
                      (c) => c.listId === list.id
                    );
                    return (
                      <section
                        key={list.id}
                        className={`kanban-column column-${index % 4} ${dropList === list.id ? 'drop-target' : ''}`}
                        onDragOver={(e) => {
                          if (data.canEdit && dragging) {
                            e.preventDefault();
                            setDropList(list.id);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          void dropOn(list.id);
                        }}
                      >
                        <div className='column-heading'>
                          <span className={`status-dot status-${index % 4}`} />
                          <h2
                            draggable={data.canEdit && !mutation.isPending}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', list.id);
                              setDragging({ type: 'list', id: list.id });
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setDropList(null);
                            }}
                          >
                            {list.name}
                          </h2>
                          <span className='column-count'>
                            {allListCards.length}
                          </span>
                          <div className='column-controls'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className='column-icon'
                                  aria-label={`Actions for ${list.name}`}
                                >
                                  <Ellipsis size={17} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className='cardy-menu'
                                align='end'
                              >
                                <DropdownMenuItem
                                  disabled={!data.canEdit}
                                  onClick={() =>
                                    setPrompt({
                                      title: 'Rename list',
                                      description:
                                        'A name that fits your flow.',
                                      label: 'List name',
                                      value: list.name,
                                      action: (name) =>
                                        run({
                                          type: 'list.rename',
                                          boardId,
                                          listId: list.id,
                                          name,
                                        }),
                                    })
                                  }
                                >
                                  Rename list
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={
                                    !data.canEdit ||
                                    index === 0 ||
                                    mutation.isPending
                                  }
                                  onClick={() =>
                                    void run({
                                      type: 'list.move',
                                      boardId,
                                      listId: list.id,
                                      index: index - 1,
                                    }).catch(() => {})
                                  }
                                >
                                  <ArrowLeft />
                                  Move left
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={
                                    !data.canEdit ||
                                    index === data.lists.length - 1 ||
                                    mutation.isPending
                                  }
                                  onClick={() =>
                                    void run({
                                      type: 'list.move',
                                      boardId,
                                      listId: list.id,
                                      index: index + 1,
                                    }).catch(() => {})
                                  }
                                >
                                  <ArrowRight />
                                  Move right
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              className='column-icon'
                              aria-label={`Add card to ${list.name}`}
                              disabled={data.board.archived}
                              onClick={() => {
                                if (!data.canEdit) {
                                  requestEdit();
                                  return;
                                }
                                setAddingList(list.id);
                                setCardTitle('');
                              }}
                            >
                              <Plus size={17} />
                            </button>
                          </div>
                        </div>
                        <div className='column-card-stack'>
                          {listCards.map((item) => (
                            <article
                              key={item.id}
                              className={`task-card ${dragging?.id === item.id ? 'drag-source' : ''}`}
                              draggable={data.canEdit && !mutation.isPending}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', item.id);
                                setDragging({ type: 'card', id: item.id });
                              }}
                              onDragEnd={() => {
                                setDragging(null);
                                setDropList(null);
                              }}
                              onDragOver={(e) => {
                                if (
                                  dragging?.type === 'card' &&
                                  dragging.id !== item.id
                                )
                                  e.preventDefault();
                              }}
                              onDrop={(e) => {
                                if (
                                  dragging?.type === 'card' &&
                                  dragging.id !== item.id
                                ) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void dropOn(
                                    list.id,
                                    allListCards.findIndex(
                                      (c) => c.id === item.id
                                    )
                                  );
                                }
                              }}
                            >
                              <button
                                className='task-card-body'
                                onClick={() => setCardId(item.id)}
                                aria-label={`Open ${item.title}`}
                              >
                                {item.cover && <Cover kind={item.cover} />}
                                <div className='task-card-content'>
                                  <div className='card-labels'>
                                    {item.labels.map((label) => (
                                      <span
                                        key={label}
                                        className={`card-label label-${LABELS.find((l) => l.name === label)?.color ?? 'blue'}`}
                                      >
                                        {label === 'High priority' && (
                                          <span className='priority-dot' />
                                        )}
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                  <h3>{item.title}</h3>
                                  {item.description && !item.cover && (
                                    <p>{item.description}</p>
                                  )}
                                  <div className='task-card-footer'>
                                    <div className='card-meta'>
                                      {item.dueDate && (
                                        <span className='card-date'>
                                          <CalendarDays size={12} />
                                          {new Date(
                                            item.dueDate + 'T00:00:00'
                                          ).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                      )}
                                      {item.checklist.length > 0 && (
                                        <span
                                          className={
                                            item.checklist.every((x) => x.done)
                                              ? 'checklist-complete'
                                              : ''
                                          }
                                        >
                                          <CheckCheck size={13} />
                                          {
                                            item.checklist.filter((x) => x.done)
                                              .length
                                          }
                                          /{item.checklist.length}
                                        </span>
                                      )}
                                      {data.comments.some(
                                        (c) => c.cardId === item.id
                                      ) && (
                                        <span>
                                          <MessageCircle size={12} />
                                          {
                                            data.comments.filter(
                                              (c) => c.cardId === item.id
                                            ).length
                                          }
                                        </span>
                                      )}
                                      {!item.dueDate &&
                                        !item.checklist.length && (
                                          <span className='description-icon'>
                                            <List size={14} />
                                          </span>
                                        )}
                                    </div>
                                    <div className='card-assignees'>
                                      {item.assignees
                                        .slice(0, 3)
                                        .map((uid, i) => (
                                          <PersonAvatar
                                            key={uid}
                                            name={
                                              data.members.find(
                                                (m) => m.id === uid
                                              )?.name ?? 'Member'
                                            }
                                            index={i}
                                          />
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              </button>
                              {data.canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className='card-move-trigger'
                                      aria-label={`Move ${item.title}`}
                                    >
                                      <GripVertical size={15} />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className='cardy-menu'>
                                    <DropdownMenuItem
                                      onClick={() => setCardId(item.id)}
                                    >
                                      Open card
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={mutation.isPending}
                                      onClick={() =>
                                        void run({
                                          type: 'card.move',
                                          boardId,
                                          cardId: item.id,
                                          listId: list.id,
                                          index: Math.max(
                                            0,
                                            allListCards.findIndex(
                                              (c) => c.id === item.id
                                            ) - 1
                                          ),
                                        }).catch(() => {})
                                      }
                                    >
                                      <ArrowUp />
                                      Move up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={mutation.isPending}
                                      onClick={() =>
                                        void run({
                                          type: 'card.move',
                                          boardId,
                                          cardId: item.id,
                                          listId: list.id,
                                          index:
                                            allListCards.findIndex(
                                              (c) => c.id === item.id
                                            ) + 1,
                                        }).catch(() => {})
                                      }
                                    >
                                      <ArrowDown />
                                      Move down
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {data.lists
                                      .filter((l) => l.id !== list.id)
                                      .map((l) => (
                                        <DropdownMenuItem
                                          key={l.id}
                                          disabled={mutation.isPending}
                                          onClick={() =>
                                            void run({
                                              type: 'card.move',
                                              boardId,
                                              cardId: item.id,
                                              listId: l.id,
                                              index: cards.filter(
                                                (c) => c.listId === l.id
                                              ).length,
                                            }).catch(() => {})
                                          }
                                        >
                                          <ArrowRight />
                                          {l.name}
                                        </DropdownMenuItem>
                                      ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </article>
                          ))}
                          {!listCards.length && (
                            <div className='column-empty'>
                              <Circle size={20} />
                              <p>
                                {search || filterCount
                                  ? 'No matching cards'
                                  : 'A little space for what’s next'}
                              </p>
                            </div>
                          )}
                          {addingList === list.id ? (
                            <form
                              className='add-card-form'
                              onSubmit={(e) => {
                                e.preventDefault();
                                void addCard(list.id);
                              }}
                            >
                              <textarea
                                autoFocus
                                aria-label='New card title'
                                placeholder='What are we working on?'
                                required
                                maxLength={300}
                                value={cardTitle}
                                onChange={(e) => setCardTitle(e.target.value)}
                              />
                              <div>
                                <button
                                  className='primary-button'
                                  disabled={
                                    mutation.isPending || !cardTitle.trim()
                                  }
                                >
                                  {mutation.isPending
                                    ? 'Adding...'
                                    : 'Add card'}
                                </button>
                                <IconButton
                                  label='Cancel adding card'
                                  onClick={() => setAddingList(null)}
                                >
                                  <X size={16} />
                                </IconButton>
                              </div>
                            </form>
                          ) : (
                            <button
                              className='add-card-button'
                              disabled={data.board.archived}
                              onClick={() => {
                                if (!data.canEdit) {
                                  requestEdit();
                                  return;
                                }
                                setAddingList(list.id);
                                setCardTitle('');
                              }}
                            >
                              <Plus size={15} />
                              Add a card
                            </button>
                          )}
                        </div>
                      </section>
                    );
                  })}
                  <button
                    className='add-column-button'
                    disabled={data.board.archived}
                    onClick={newList}
                  >
                    <Plus size={16} />
                    Add another list
                  </button>
                </div>
              </div>
            ) : (
              <CardTable cards={filtered} data={data} onOpen={setCardId} />
            )}
            <footer className='board-footer'>
              <span>
                <span className='footer-status-dot' />
                {mutation.isPending
                  ? 'Saving your changes...'
                  : isDemo
                    ? 'A little less chaos. A lot more clarity.'
                    : 'Your changes are saved'}
              </span>
              <span>
                Made for a little more flow.
                <Brand compact />
              </span>
            </footer>
          </>
        ) : section === 'tasks' ? (
          <div className='secondary-page'>
            <span className='eyebrow'>ONE THING AT A TIME</span>
            <h1>
              My tasks<span className='heading-dot'>.</span>
            </h1>
            <p>Your assigned cards on this board, all in one place.</p>
            {data && viewer ? (
              <CardTable
                data={data}
                cards={cards.filter((c) => c.assignees.includes(viewer.id))}
                onOpen={setCardId}
              />
            ) : (
              <div className='page-empty'>
                <CheckCheck size={32} />
                <h2>A fresh start</h2>
                <p>Sign in and assign cards to yourself to find them here.</p>
                <Button onClick={requestEdit}>
                  {viewer ? 'Create workspace' : 'Get started'}
                </Button>
              </div>
            )}
          </div>
        ) : section === 'activity' ? (
          <div className='secondary-page'>
            <span className='eyebrow'>THE STORY SO FAR</span>
            <h1>
              A little progress<span className='heading-dot'>.</span>
            </h1>
            <p>
              Recent updates for {data?.board.name ?? 'your board'}. Every
              little step forward.
            </p>
            <div className='activity-feed'>
              {data?.history.length ? (
                data.history.map((entry) => (
                  <div className='activity-entry' key={entry.id}>
                    <PersonAvatar name={entry.author ?? 'Cardy'} />
                    <div>
                      <p>
                        <strong>{entry.author ?? 'Cardy'}</strong>{' '}
                        {entry.message}
                      </p>
                      <time>{new Date(entry.createdAt).toLocaleString()}</time>
                      {entry.cardId && (
                        <button
                          onClick={() => {
                            setCardId(entry.cardId);
                          }}
                        >
                          Open card
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className='page-empty'>
                  <Activity size={32} />
                  <h2>Your story starts here</h2>
                  <p>
                    Changes and conversations will appear as your team gets
                    things moving.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className='secondary-page'>
            <span className='eyebrow'>OUT OF SIGHT, NOT OUT OF REACH</span>
            <h1>
              Archived boards<span className='heading-dot'>.</span>
            </h1>
            <p>
              A place for finished chapters. Bring one back whenever you’re
              ready.
            </p>
            <div className='archived-grid'>
              {boards
                .filter((b) => b.archived)
                .map((b) => (
                  <div className='archived-board' key={b.id}>
                    <FolderKanban size={25} />
                    <h3>{b.name}</h3>
                    <p>{b.description || 'Ready when you are.'}</p>
                    <button
                      className='soft-button'
                      onClick={() => selectBoard(b.id)}
                    >
                      View board
                    </button>
                    {selectedWorkspace?.role === 'owner' && (
                      <button
                        className='primary-button'
                        disabled={mutation.isPending}
                        onClick={() =>
                          void run({
                            type: 'board.archive',
                            boardId: b.id,
                            archived: false,
                          })
                            .then(() => {
                              selectBoard(b.id);
                              toast.success('Board restored');
                            })
                            .catch(() => {})
                        }
                      >
                        Restore board
                      </button>
                    )}
                  </div>
                ))}
            </div>
            {!boards.some((b) => b.archived) && (
              <div className='page-empty'>
                <Archive size={32} />
                <h2>Nothing tucked away yet</h2>
                <p>Archived boards will find a home here.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['cardy'] });
          toast.success('Welcome to Cardy.');
        }}
      />
      {selectedCard && data && (
        <CardDetails
          key={selectedCard.id}
          card={selectedCard}
          data={data}
          open={Boolean(cardId)}
          onOpenChange={(open) => {
            if (!open) setCardId(null);
          }}
          run={run}
          pending={mutation.isPending}
        />
      )}
      {data && (
        <MembersDialog
          data={data}
          open={membersOpen}
          onOpenChange={setMembersOpen}
          run={run}
          pending={mutation.isPending}
        />
      )}
      {prompt && (
        <PromptDialog prompt={prompt} onClose={() => setPrompt(null)} />
      )}
      {data && (
        <BoardSettings
          data={data}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          run={run}
        />
      )}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className='cardy-dialog'>
          <DialogHeader>
            <Brand />
            <DialogTitle>A little help, a lot of clarity.</DialogTitle>
            <DialogDescription>
              Cardy is a thoughtful home for your team’s work.
            </DialogDescription>
          </DialogHeader>
          <div className='help-items'>
            <div>
              <kbd>⌘ / Ctrl K</kbd>
              <span>Jump to search</span>
            </div>
            <div>
              <GripVertical size={19} />
              <span>
                Drag cards between lists. Drag list titles to reorder.
              </span>
            </div>
            <div>
              <ArrowRight size={19} />
              <span>
                On touch devices or keyboards, use a card’s move menu.
              </span>
            </div>
            <div>
              <LockKeyhole size={19} />
              <span>
                Private by default. Public boards are read-only for visitors.
              </span>
            </div>
          </div>
          <p className='dialog-note'>
            Comments, labels, dates, and checklists live inside every card.
            Owners manage members and board visibility. Attachments,
            integrations, and live collaboration aren’t included yet.
          </p>
          <button className='primary-button' onClick={() => setHelpOpen(false)}>
            A little clearer
          </button>
        </DialogContent>
      </Dialog>
      {data && (
        <Dialog open={archivedCardsOpen} onOpenChange={setArchivedCardsOpen}>
          <DialogContent className='cardy-dialog'>
            <DialogHeader>
              <DialogTitle>Just a little pause.</DialogTitle>
              <DialogDescription>
                Archived cards from {data.board.name}. Restore one to the end of
                its original list.
              </DialogDescription>
            </DialogHeader>
            {data.cards.some((c) => c.archived) ? (
              <div className='archived-card-list'>
                {data.cards
                  .filter((c) => c.archived)
                  .map((item) => (
                    <div className='archived-card-row' key={item.id}>
                      <button
                        onClick={() => {
                          setArchivedCardsOpen(false);
                          setCardId(item.id);
                        }}
                      >
                        <strong>{item.title}</strong>
                        <small>
                          {data.lists.find((l) => l.id === item.listId)?.name}
                        </small>
                      </button>
                      <button
                        className='soft-button'
                        disabled={!data.canEdit || mutation.isPending}
                        onClick={() =>
                          void run({
                            type: 'card.archive',
                            boardId: data.board.id,
                            cardId: item.id,
                            archived: false,
                          })
                            .then(() => toast.success('Card restored'))
                            .catch(() => {})
                        }
                      >
                        Restore
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='page-empty'>
                <Archive size={27} />
                <h2>Nothing tucked away.</h2>
                <p>Archived cards will appear here.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      {data && (
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className='cardy-dialog'>
            <DialogHeader>
              <DialogTitle>Good things are worth sharing.</DialogTitle>
              <DialogDescription>
                {data.board.visibility === 'public'
                  ? 'Anyone with this link can view this board. Only workspace members can edit it.'
                  : 'This board is private. Only workspace members can open this link.'}
              </DialogDescription>
            </DialogHeader>
            <div className='share-field'>
              <Input
                aria-label='Board link'
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/?board=${boardId}`
                    : ''
                }
              />
              <button
                className='soft-button'
                onClick={() =>
                  void copyText(`${window.location.origin}/?board=${boardId}`)
                }
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
            {data.role === 'owner' && (
              <button
                className='soft-button'
                onClick={() => {
                  setShareOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings2 size={15} />
                Manage board visibility
              </button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

async function readRequest<T>(
  signal: AbortSignal,
  request: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    return await request(controller.signal);
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted)
      throw new Error('Connection timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

function CardTable({
  cards,
  data,
  onOpen,
}: {
  cards: Card[];
  data: BoardData;
  onOpen: (id: string) => void;
}) {
  return (
    <div className='card-table-wrapper'>
      {cards.length ? (
        <table className='card-table'>
          <thead>
            <tr>
              <th>Card</th>
              <th>List</th>
              <th>Labels</th>
              <th>Due date</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id}>
                <td>
                  <button onClick={() => onOpen(card.id)}>{card.title}</button>
                </td>
                <td>{data.lists.find((l) => l.id === card.listId)?.name}</td>
                <td>
                  <div className='card-labels'>
                    {card.labels.map((l) => (
                      <span
                        key={l}
                        className={`card-label label-${LABELS.find((x) => x.name === l)?.color}`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{card.dueDate ?? 'No date'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className='page-empty'>
          <Search size={27} />
          <h2>A little room to grow</h2>
          <p>
            No cards here yet. Try changing your filters, or add something new.
          </p>
        </div>
      )}
    </div>
  );
}

function PromptDialog({
  prompt,
  onClose,
}: {
  prompt: Prompt;
  onClose: () => void;
}) {
  const [value, setValue] = useState(prompt.value ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className='cardy-dialog'>
        <DialogHeader>
          <DialogTitle>{prompt.title}</DialogTitle>
          <DialogDescription>{prompt.description}</DialogDescription>
        </DialogHeader>
        <form
          className='dialog-form'
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError('');
            try {
              await prompt.action(value);
              onClose();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : 'Something went wrong. Try again.'
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            {prompt.label}
            <Input
              autoFocus
              required
              maxLength={120}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          {error && (
            <p className='form-error' role='alert'>
              {error}
            </p>
          )}
          <div className='dialog-form-actions'>
            <button
              type='button'
              className='soft-button'
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className='primary-button'
              disabled={pending || !value.trim()}
            >
              {pending ? 'Saving...' : 'Continue'}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BoardSettings({
  data,
  open,
  onOpenChange,
  run,
}: {
  data: BoardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: RunAction;
}) {
  const [name, setName] = useState(data.board.name);
  const [description, setDescription] = useState(data.board.description);
  const [visibility, setVisibility] = useState(data.board.visibility);
  const [workspaceName, setWorkspaceName] = useState(data.workspaceName);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (open) {
      setName(data.board.name);
      setDescription(data.board.description);
      setVisibility(data.board.visibility);
      setWorkspaceName(data.workspaceName);
    }
  }, [
    open,
    data.board.name,
    data.board.description,
    data.board.visibility,
    data.workspaceName,
  ]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='cardy-dialog'>
        <DialogHeader>
          <DialogTitle>Make this space yours.</DialogTitle>
          <DialogDescription>
            Workspace and board settings. Only owners can make these changes.
          </DialogDescription>
        </DialogHeader>
        <form
          className='dialog-form'
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              if (workspaceName !== data.workspaceName)
                await run({
                  type: 'workspace.rename',
                  workspaceId: data.board.workspaceId,
                  name: workspaceName,
                });
              await run({
                type: 'board.update',
                boardId: data.board.id,
                name,
                description,
                visibility,
              });
              onOpenChange(false);
              toast.success('Settings saved');
            } catch {
              /* Mutation errors are visible. */
            } finally {
              setPending(false);
            }
          }}
        >
          <label>
            Workspace name
            <Input
              required
              maxLength={120}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </label>
          <label>
            Board name
            <Input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              maxLength={20000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            Visibility
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as 'public' | 'private')
              }
            >
              <option value='private'>Private · Workspace members only</option>
              <option value='public'>
                Public · Anyone can view, members can edit
              </option>
            </select>
          </label>
          <p className='dialog-note'>
            Public viewers can see card descriptions, comments, and member
            display names. Email addresses and invitations remain private.
          </p>
          <button
            className='primary-button'
            disabled={pending || data.role !== 'owner'}
          >
            {pending ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvitationBanner({
  token,
  viewer,
  verified,
  run,
  signIn,
  onAccepted,
}: {
  token: string;
  viewer: boolean;
  verified: boolean;
  run: RunAction;
  signIn: () => void;
  onAccepted: (workspaceId?: string) => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className='invite-banner'>
      <Sparkles size={18} />
      <span>
        {viewer
          ? verified
            ? 'You’re invited. A new workspace is waiting for you.'
            : 'Verify your email in the sign-in dialog to accept this invitation.'
          : 'A little invitation to something good. Sign in with the invited email to join.'}
      </span>
      <button
        className='primary-button'
        disabled={pending}
        onClick={async () => {
          if (!viewer || !verified) {
            signIn();
            return;
          }
          setPending(true);
          try {
            const result = await run({ type: 'invite.accept', token });
            onAccepted(result.workspaceId);
          } catch {
            /* Mutation errors are visible. */
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? 'Joining...'
          : viewer && verified
            ? 'Accept invitation'
            : 'Continue'}
      </button>
    </div>
  );
}
