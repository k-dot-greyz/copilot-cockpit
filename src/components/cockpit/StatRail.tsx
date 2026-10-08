import type { TriageStats } from '../../lib/triage';

export function StatRail({ stats }: { stats: TriageStats }) {
  return (
    <div className="stat-bar" data-testid="stat-rail">
      <div className="stat-item">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">Open</span>
      </div>
      <div className="stat-item">
        <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
          {stats.ready}
        </span>
        <span className="stat-label">Ready</span>
      </div>
      <div className="stat-item">
        <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
          {stats.drafts}
        </span>
        <span className="stat-label">Drafts</span>
      </div>
      <div className="stat-item">
        <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>
          {stats.byAuthorType.human}
        </span>
        <span className="stat-label">Human</span>
      </div>
      <div className="stat-item">
        <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
          {stats.byAuthorType.bot}
        </span>
        <span className="stat-label">Bot</span>
      </div>
      {stats.floodCount > 0 && (
        <div className="stat-item" style={{ borderColor: 'var(--border-danger)' }}>
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {stats.floodCount}
          </span>
          <span className="stat-label">Flood</span>
        </div>
      )}
    </div>
  );
}
