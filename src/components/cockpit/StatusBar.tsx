import type { CockpitTarget } from '../../lib/config/cockpit';

export function StatusBar({
  target,
  selectedCount,
}: {
  target: CockpitTarget;
  selectedCount: number;
}) {
  return (
    <footer className="status-bar" data-testid="status-bar">
      <span>
        cockpit · {target.owner}/{target.repo} · dex 0x7D:0x10
      </span>
      <span>
        {selectedCount} selected
        <kbd className="kbd">⌘K</kbd> command
        <kbd className="kbd">?</kbd> help
        <kbd className="kbd">R</kbd> refresh
      </span>
    </footer>
  );
}
