import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className='cardy-brand'>
      <span className='brand-symbol' aria-hidden='true'>
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          cardy<span className='brand-dot'>.</span>
        </span>
      )}
    </span>
  );
}

export function PersonAvatar({
  name,
  index = 0,
}: {
  name: string;
  index?: number;
}) {
  return (
    <span className={`person-avatar avatar-${index % 4}`} title={name}>
      {name
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()}
    </span>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type='button'
      className='icon-button'
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Cover({ kind }: { kind: string }) {
  return (
    <div className={`card-cover cover-${kind}`} aria-hidden='true'>
      {kind === 'explore' && (
        <>
          <div className='cover-orbit' />
          <span className='cover-star'>✳</span>
          <span className='cover-small-star'>✦</span>
          <span className='cover-caption'>
            a little room
            <br />
            for big ideas.
          </span>
        </>
      )}
      {kind === 'board' && (
        <>
          <div className='mini-board'>
            <div>
              <i />
              <b />
              <b />
            </div>
            <div>
              <i />
              <b />
              <b />
              <b />
            </div>
            <div>
              <i />
              <b />
            </div>
          </div>
          <div className='mini-cursor'>
            <ArrowUpRight size={23} />
            <span>let’s make it happen</span>
          </div>
        </>
      )}
      {kind === 'palette' && (
        <>
          <span className='palette-disc disc-1' />
          <span className='palette-disc disc-2' />
          <span className='palette-disc disc-3' />
          <span className='palette-disc disc-4' />
          <span className='palette-caption'>a fresh perspective</span>
        </>
      )}
      {kind === 'direction' && (
        <>
          <span className='direction-circle' />
          <span className='direction-text'>
            less, but
            <br />
            <em>better.</em>
          </span>
          <span className='direction-star'>✳</span>
        </>
      )}
    </div>
  );
}
