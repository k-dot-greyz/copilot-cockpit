import type { PaletteItem } from '../../lib/commands/palette';

export function CommandPalette({
  query,
  onQuery,
  items,
  activeIndex,
  onSelect,
  onClose,
}: {
  query: string;
  onQuery: (q: string) => void;
  items: PaletteItem[];
  activeIndex: number;
  onSelect: (item: PaletteItem) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="input palette__search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search PRs or run an action…"
          aria-label="Command search"
          autoFocus
        />
        <div className="palette__list" role="listbox">
          {items.length === 0 && (
            <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>No matches</p>
          )}
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              className="palette-item"
              aria-selected={index === activeIndex}
              onMouseEnter={() => undefined}
              onClick={() => onSelect(item)}
            >
              <span>{item.label}</span>
              <span className="palette-item__kind">{item.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
