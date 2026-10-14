import { activeFilterCount, filterCards, type CardFilters } from '~/lib/cardy.board';
import { fire, useBoard } from './board-context';
import { BoardFilters } from './board-filters';
import { BoardHeader, type BoardHeaderActions, type BoardView as View } from './board-header';
import { BoardView } from './board-view';
import { CalendarView } from './calendar-view';
import { InsightsView } from './insights-view';
import { ListView } from './list-view';

// The loaded board: header, filters and the selected view. State stays in CardyApp
// because search, the composer and shortcuts are shared with the app chrome.
export function BoardScreen({
  isDemo,
  view,
  onViewChange,
  filters,
  onFiltersChange,
  filtersOpen,
  onToggleFilters,
  composerList,
  setComposerList,
  onAddList,
  actions,
  onDuplicated,
  onArchived,
}: {
  isDemo: boolean;
  view: View;
  onViewChange: (view: View) => void;
  filters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  composerList: string | null;
  setComposerList: (listId: string | null) => void;
  onAddList: () => void;
  actions: Omit<BoardHeaderActions, 'duplicate' | 'archive'>;
  onDuplicated: (boardId: string) => void;
  onArchived: () => void;
}) {
  const { data, run, today, doneId, requestEdit, ask } = useBoard();
  const cards = data.cards.filter((card) => !card.archived);
  const visible = filterCards(cards, filters, today, doneId);
  const filtered = activeFilterCount(filters) > 0 || filters.search.trim() !== '';
  return (
    <>
      <BoardHeader
        isDemo={isDemo}
        view={view}
        onViewChange={onViewChange}
        filtersOpen={filtersOpen}
        filterCount={activeFilterCount(filters)}
        onToggleFilters={onToggleFilters}
        actions={{
          ...actions,
          duplicate: () => {
            if (!data.canEdit) return requestEdit();
            fire(
              run({ type: 'board.duplicate', boardId: data.board.id }).then(
                (result) => result.id && onDuplicated(result.id)
              )
            );
          },
          archive: () =>
            ask({
              title: 'Archive this board?',
              description: 'It leaves the sidebar. Restore it any time from Archived.',
              label: 'Type ARCHIVE to confirm',
              submitLabel: 'Archive board',
              action: async (value) => {
                if (value !== 'ARCHIVE') throw new Error('Type ARCHIVE to confirm.');
                await run({ type: 'board.archive', boardId: data.board.id, archived: true });
                onArchived();
              },
            }),
        }}
      />
      {filtersOpen && view !== 'insights' && (
        <BoardFilters filters={filters} onChange={onFiltersChange} matches={visible.length} total={cards.length} />
      )}
      {view === 'board' ? (
        <BoardView
          cards={cards}
          visible={visible}
          filtered={filtered}
          composerList={composerList}
          setComposerList={setComposerList}
          onAddList={onAddList}
        />
      ) : view === 'list' ? (
        <div className='thin-scrollbar min-h-0 flex-1 overflow-y-auto py-4'>
          <ListView cards={visible} empty={filtered ? 'No cards match these filters.' : 'No cards yet.'} />
        </div>
      ) : view === 'calendar' ? (
        <CalendarView cards={visible} />
      ) : (
        <InsightsView cards={cards} />
      )}
    </>
  );
}
