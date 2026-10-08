import type { CockpitTarget } from '../../lib/config/cockpit';

export function RepoChip({
  target,
  onChange,
}: {
  target: CockpitTarget;
  onChange: (target: CockpitTarget) => void;
}) {
  return (
    <form
      className="repo-chip glitch-rgb"
      data-testid="repo-chip"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        onChange({
          owner: String(data.get('owner') ?? '').trim(),
          repo: String(data.get('repo') ?? '').trim(),
        });
      }}
    >
      <input name="owner" defaultValue={target.owner} aria-label="Repository owner" />
      <span>/</span>
      <input name="repo" defaultValue={target.repo} aria-label="Repository name" />
      <button className="btn btn--sm" type="submit">
        Load
      </button>
    </form>
  );
}
