import type { Ref } from 'react';
import { ChevronRight, Keyboard, Menu, Plus, Search, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { Kbd } from './cardy-ui';

export function AppHeader({
  workspaceName,
  title,
  search,
  searchRef,
  saving,
  onSearch,
  onMenu,
  onShortcuts,
  onNewCard,
}: {
  workspaceName: string;
  title: string;
  search: string;
  searchRef: Ref<HTMLInputElement>;
  saving: boolean;
  onSearch: (value: string) => void;
  onMenu: () => void;
  onShortcuts: () => void;
  onNewCard?: () => void;
}) {
  return (
    <header className='flex h-12 shrink-0 items-center gap-2 border-b border-border bg-white/80 px-3 backdrop-blur sm:px-4'>
      <Button variant='ghost' size='icon-sm' className='md:hidden' aria-label='Open navigation' onClick={onMenu}>
        <Menu />
      </Button>
      <nav aria-label='Breadcrumb' className='flex min-w-0 items-center gap-1 text-[13px]'>
        <span className='hidden truncate text-muted-foreground sm:block'>{workspaceName}</span>
        <ChevronRight className='hidden size-3.5 shrink-0 text-faint sm:block' />
        <span className='truncate font-medium'>{title}</span>
      </nav>
      <div className='ml-auto flex items-center gap-1.5'>
        {saving && (
          <span role='status' className='mr-1 flex items-center gap-1.5 font-mono text-[11px] text-faint max-md:hidden'>
            <Spinner className='size-3' />
            Saving
          </span>
        )}
        <label className='group relative flex h-8 w-36 items-center rounded-md border border-input bg-white transition-[width,border-color,box-shadow] focus-within:w-56 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15 sm:w-56 sm:focus-within:w-72'>
          <Search className='pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground' />
          <input
            ref={searchRef}
            type='search'
            aria-label='Search cards'
            placeholder='Search cards'
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onSearch('');
                event.currentTarget.blur();
              }
            }}
            className='h-full w-full min-w-0 bg-transparent pr-8 pl-8 text-[13px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden'
          />
          {search ? (
            <button
              type='button'
              aria-label='Clear search'
              onClick={() => onSearch('')}
              className='absolute right-1.5 grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground'
            >
              <X className='size-3' />
            </button>
          ) : (
            <span className='pointer-events-none absolute right-1.5 max-sm:hidden group-focus-within:hidden'>
              <Kbd>/</Kbd>
            </span>
          )}
        </label>
        <Button
          variant='ghost'
          size='icon-sm'
          className='max-sm:hidden'
          aria-label='Keyboard shortcuts'
          onClick={onShortcuts}
        >
          <Keyboard />
        </Button>
        {onNewCard && (
          <Button size='sm' onClick={onNewCard} aria-label='New card'>
            <Plus />
            <span className='max-sm:hidden'>New card</span>
          </Button>
        )}
      </div>
    </header>
  );
}
