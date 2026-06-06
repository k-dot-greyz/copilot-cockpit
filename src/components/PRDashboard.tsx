import { useState, useEffect, useCallback } from 'react';
import type { PR } from '../lib/github';
import { fetchOpenPRs, bulkClosePRs, validateToken } from '../lib/github';
import PRDetailDrawer from './PRDetailDrawer';
import {
  categorizePRs,
  computeStats,
  detectFlood,
  timeAgo,
  type CategorizedPRs,
  type FloodPattern,
  type TriageStats,
  type PRCategory,
} from '../lib/triage';

const OWNER = 'k-dot-greyz';
const REPO = 'dev-master';
const TOKEN_KEY = 'cockpit-gh-token';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TokenModal({
  onSubmit,
  error,
}: {
  onSubmit: (token: string) => void;
  error?: string;
}) {
  const [token, setToken] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>🔑 GitHub Token</h2>
        <p>
          Enter a Personal Access Token with <code>repo</code> scope.
          <br />
          Stored in <code>localStorage</code> only — never sent anywhere except
          the GitHub API.
        </p>
        {error && (
          <p style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>
            ⚠ {error}
          </p>
        )}
        <input
          className="input"
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && token && onSubmit(token)}
          autoFocus
        />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn--primary"
            onClick={() => onSubmit(token)}
            disabled={!token}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBar({ stats }: { stats: TriageStats }) {
  return (
    <div className="stat-bar">
      <div className="stat-item">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">Open PRs</span>
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
          <span className="stat-label">🚨 Flood</span>
        </div>
      )}
    </div>
  );
}

function FloodAlert({
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
                🚨 Bot Flood Detected: <code>{flood.pattern}</code>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {flood.count} draft PRs targeting {flood.uniqueIssues} unique
                issues — avg {(flood.count / Math.max(flood.uniqueIssues, 1)).toFixed(1)}x
                duplication
              </p>
            </div>
            <button
              className="btn btn--danger"
              onClick={() => onNuke(flood.prs)}
              disabled={isNuking}
            >
              {isNuking ? 'Nuking...' : `☢ Nuke ${flood.count} PRs`}
            </button>
          </div>
          <div className="flood-alert__stats">
            <span>
              📅 {timeAgo(flood.dateRange.oldest)} → {timeAgo(flood.dateRange.newest)}
            </span>
            <span>🎯 {flood.uniqueIssues} unique issues</span>
            <span>📝 All drafts</span>
          </div>
          {nukeProgress && (
            <div className="progress-bar" style={{ marginTop: '1rem' }}>
              <div
                className="progress-bar__fill"
                style={{
                  width: `${(nukeProgress.done / nukeProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
          {nukeProgress && (
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Closing {nukeProgress.done} / {nukeProgress.total}...
            </p>
          )}
        </div>
      ))}
    </>
  );
}

function PRCard({
  pr,
  selected,
  onToggle,
  onClick,
}: {
  pr: PR;
  selected: boolean;
  onToggle: (n: number) => void;
  onClick: () => void;
}) {
  const authorBadgeClass =
    pr.authorType === 'human'
      ? 'badge--human'
      : pr.authorType === 'bot'
        ? 'badge--bot'
        : 'badge--external';

  return (
    <div className={`pr-card ${selected ? 'pr-card--selected' : ''}`}>
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(pr.number)}
        />
      </label>
      <div onClick={onClick} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
        <div className="pr-card__title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="pr-card__number">#{pr.number}</span>{' '}
          <span className="pr-card__title-clickable" style={{ fontWeight: 600 }}>
            {pr.title}
          </span>
          {pr.commentCount > 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Comments">
              💬 {pr.commentCount}
            </span>
          )}
          {pr.mergeable === 'CONFLICTING' && (
            <span className="badge badge--conflict" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
              Conflict
            </span>
          )}
        </div>
        <div className="pr-card__meta">
          <span className={`badge ${authorBadgeClass}`}>{pr.author}</span>
          <span className={`badge ${pr.isDraft ? 'badge--draft' : 'badge--ready'}`}>
            {pr.isDraft ? 'draft' : 'ready'}
          </span>
          <span>{timeAgo(pr.createdAt)}</span>
          <code style={{ fontSize: '0.7rem', opacity: 0.6 }}>{pr.headRefName}</code>
        </div>
      </div>
      <div className="pr-card__actions" style={{ marginLeft: '1rem' }}>
        <button className="btn btn--sm" onClick={onClick}>
          Inspect
        </button>
        <a
          className="btn btn--sm"
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open on GitHub ↗"
          style={{ padding: '0.3rem 0.45rem' }}
        >
          ↗
        </a>
      </div>
    </div>
  );
}

function PRSection({
  title,
  emoji,
  category,
  prs,
  badgeClass,
  selectedPRs,
  onToggle,
  onSelectAll,
  onCloseSelected,
  isClosing,
  onCardClick,
}: {
  title: string;
  emoji: string;
  category: PRCategory;
  prs: PR[];
  badgeClass: string;
  selectedPRs: Set<number>;
  onToggle: (n: number) => void;
  onSelectAll: (category: PRCategory) => void;
  onCloseSelected: () => void;
  isClosing: boolean;
  onCardClick: (pr: PR) => void;
}) {
  const [collapsed, setCollapsed] = useState(prs.length > 20);
  const selectedInGroup = prs.filter((p) => selectedPRs.has(p.number)).length;
  const displayPRs = collapsed ? prs.slice(0, 10) : prs;

  if (prs.length === 0) return null;

  return (
    <div className="section-group">
      <div className="section-header">
        <h2>
          {emoji} {title}{' '}
          <span className={`badge ${badgeClass}`}>{prs.length}</span>
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {selectedInGroup > 0 && (
            <button
              className="btn btn--danger btn--sm"
              onClick={onCloseSelected}
              disabled={isClosing}
            >
              Close {selectedInGroup} selected
            </button>
          )}
          <button
            className="btn btn--sm"
            onClick={() => onSelectAll(category)}
          >
            {selectedInGroup === prs.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="section-count">{prs.length} PRs</span>
        </div>
      </div>
      <div className="pr-grid">
        {displayPRs.map((pr) => (
          <PRCard
            key={pr.number}
            pr={pr}
            selected={selectedPRs.has(pr.number)}
            onToggle={onToggle}
            onClick={() => onCardClick(pr)}
          />
        ))}
      </div>
      {collapsed && prs.length > 10 && (
        <button
          className="btn"
          style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
          onClick={() => setCollapsed(false)}
        >
          Show {prs.length - 10} more
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */

export default function PRDashboard() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [user, setUser] = useState<string>('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Data state
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // Triage state
  const [categories, setCategories] = useState<CategorizedPRs | null>(null);
  const [stats, setStats] = useState<TriageStats | null>(null);
  const [floods, setFloods] = useState<FloodPattern[]>([]);

  // Selection state
  const [selectedPRs, setSelectedPRs] = useState<Set<number>>(new Set());

  // Action state
  const [isClosing, setIsClosing] = useState(false);
  const [nukeProgress, setNukeProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  // Upgraded States
  const [activePR, setActivePR] = useState<PR | null>(null);
  const [deleteBranchOnClose, setDeleteBranchOnClose] = useState(false);

  // Check for stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
    } else {
      setShowTokenModal(true);
    }
  }, []);

  // Validate token and fetch PRs
  useEffect(() => {
    if (!token) return;

    const init = async () => {
      const username = await validateToken(token);
      if (!username) {
        setTokenError('Invalid token — check scopes and expiry.');
        setShowTokenModal(true);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      setUser(username);
      setShowTokenModal(false);
      loadPRs();
    };

    init();
  }, [token]);

  const loadPRs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOpenPRs(OWNER, REPO, token, (loaded, total) => {
        setLoadProgress({ loaded, total });
      });
      setPrs(data);
      setCategories(categorizePRs(data));
      setStats(computeStats(data));
      setFloods(detectFlood(data));
      setLastFetched(new Date().toLocaleTimeString());
      
      // Update activePR ref if it is currently open in drawer
      if (activePR) {
        const updated = data.find(p => p.number === activePR.number);
        if (updated) {
          setActivePR(updated);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [token, activePR]);

  const handleTokenSubmit = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setTokenError(undefined);
    setToken(t);
  };

  const handleToggle = (n: number) => {
    setSelectedPRs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleSelectAll = (category: PRCategory) => {
    if (!categories) return;
    const groupPRs = categories[category];
    const allSelected = groupPRs.every((p) => selectedPRs.has(p.number));
    setSelectedPRs((prev) => {
      const next = new Set(prev);
      for (const pr of groupPRs) {
        if (allSelected) next.delete(pr.number);
        else next.add(pr.number);
      }
      return next;
    });
  };

  const handleCloseSelected = async () => {
    if (!token || selectedPRs.size === 0) return;
    const confirmed = window.confirm(
      `Close ${selectedPRs.size} PRs${deleteBranchOnClose ? ' and delete their branches' : ''}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsClosing(true);
    const numbers = [...selectedPRs];
    const result = await bulkClosePRs(
      OWNER,
      REPO,
      numbers,
      token,
      deleteBranchOnClose,
      (done, total) => setNukeProgress({ done, total })
    );

    // Remove closed PRs from state
    setPrs((prev) => prev.filter((p) => !result.closed.includes(p.number)));
    setSelectedPRs(new Set());
    setIsClosing(false);
    setNukeProgress(null);

    if (result.failed.length > 0) {
      setError(`Failed to close ${result.failed.length} PRs`);
    }

    // Re-categorize
    const remaining = prs.filter((p) => !result.closed.includes(p.number));
    setCategories(categorizePRs(remaining));
    setStats(computeStats(remaining));
    setFloods(detectFlood(remaining));
  };

  const handleNukeFlood = async (floodPRs: PR[]) => {
    if (!token) return;
    const confirmed = window.confirm(
      `☢ NUKE ${floodPRs.length} flood PRs${deleteBranchOnClose ? ' and delete their branches' : ''}?\n\nThis will close all duplicate bot PRs. The underlying issues remain open.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setIsClosing(true);
    const numbers = floodPRs.map((p) => p.number);
    const result = await bulkClosePRs(
      OWNER,
      REPO,
      numbers,
      token,
      deleteBranchOnClose,
      (done, total) => setNukeProgress({ done, total })
    );

    // Remove closed from state
    const closedSet = new Set(result.closed);
    const remaining = prs.filter((p) => !closedSet.has(p.number));
    setPrs(remaining);
    setCategories(categorizePRs(remaining));
    setStats(computeStats(remaining));
    setFloods(detectFlood(remaining));
    setSelectedPRs(new Set());
    setIsClosing(false);
    setNukeProgress(null);

    if (result.failed.length > 0) {
      setError(
        `Nuked ${result.closed.length} PRs. ${result.failed.length} failed.`
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPrs([]);
    setCategories(null);
    setStats(null);
    setFloods([]);
    setShowTokenModal(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'r') loadPRs();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loadPRs]);

  /* ---- Render ---- */

  return (
    <div className="app-shell">
      {showTokenModal && (
        <TokenModal onSubmit={handleTokenSubmit} error={tokenError} />
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>👨‍✈️ Copilot Cockpit</h1>
          {user && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              @{user}
            </span>
          )}
        </div>
        <div className="header-right">
          {lastFetched && (
            <span
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Updated {lastFetched}
            </span>
          )}
          <button
            className="btn btn--sm"
            onClick={loadPRs}
            disabled={loading}
            title="Refresh (R)"
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
          <kbd className="kbd">R</kbd>
          {token && (
            <button className="btn btn--sm" onClick={handleLogout}>
              🔓 Logout
            </button>
          )}
        </div>
      </header>

      {/* Error */}
      {error && (
        <div
          className="card card--danger"
          style={{ marginBottom: 'var(--space-lg)' }}
        >
          <p style={{ color: 'var(--accent-red)' }}>⚠ {error}</p>
          <button
            className="btn btn--sm"
            onClick={() => setError(null)}
            style={{ marginTop: '0.5rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>
            Loading PRs... {loadProgress.loaded} / ~{loadProgress.total}
          </span>
          <div className="progress-bar" style={{ width: '200px' }}>
            <div
              className="progress-bar__fill"
              style={{
                width: `${
                  loadProgress.total
                    ? (loadProgress.loaded / loadProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && stats && categories && (
        <>
          <StatBar stats={stats} />

          <FloodAlert
            floods={floods}
            onNuke={handleNukeFlood}
            isNuking={isClosing}
            nukeProgress={nukeProgress}
          />

          {/* Bulk action bar */}
          {selectedPRs.size > 0 && (
            <div
              className="card"
              style={{
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: '1rem',
                zIndex: 10,
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {selectedPRs.size} selected
                </span>
                <label className="checkbox-wrapper" style={{ fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={deleteBranchOnClose}
                    onChange={(e) => setDeleteBranchOnClose(e.target.checked)}
                  />
                  <span>Delete associated branches on close</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn--danger"
                  onClick={handleCloseSelected}
                  disabled={isClosing}
                >
                  {isClosing
                    ? `Closing ${nukeProgress?.done || 0}/${nukeProgress?.total || selectedPRs.size}...`
                    : `Close Selected`}
                </button>
                <button
                  className="btn btn--sm"
                  onClick={() => setSelectedPRs(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <PRSection
            title="Your PRs — Ready for Review"
            emoji="🔥"
            category="human-ready"
            prs={categories['human-ready']}
            badgeClass="badge--ready"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />

          <PRSection
            title="Your Drafts"
            emoji="📝"
            category="human-draft"
            prs={categories['human-draft']}
            badgeClass="badge--draft"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />

          <PRSection
            title="Bot Test/Security Coverage"
            emoji="🧪"
            category="bot-tests"
            prs={categories['bot-tests']}
            badgeClass="badge--bot"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />

          <PRSection
            title="Bot — Other"
            emoji="🤖"
            category="bot-other"
            prs={categories['bot-other']}
            badgeClass="badge--bot"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />

          <PRSection
            title="Bot Flood (Duplicates)"
            emoji="🚨"
            category="bot-flood"
            prs={categories['bot-flood']}
            badgeClass="badge--flood"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />

          <PRSection
            title="External"
            emoji="👥"
            category="external"
            prs={categories['external']}
            badgeClass="badge--external"
            selectedPRs={selectedPRs}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onCloseSelected={handleCloseSelected}
            isClosing={isClosing}
            onCardClick={setActivePR}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && prs.length === 0 && token && !showTokenModal && (
        <div className="empty-state">
          <p>No open PRs found. 🎉</p>
          <button className="btn btn--primary" onClick={loadPRs}>
            Refresh
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      {activePR && (
        <PRDetailDrawer
          pr={activePR}
          token={token}
          owner={OWNER}
          repo={REPO}
          onClose={() => setActivePR(null)}
          onUpdate={loadPRs}
        />
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: 'var(--space-2xl)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Copilot Cockpit · {OWNER}/{REPO} · dex_id: 0x7D:0x10
      </footer>
    </div>
  );
}
