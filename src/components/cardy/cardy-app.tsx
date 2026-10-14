import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ListChecks, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { useShortcuts } from '~/hooks/use-shortcuts';
import { useToday } from '~/hooks/use-today';
import { authClient, useSession } from '~/lib/auth-client';
import { doneListId, EMPTY_FILTERS, type CardFilters } from '~/lib/cardy.board';
import { demoBoard } from '~/lib/cardy.demo';
import { loadApplication, loadBoard, mutateCardy, type ApplicationData } from '~/lib/cardy.functions';
import type { Action } from '~/lib/cardy.types';
import { AppHeader } from './app-header';
import { AppSidebar, type Section } from './app-sidebar';
import { AuthDialog } from './auth-dialog';
import { BoardProvider } from './board-context';
import { ArchivedCardsDialog, BoardSettingsDialog, PromptDialog, ShareDialog, ShortcutsDialog } from './board-dialogs';
import type { BoardView as View } from './board-header';
import { BoardScreen } from './board-screen';
import { CardDetail } from './card-detail';
import { errorMessage, readRequest, type Prompt, type RunAction } from './cardy-utils';
import { MembersDialog } from './members-dialog';
import { ActivityFeed, ArchivedBoards, Banner, EmptyState, InvitationBanner, MyTasks, Page } from './secondary-pages';

type DialogName = 'auth' | 'members' | 'settings' | 'share' | 'archivedCards' | 'shortcuts';

const SECTION_TITLES: Record<Exclude<Section, 'board'>, string> = {
  tasks: 'My tasks',
  activity: 'Activity',
  archive: 'Archived boards',
};

export function CardyApp({ initialBoard, invitationToken }: { initialBoard?: string; invitationToken?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = useSession();
  const today = useToday();
  const application = useQuery({
    queryKey: ['cardy', 'application'],
    queryFn: ({ signal }) => readRequest(signal, (requestSignal) => loadApplication({ signal: requestSignal })),
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
      readRequest(signal, (requestSignal) => loadBoard({ data: { boardId }, signal: requestSignal })),
    enabled: Boolean(application.data),
    networkMode: 'always',
    retry: false,
  });
  const data = boardQuery.data ?? (boardId === demoBoard.board.id ? demoBoard : null);
  const viewer = application.data?.viewer ?? session.data?.user ?? null;
  const workspaces = application.data?.workspaces ?? [];
  const selectedWorkspace = workspaces.find((w) => w.id === (workspaceId || data?.board.workspaceId)) ?? workspaces[0];
  const boards = (application.data?.boards ?? []).filter((b) => b.workspaceId === selectedWorkspace?.id);
  const isDemo = boardId === demoBoard.board.id;

  const [section, setSection] = useState<Section>('board');
  const [view, setView] = useState<View>('board');
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composerList, setComposerList] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: (action: Action) => mutateCardy({ data: action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cardy'] });
    },
    onError: (error) => toast.error(error.message),
  });
  const run: RunAction = async (action) => await mutation.mutateAsync(action);

  // Signed-in visitors land on their own first board instead of the sample.
  useEffect(() => {
    if (!initialBoard && application.data?.boards.length && boardId === demoBoard.board.id)
      setBoardId(application.data.boards.find((b) => !b.archived)?.id ?? demoBoard.board.id);
  }, [application.data, initialBoard, boardId]);

  const doneId = data ? doneListId(data.lists) : null;
  const selectedCard = data?.cards.find((card) => card.id === cardId);
  const closeDialog = () => setDialog(null);

  function selectBoard(nextId: string) {
    setBoardId(nextId);
    setSection('board');
    setCardId(null);
    setFilters(EMPTY_FILTERS);
    setComposerList(null);
    setMobileOpen(false);
    void navigate({ to: '/app', search: { board: nextId, invite: invitationToken }, replace: true });
  }

  function requestEdit() {
    if (!viewer) return setDialog('auth');
    setPrompt({
      title: 'Create a workspace',
      description: 'You get a private board to start with.',
      label: 'Workspace name',
      value: `${viewer.name.split(' ')[0]}’s workspace`,
      action: async (name) => {
        const result = await run({ type: 'workspace.create', name });
        if (result.workspaceId) setWorkspaceId(result.workspaceId);
        if (result.id) selectBoard(result.id);
        toast.success('Workspace created');
      },
    });
  }

  function createBoard() {
    if (!selectedWorkspace) return requestEdit();
    setPrompt({
      title: 'New board',
      label: 'Board name',
      action: async (name) => {
        const result = await run({ type: 'board.create', workspaceId: selectedWorkspace.id, name });
        if (result.id) selectBoard(result.id);
        toast.success('Board created');
      },
    });
  }

  // False when the current board cannot take new lists or cards.
  function ensureEditable() {
    if (!data) return false;
    if (data.board.archived) {
      toast.info('Restore this board from Archived to edit it.');
      setSection('archive');
      return false;
    }
    if (!data.canEdit) {
      requestEdit();
      return false;
    }
    return true;
  }

  function newList() {
    if (!ensureEditable()) return;
    setPrompt({
      title: 'New list',
      label: 'List name',
      action: (name) => run({ type: 'list.create', boardId, name }),
    });
  }

  function newCard() {
    if (!data || !ensureEditable()) return;
    const first = data.lists[0];
    if (!first) return newList();
    setSection('board');
    setView('board');
    setComposerList(first.id);
  }

  function openMembers() {
    if (data?.role) setDialog('members');
    else requestEdit();
  }

  async function signOut() {
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Could not sign out. Try again.');
      queryClient.clear();
      window.location.assign('/');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not sign out. Try again.'));
    }
  }

  function search(value: string) {
    setFilters((current) => ({ ...current, search: value }));
    setSection('board');
  }

  useShortcuts({
    '/': () => {
      setSection('board');
      searchRef.current?.focus();
    },
    n: newCard,
    '?': () => setDialog('shortcuts'),
    Escape: () => {
      search('');
      setFiltersOpen(false);
      setComposerList(null);
    },
  });

  const boardMain = !data ? (
    boardQuery.isError ? (
      <div className='flex flex-1 items-center py-10'>
        <EmptyState icon={<LockKeyhole />} title='This board is unavailable'>
          <p className='max-w-xs text-[13px] text-muted-foreground'>{boardQuery.error.message}</p>
          <Button size='sm' className='mt-2' onClick={viewer ? requestEdit : () => setDialog('auth')}>
            {viewer ? 'Create workspace' : 'Sign in'}
          </Button>
        </EmptyState>
      </div>
    ) : (
      <div role='status' className='flex flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground'>
        <Spinner />
        Loading board
      </div>
    )
  ) : (
    <BoardScreen
      isDemo={isDemo}
      view={view}
      onViewChange={setView}
      filters={filters}
      onFiltersChange={setFilters}
      filtersOpen={filtersOpen}
      onToggleFilters={() => setFiltersOpen((open) => !open)}
      composerList={composerList}
      setComposerList={setComposerList}
      onAddList={newList}
      actions={{
        invite: openMembers,
        share: () => setDialog('share'),
        settings: () => setDialog('settings'),
        archivedCards: () => setDialog('archivedCards'),
      }}
      onDuplicated={(id) => {
        selectBoard(id);
        toast.success('Board duplicated');
      }}
      onArchived={() => setSection('archive')}
    />
  );

  const signInPrompt = (
    <EmptyState icon={<ListChecks />} title='Sign in to see your cards'>
      <Button size='sm' className='mt-2' onClick={() => setDialog('auth')}>
        Sign in
      </Button>
    </EmptyState>
  );

  const content =
    section === 'archive' ? (
      <ArchivedBoards
        boards={boards.filter((b) => b.archived)}
        isOwner={selectedWorkspace?.role === 'owner'}
        run={run}
        pending={mutation.isPending}
        onOpen={selectBoard}
      />
    ) : section === 'board' ? (
      boardMain
    ) : !data ? (
      <Page title={SECTION_TITLES[section]}>{signInPrompt}</Page>
    ) : section === 'tasks' ? (
      viewer ? (
        <MyTasks viewerId={viewer.id} />
      ) : (
        <Page title='My tasks'>{signInPrompt}</Page>
      )
    ) : (
      <ActivityFeed />
    );

  const app = (
    <div className='flex h-dvh overflow-hidden bg-background text-foreground'>
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        viewer={viewer}
        workspaces={workspaces}
        workspaceName={selectedWorkspace?.name ?? data?.workspaceName ?? demoBoard.workspaceName}
        selectedWorkspaceId={selectedWorkspace?.id}
        boards={boards}
        fallbackBoard={data ? { id: data.board.id, name: data.board.name } : null}
        boardId={boardId}
        section={section}
        memberCount={data?.members.length ?? 0}
        onSection={setSection}
        onSelectWorkspace={(id) => {
          setWorkspaceId(id);
          const first = application.data?.boards.find((b) => b.workspaceId === id && !b.archived);
          if (first) selectBoard(first.id);
          else setSection('archive');
        }}
        onCreateWorkspace={requestEdit}
        onSelectBoard={selectBoard}
        onCreateBoard={createBoard}
        onMembers={openMembers}
        onShortcuts={() => setDialog('shortcuts')}
        onSignIn={() => setDialog('auth')}
        onSignOut={() => void signOut()}
      />
      <main className='flex min-w-0 flex-1 flex-col bg-white'>
        <AppHeader
          workspaceName={data?.workspaceName ?? selectedWorkspace?.name ?? 'Workspace'}
          title={section === 'board' ? (data?.board.name ?? 'Board') : SECTION_TITLES[section]}
          search={filters.search}
          searchRef={searchRef}
          saving={mutation.isPending}
          onSearch={search}
          onMenu={() => setMobileOpen(true)}
          onShortcuts={() => setDialog('shortcuts')}
          onNewCard={data && !data.board.archived ? newCard : undefined}
        />
        {application.isPending && <div role='status' aria-label='Loading workspace' className='loading-bar' />}
        {application.isError && (
          <Banner tone='error' action={{ label: 'Retry', onClick: () => void application.refetch() }}>
            Couldn’t load your workspace.{isDemo && ' Showing the sample board.'}
          </Banner>
        )}
        {isDemo && application.data && (
          <Banner
            action={
              viewer
                ? { label: 'Create workspace', onClick: requestEdit }
                : { label: 'Sign up free', onClick: () => setDialog('auth') }
            }
          >
            Sample board. Sign up to make your own.
          </Banner>
        )}
        {invitationToken && (
          <InvitationBanner
            token={invitationToken}
            signedIn={Boolean(viewer)}
            verified={Boolean(viewer?.emailVerified)}
            run={run}
            onSignIn={() => setDialog('auth')}
            onAccepted={(joinedWorkspaceId) => {
              toast.success('You joined the workspace');
              const latest = queryClient.getQueryData<ApplicationData>(['cardy', 'application']);
              const joinedBoard = latest?.boards.find((b) => b.workspaceId === joinedWorkspaceId && !b.archived);
              if (joinedWorkspaceId) setWorkspaceId(joinedWorkspaceId);
              if (joinedBoard) {
                setBoardId(joinedBoard.id);
                setSection('board');
              }
              void navigate({ to: '/app', search: { board: joinedBoard?.id }, replace: true });
            }}
          />
        )}
        {content}
      </main>
    </div>
  );

  return (
    <>
      {data ? (
        <BoardProvider
          value={{
            data,
            run,
            pending: mutation.isPending,
            today,
            doneId,
            openCard: setCardId,
            requestEdit,
            ask: setPrompt,
          }}
        >
          {app}
          {selectedCard && <CardDetail key={selectedCard.id} card={selectedCard} onClose={() => setCardId(null)} />}
          <MembersDialog open={dialog === 'members'} onOpenChange={(open) => setDialog(open ? 'members' : null)} />
          {dialog === 'settings' && <BoardSettingsDialog onClose={closeDialog} />}
          {dialog === 'share' && <ShareDialog onClose={closeDialog} onSettings={() => setDialog('settings')} />}
          {dialog === 'archivedCards' && <ArchivedCardsDialog onClose={closeDialog} />}
        </BoardProvider>
      ) : (
        app
      )}
      <AuthDialog
        open={dialog === 'auth'}
        onOpenChange={(open) => setDialog(open ? 'auth' : null)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['cardy'] });
          toast.success('Welcome to Cardy');
        }}
      />
      <ShortcutsDialog open={dialog === 'shortcuts'} onOpenChange={(open) => setDialog(open ? 'shortcuts' : null)} />
      {prompt && <PromptDialog key={prompt.title} prompt={prompt} onClose={() => setPrompt(null)} />}
    </>
  );
}
