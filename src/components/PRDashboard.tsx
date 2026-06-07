import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PR, PRDetail as PRDetailType } from '../lib/github';
import { fetchPRs, fetchPRDetail, bulkClosePRs, validateToken } from '../lib/github';
import { filterPRs, getUniqueLabels, type FilterCriteria } from '../lib/filters';
import { FilterBar } from './FilterBar';
import { PRDetail } from './PRDetail';
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
import { shouldHandleRefreshShortcut } from '../lib/keyboard-guards';
import { getAuthorizeUrl, exchangeCodeForToken } from '../lib/auth/oauth';

const OWNER = 'k-dot-greyz';
const REPO = 'dev-master';
const TOKEN_KEY = 'cockpit-gh-token';
const CLIENT_ID = import.meta.env.PUBLIC_GITHUB_CLIENT_ID || '';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/**
 * Renders a modal prompting the user to enter a GitHub Personal Access Token.
 *
 * The modal displays an optional error message, an auto-focused password input,
 * and a Connect button (disabled when the input is empty). Pressing Enter while
 * the input has content or clicking Connect invokes `onSubmit` with the token.
 *
 * @param onSubmit - Callback invoked with the entered token when the user submits.
 * @param error - Optional error message to show in the modal.
 * @returns The token-entry modal JSX element.
 */

function TokenModal({
  onSubmit,
  onOAuthLogin,
  error,
}: {
  onSubmit: (token: string) => void;
  onOAuthLogin: () => void;
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
          Stored in <code>sessionStorage</code> only — never sent anywhere except
          the GitHub API.
        </p>
        {error && (
          <p style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>
            ⚠ {error}
          </p>
        )}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && token && onSubmit(token)}
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              className="btn btn--primary"
              onClick={() => onSubmit(token)}
              disabled={!token}
            >
              Connect
            </button>
          </div>
          {CLIENT_ID && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
                <span style={{ padding: '0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>OR</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
              </div>
              <button
                className="btn btn--secondary"
                onClick={onOAuthLogin}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Login with GitHub
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render a compact stat bar showing triage metrics for the current PR set.
 *
 * @param stats - Triage metrics including `total`, `ready`, `drafts`, `byAuthorType` (`human`/`bot`), and `floodCount`.
 * @returns The stat bar element displaying Open PRs, Ready, Drafts, Human, Bot counts, and a highlighted "🚨 Flood" stat when `floodCount > 0`.
 */
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
      {stats.checks && stats.checks.success > 0 && (
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {stats.checks.success}
          </span>
          <span className="stat-label">✓ Passing</span>
        </div>
      )}
      {stats.checks && stats.checks.failure > 0 && (
        <div className="stat-item" style={{ borderColor: 'var(--border-danger)' }}>
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {stats.checks.failure}
          </span>
          <span className="stat-label">✗ Failing</span>
        </div>
      )}
      {stats.reviews && stats.reviews.approved > 0 && (
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {stats.reviews.approved}
          </span>
          <span className="stat-label">✓ Approved</span>
        </div>
      )}
      {stats.reviews && stats.reviews.changesRequested > 0 && (
        <div className="stat-item" style={{ borderColor: 'var(--border-danger)' }}>
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {stats.reviews.changesRequested}
          </span>
          <span className="stat-label">✗ Changes</span>
        </div>
      )}
    </div>
  );
}

/**
 * Render alert cards for each detected bot flood pattern and provide a per-flood "Nuke" action.
 *
 * @param floods - List of detected flood patterns to display; an empty array results in no output.
 * @param onNuke - Callback invoked with the array of PRs for a flood when the flood's "Nuke" button is clicked.
 * @param isNuking - When `true`, disables the "Nuke" buttons and updates their label to indicate an ongoing nuke operation.
 * @param nukeProgress - Optional progress object; when provided a progress bar and "Closing X / Y..." text are shown. `done` is the number completed and `total` is the total to process.
 * @returns The alert elements for the provided floods, or `null` if `floods` is empty.
 */
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

/**
 * Renders a pull request row with selection control, metadata, and a view link.
 *
 * @param pr - The pull request to display (number, title, url, author, authorType, isDraft, createdAt, headRefName).
 * @param selected - Whether the PR is currently selected.
 * @param onToggle - Callback invoked with the PR number when the selection checkbox is toggled.
 * @returns The JSX element for the PR card row
 */
function PRCard({
  pr,
  selected,
  onToggle,
  onViewDetail,
}: {
  pr: PR;
  selected: boolean;
  onToggle: (n: number) => void;
  onViewDetail: (n: number) => void;
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
          
          {/* Checks Badge */}
          {pr.checksStatus === 'success' && (
            <span className="badge badge--ready" title="All CI checks passed">✓ PASS</span>
          )}
          {pr.checksStatus === 'failure' && (
            <span className="badge badge--flood" title="CI checks failed">✗ FAIL</span>
          )}
          {pr.checksStatus === 'pending' && (
            <span className="badge badge--draft" title="CI checks pending">⟳ PENDING</span>
          )}

          {/* Review Decision Badge */}
          {pr.reviewDecision === 'APPROVED' && (
            <span className="badge badge--ready" title="Review approved">✓ APPROVED</span>
          )}
          {pr.reviewDecision === 'CHANGES_REQUESTED' && (
            <span className="badge badge--flood" title="Changes requested">✗ CHANGES</span>
          )}
          {pr.reviewDecision === 'REVIEW_REQUIRED' && (
            <span className="badge badge--draft" title="Review required">⟳ REVIEW</span>
          )}

          {/* Mergeable Indicator */}
          {pr.mergeable === 'CONFLICTING' && (
            <span className="badge badge--flood" title="Merge conflict detected">⚠️ CONFLICT</span>
          )}

          <span>{timeAgo(pr.createdAt)}</span>
          <code style={{ fontSize: '0.7rem', opacity: 0.6 }}>{pr.headRefName}</code>
        </div>
      </div>
      <div className="pr-card__actions" style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          className="btn btn--sm btn--primary"
          onClick={() => onViewDetail(pr.number)}
        >
          Inspect
        </button>
        <a
          className="btn btn--sm"
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open on GitHub"
        >
          ↗
        </a>
      </div>
    </div>
  );
}

/**
 * Render a collapsible PR section with selection controls, metadata, and PR cards.
 *
 * Renders a header showing the section title, emoji, PR count badge, select/deselect all button, and a contextual "Close N selected" button. When the PR list is long the section starts collapsed and shows only the first 10 items with a "Show X more" button to expand. If `prs` is empty, renders `null`.
 *
 * @param category - Identifier for the PR category shown in this section.
 * @param prs - The list of pull requests to display in this section.
 * @param selectedPRs - Set of selected PR numbers used to compute per-section selection counts and card selection state.
 * @param onToggle - Called with a PR number to toggle its selection state.
 * @param onSelectAll - Toggles selection for all PRs in this section (selects or deselects the group).
 * @param onCloseSelected - Closes the currently selected PRs in this section when invoked; receives the array of selected PR numbers from this section.
 * @param isClosing - When `true`, disables action buttons to indicate a close operation is in progress.
 * @returns A React element for the PR section, or `null` when `prs` is empty.
 */
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
  onViewDetail,
}: {
  title: string;
  emoji: string;
  category: PRCategory;
  prs: PR[];
  badgeClass: string;
  selectedPRs: Set<number>;
  onToggle: (n: number) => void;
  onSelectAll: (category: PRCategory) => void;
  onCloseSelected: (numbers: number[]) => void;
  isClosing: boolean;
  onViewDetail: (n: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(prs.length > 20);
  const selectedInSection = prs.filter((p) => selectedPRs.has(p.number));
  const selectedInGroup = selectedInSection.length;
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
              onClick={() => onCloseSelected(selectedInSection.map(p => p.number))}
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
            onViewDetail={onViewDetail}
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
/**
 * Dashboard UI for triaging GitHub pull requests and performing bulk actions.
 *
 * Manages authentication via a stored GitHub token, fetches and categorizes open PRs,
 * displays triage stats and flood alerts, and provides controls for selecting and
 * bulk-closing PRs (including destructive "nuke" actions for flood patterns).
 *
 * @returns The rendered PR dashboard element
 */

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

  // Filter state
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
    state: 'OPEN',
    authorType: 'all',
    label: 'all',
    reviewDecision: 'all',
    checksStatus: 'all',
    isDraft: 'all',
    searchQuery: '',
  });

  const uniqueLabels = useMemo(() => getUniqueLabels(prs), [prs]);

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

  // Detail drawer state
  const [activeDetailNumber, setActiveDetailNumber] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<PRDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleViewDetail = useCallback(async (num: number) => {
    if (!token) return;
    setActiveDetailNumber(num);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const data = await fetchPRDetail(OWNER, REPO, num, token);
      setDetailData(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to fetch PR details');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  const handleCloseDetail = useCallback(() => {
    setActiveDetailNumber(null);
    setDetailData(null);
    setDetailLoading(false);
    setDetailError(null);
  }, []);

  // OAuth state
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleOAuthLogin = useCallback(() => {
    const redirectUri = window.location.origin + window.location.pathname;
    const authorizeUrl = getAuthorizeUrl(CLIENT_ID, redirectUri);
    window.location.href = authorizeUrl;
  }, []);

  // Check for stored token or OAuth code on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      const exchange = async () => {
        setOauthLoading(true);
        setOauthError(null);
        try {
          const token = await exchangeCodeForToken(code);
          sessionStorage.setItem(TOKEN_KEY, token);
          setToken(token);
          // Remove code from URL
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, url.toString());
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to exchange OAuth code';
          setOauthError(errMsg);
          setTokenError(errMsg);
          setShowTokenModal(true);
        } finally {
          setOauthLoading(false);
        }
      };
      exchange();
    } else {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        setToken(stored);
      } else {
        setShowTokenModal(true);
      }
    }
  }, []);

  // Validate token
  useEffect(() => {
    if (!token) return;

    const init = async () => {
      const username = await validateToken(token);
      if (!username) {
        setTokenError('Invalid token — check scopes and expiry.');
        setShowTokenModal(true);
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      setUser(username);
      setShowTokenModal(false);
    };

    init();
  }, [token]);

  const loadPRs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statesToFetch: ('OPEN' | 'CLOSED' | 'MERGED')[] =
        filterCriteria.state === 'ALL'
          ? ['OPEN', 'CLOSED', 'MERGED']
          : [filterCriteria.state || 'OPEN'];

      const data = await fetchPRs(OWNER, REPO, token, {
        states: statesToFetch,
        onProgress: (loaded, total) => {
          setLoadProgress({ loaded, total });
        },
      });
      setPrs(data);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [token, filterCriteria.state]);

  // Load PRs on token or state filter change
  useEffect(() => {
    if (token && user) {
      loadPRs();
    }
  }, [token, user, loadPRs]);

  // Apply filters and update categorization/stats/floods
  useEffect(() => {
    const filtered = filterPRs(prs, filterCriteria);
    setCategories(categorizePRs(filtered));
    setStats(computeStats(filtered));
    setFloods(detectFlood(filtered));
  }, [prs, filterCriteria]);

  const handleTokenSubmit = (t: string) => {
    sessionStorage.setItem(TOKEN_KEY, t);
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

  const handleCloseSelected = async (numbers?: number[]) => {
    const numbersToClose = numbers || [...selectedPRs];
    if (!token || numbersToClose.length === 0) return;
    const confirmed = window.confirm(
      `Close ${numbersToClose.length} PRs and delete their branches? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsClosing(true);
    try {
      const result = await bulkClosePRs(
        OWNER,
        REPO,
        numbersToClose,
        token,
        true,
        (done, total) => setNukeProgress({ done, total })
      );

      // Remove closed PRs from state
      setPrs((prev) => {
        const remaining = prev.filter((p) => !result.closed.includes(p.number));
        setCategories(categorizePRs(remaining));
        setStats(computeStats(remaining));
        setFloods(detectFlood(remaining));
        return remaining;
      });
      setSelectedPRs(new Set());

      if (result.failed.length > 0) {
        setError(`Failed to close ${result.failed.length} PRs`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close PRs');
    } finally {
      setIsClosing(false);
      setNukeProgress(null);
    }
  };

  const handleNukeFlood = async (floodPRs: PR[]) => {
    if (!token) return;
    const confirmed = window.confirm(
      `☢ NUKE ${floodPRs.length} flood PRs and delete their branches?\n\nThis will close all duplicate bot PRs. The underlying issues remain open.\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setIsClosing(true);
    try {
      const numbers = floodPRs.map((p) => p.number);
      const result = await bulkClosePRs(
        OWNER,
        REPO,
        numbers,
        token,
        true,
        (done, total) => setNukeProgress({ done, total })
      );

      // Remove closed from state
      setPrs((prev) => {
        const closedSet = new Set(result.closed);
        const remaining = prev.filter((p) => !closedSet.has(p.number));
        setCategories(categorizePRs(remaining));
        setStats(computeStats(remaining));
        setFloods(detectFlood(remaining));
        return remaining;
      });
      setSelectedPRs(new Set());

      if (result.failed.length > 0) {
        setError(
          `Nuked ${result.closed.length} PRs. ${result.failed.length} failed.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to nuke flood PRs');
    } finally {
      setIsClosing(false);
      setNukeProgress(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser('');
    setPrs([]);
    setCategories(null);
    setStats(null);
    setFloods([]);
    setSelectedPRs(new Set());
    setError(null);
    setLastFetched(null);
    setShowTokenModal(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        !shouldHandleRefreshShortcut(e.key, e.target, {
          isClosing,
          loading,
        })
      ) {
        return;
      }
      loadPRs();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loadPRs, isClosing, loading]);

  /* ---- Render ---- */

  return (
    <div className="app-shell">
      {showTokenModal && (
        <TokenModal
          onSubmit={handleTokenSubmit}
          onOAuthLogin={handleOAuthLogin}
          error={tokenError}
        />
      )}

      {/* OAuth Loading */}
      {oauthLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Exchanging GitHub OAuth code for access token...</span>
        </div>
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
            disabled={loading || isClosing}
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

          <FilterBar
            criteria={filterCriteria}
            onChange={setFilterCriteria}
            uniqueLabels={uniqueLabels}
          />

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
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {selectedPRs.size} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn--danger"
                  onClick={handleCloseSelected}
                  disabled={isClosing}
                >
                  {isClosing
                    ? `Closing ${nukeProgress?.done || 0}/${nukeProgress?.total || selectedPRs.size}...`
                    : `☢ Close ${selectedPRs.size} PRs + delete branches`}
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
            onViewDetail={handleViewDetail}
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
            onViewDetail={handleViewDetail}
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
            onViewDetail={handleViewDetail}
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
            onViewDetail={handleViewDetail}
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
            onViewDetail={handleViewDetail}
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
            onViewDetail={handleViewDetail}
          />

          {/* Rich Detail Drawer */}
          <PRDetail
            detail={detailData}
            loading={detailLoading}
            error={detailError}
            onClose={handleCloseDetail}
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
