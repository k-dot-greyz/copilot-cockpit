import type { PR } from '../../lib/github';
import { timeAgo } from '../../lib/triage';

export function DuplicateAlert({
  clusters,
  onSelectCopies,
}: {
  clusters: { title: string; count: number; prs: PR[] }[];
  onSelectCopies: () => void;
}) {
  if (clusters.length === 0) return null;
  return (
    <div className="duplicate-alert glitch-rgb" data-testid="duplicate-alert">
      <h3>Duplicate titles</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {clusters.length} cluster{clusters.length === 1 ? '' : 's'} share identical titles.
        Keep the oldest; close the copies.
      </p>
      {clusters.slice(0, 4).map((cluster) => {
        const dates = cluster.prs.map((p) => p.createdAt).sort();
        return (
          <div className="duplicate-alert__row" key={cluster.title}>
            <div>
              <strong>{cluster.count}×</strong> {cluster.title}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {timeAgo(dates[0])} → {timeAgo(dates[dates.length - 1])}
              </div>
            </div>
          </div>
        );
      })}
      <button className="btn btn--primary" type="button" onClick={onSelectCopies}>
        Select copies (keep oldest)
      </button>
    </div>
  );
}
