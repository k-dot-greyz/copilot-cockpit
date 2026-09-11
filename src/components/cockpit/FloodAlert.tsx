import type { FloodPattern } from '../../lib/triage';
import { timeAgo } from '../../lib/triage';
import type { PR } from '../../lib/github';

export function FloodAlert({
  floods,
  onNuke,
  isNuking,
  nukeProgress,
}: {
  floods: FloodPattern[];
  onNuke: (prs: PR[]) => void;
  isNuking: boolean;
  nukeProgress: { done: number; total: number } | null;
}) {
  if (floods.length === 0) return null;
  return (
    <>
      {floods.map((flood) => (
        <div className="flood-alert" key={flood.pattern}>
          <div className="flood-alert__header">
            <div>
              <h3 style={{ color: 'var(--accent-red)', marginBottom: '0.5rem' }}>
                Bot flood: <code>{flood.pattern}</code>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {flood.count} PRs targeting {flood.uniqueIssues} unique issues
              </p>
            </div>
            <button className="btn btn--danger" type="button" onClick={() => onNuke(flood.prs)} disabled={isNuking}>
              {isNuking ? 'Nuking…' : `Nuke ${flood.count}`}
            </button>
          </div>
          <div className="flood-alert__stats">
            <span>
              {timeAgo(flood.dateRange.oldest)} → {timeAgo(flood.dateRange.newest)}
            </span>
          </div>
          {nukeProgress && (
            <div className="progress-bar" style={{ marginTop: '1rem' }}>
              <div
                className="progress-bar__fill"
                style={{ width: `${(nukeProgress.done / nukeProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
