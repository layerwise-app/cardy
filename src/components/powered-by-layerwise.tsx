// Cardy only ships a light theme, and its `dark:` variant follows the OS setting,
// so the badge stays light instead of switching with the system.
export function PoweredByLayerwise() {
  return (
    <a
      href='https://layerwise.app'
      target='_blank'
      rel='noopener'
      className='inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
    >
      <img
        src='https://layerwise.app/powered-by.png'
        alt='Powered by Layerwise'
        width={174}
        height={28}
        loading='lazy'
        className='h-7 w-auto'
      />
    </a>
  );
}
