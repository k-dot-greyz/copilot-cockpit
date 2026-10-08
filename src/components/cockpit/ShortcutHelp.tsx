export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="help-title">Keyboard</h2>
        <div className="help-grid">
          <kbd className="kbd">⌘K</kbd>
          <span>Command palette</span>
          <kbd className="kbd">/</kbd>
          <span>Search palette</span>
          <kbd className="kbd">R</kbd>
          <span>Refresh</span>
          <kbd className="kbd">J</kbd>
          <span>Next PR</span>
          <kbd className="kbd">K</kbd>
          <span>Previous PR</span>
          <kbd className="kbd">X</kbd>
          <span>Toggle select</span>
          <kbd className="kbd">I</kbd>
          <span>Inspect</span>
          <kbd className="kbd">?</kbd>
          <span>This help</span>
          <kbd className="kbd">Esc</kbd>
          <span>Close overlay</span>
        </div>
        <button className="btn" type="button" onClick={onClose} style={{ marginTop: '1rem' }}>
          Close
        </button>
      </div>
    </div>
  );
}
