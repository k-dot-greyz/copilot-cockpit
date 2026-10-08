import type { PR } from '../../lib/github';
import { timeAgo } from '../../lib/triage';

export function CockpitPRCard({
  pr,
  selected,
  focused,
  onToggle,
  onInspect,
}: {
  pr: PR;
  selected: boolean;
  focused: boolean;
  onToggle: (n: number) => void;
  onInspect: (n: number) => void;
}) {
  const authorBadgeClass =
    pr.authorType === 'human'
      ? 'badge--human'
      : pr.authorType === 'bot'
        ? 'badge--bot'
        : 'badge--external';

  return (
    <div
      className={`pr-card glitch-rgb ${selected ? 'pr-card--selected' : ''} ${focused ? 'pr-card--focused' : ''}`}
      data-pr-number={pr.number}
    >
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(pr.number)}
          aria-label={`Select PR #${pr.number}`}
        />
      </label>
      <div>
        <div className="pr-card__title">
          <span className="pr-card__number">#{pr.number}</span>{' '}
          <a href={pr.url} target="_blank" rel="noopener noreferrer">
            {pr.title}
          </a>
        </div>
        <div className="pr-card__meta">
          <span className={`badge ${authorBadgeClass}`}>{pr.author}</span>
          <span className={`badge ${pr.isDraft ? 'badge--draft' : 'badge--ready'}`}>
            {pr.isDraft ? 'draft' : 'ready'}
          </span>
          {pr.checksStatus === 'success' && <span className="badge badge--ready">✓ PASS</span>}
          {pr.checksStatus === 'failure' && <span className="badge badge--flood">✗ FAIL</span>}
          {pr.checksStatus === 'pending' && <span className="badge badge--draft">⟳ PENDING</span>}
          {pr.reviewDecision === 'APPROVED' && <span className="badge badge--ready">✓ APPROVED</span>}
          {pr.reviewDecision === 'CHANGES_REQUESTED' && (
            <span className="badge badge--flood">✗ CHANGES</span>
          )}
          {pr.mergeable === 'CONFLICTING' && <span className="badge badge--flood">⚠️ CONFLICT</span>}
          <span>{timeAgo(pr.createdAt)}</span>
        </div>
      </div>
      <div className="pr-card__actions">
        <button className="btn btn--sm btn--primary" type="button" onClick={() => onInspect(pr.number)}>
          Inspect
        </button>
        <a className="btn btn--sm" href={pr.url} target="_blank" rel="noopener noreferrer" title="Open on GitHub">
          ↗
        </a>
      </div>
    </div>
  );
}
