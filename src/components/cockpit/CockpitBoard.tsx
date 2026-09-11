import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PR, PRDetail as PRDetailType } from '../../lib/github';
import { fetchPRs, fetchPRDetail, bulkClosePRs, validateToken } from '../../lib/github';
import { filterPRs, getUniqueLabels, type FilterCriteria } from '../../lib/filters';
import { FilterBar } from '../FilterBar';
import { PRDetail } from '../PRDetail';
import {
  categorizePRs,
  computeStats,
  deriveStateAfterBulkClose,
  detectFlood,
  findDuplicates,
  type FloodPattern,
  type TriageStats,
  type CategorizedPRs,
} from '../../lib/triage';
import { isTextInput, shouldHandleRefreshShortcut } from '../../lib/keyboard-guards';
import { getAuthorizeUrl, exchangeCodeForToken, validateOAuthState } from '../../lib/auth/oauth';
import { loadDefaultCockpit, TARGET_OVERRIDE_KEY } from '../../lib/config/load';
import type { CockpitTarget, ParsedCockpit } from '../../lib/config/cockpit';
import { searchPalette, type PaletteItem } from '../../lib/commands/palette';
import { numbersToCloseKeepingOldest } from '../../lib/duplicates';
import { useGlitchIslands } from './useGlitchIslands';
import { TokenGate } from './TokenGate';
import { StatRail } from './StatRail';
import { FloodAlert } from './FloodAlert';
import { DuplicateAlert } from './DuplicateAlert';
import { LaneColumn } from './LaneColumn';
import { CommandPalette } from './CommandPalette';
import { ConfirmModal } from './ConfirmModal';
import { ShortcutHelp } from './ShortcutHelp';
import { RepoChip } from './RepoChip';
import { StatusBar } from './StatusBar';
import { loadDemoPrs } from '../../lib/fixtures/demo-board';

const CLIENT_ID = import.meta.env.PUBLIC_GITHUB_CLIENT_ID || '';

function readOverride(): CockpitTarget | null {
  try {
    const raw = localStorage.getItem(TARGET_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CockpitTarget;
    if (parsed.owner && parsed.repo) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export default function CockpitBoard() {
  useGlitchIslands();
  const [cockpit, setCockpit] = useState<ParsedCockpit>(() => loadDefaultCockpit(readOverride()));

  const TOKEN_KEY = cockpit.auth.tokenKey;
  const { owner, repo } = cockpit.target;

  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [user, setUser] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

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
  const [categories, setCategories] = useState<CategorizedPRs | null>(null);
  const [stats, setStats] = useState<TriageStats | null>(null);
  const [floods, setFloods] = useState<FloodPattern[]>([]);
  const [selectedPRs, setSelectedPRs] = useState<Set<number>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const [nukeProgress, setNukeProgress] = useState<{ done: number; total: number } | null>(null);

  const [detailData, setDetailData] = useState<PRDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [oauthLoading, setOauthLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusedNumber, setFocusedNumber] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    numbers: number[];
    deleteBranches: boolean;
  } | null>(null);

  const duplicates = useMemo(() => findDuplicates(prs), [prs]);
  const paletteItems = useMemo(
    () => searchPalette(paletteQuery, prs, cockpit.actions),
    [paletteQuery, prs, cockpit.actions]
  );
  const orderedPrs = useMemo(() => {
    if (!categories) return [] as PR[];
    return cockpit.lanes.flatMap((lane) => categories[lane.id as keyof CategorizedPRs] ?? []);
  }, [categories, cockpit.lanes]);

  const handleTargetChange = (next: CockpitTarget) => {
    try {
      localStorage.setItem(TARGET_OVERRIDE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setCockpit(loadDefaultCockpit(next));
  };

  const handleOAuthLogin = useCallback(() => {
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = getAuthorizeUrl(CLIENT_ID, redirectUri);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code) {
      const exchange = async () => {
        setOauthLoading(true);
        try {
          if (!validateOAuthState(state)) {
            throw new Error('OAuth state mismatch — please try logging in again.');
          }
          const nextToken = await exchangeCodeForToken(code);
          sessionStorage.setItem(TOKEN_KEY, nextToken);
          setToken(nextToken);
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.toString());
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to exchange OAuth code';
          setTokenError(errMsg);
          setShowTokenModal(true);
        } finally {
          setOauthLoading(false);
        }
      };
      void exchange();
    } else {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (new URLSearchParams(window.location.search).get('demo') === '1') {
        setToken('demo');
        setUser('demo');
        setShowTokenModal(false);
        setPrs(loadDemoPrs());
        setLastFetched('demo');
      } else if (stored) setToken(stored);
      else setShowTokenModal(true);
    }
  }, [TOKEN_KEY]);

  useEffect(() => {
    if (!token) return;
    if (token === 'demo') {
      setUser('demo');
      setShowTokenModal(false);
      return;
    }
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
    void init();
  }, [token, TOKEN_KEY]);

  const loadPRs = useCallback(async () => {
    if (token === 'demo') {
      setPrs(loadDemoPrs());
      setLastFetched(new Date().toLocaleTimeString());
      return;
    }
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statesToFetch: ('OPEN' | 'CLOSED' | 'MERGED')[] =
        filterCriteria.state === 'ALL'
          ? ['OPEN', 'CLOSED', 'MERGED']
          : [filterCriteria.state || 'OPEN'];
      const data = await fetchPRs(owner, repo, token, {
        states: statesToFetch,
        onProgress: (loaded, total) => setLoadProgress({ loaded, total }),
      });
      setPrs(data);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [token, filterCriteria.state, owner, repo]);

  useEffect(() => {
    if (token && user) void loadPRs();
  }, [token, user, loadPRs]);

  useEffect(() => {
    const filtered = filterPRs(prs, filterCriteria);
    setCategories(categorizePRs(filtered));
    setStats(computeStats(filtered));
    setFloods(detectFlood(filtered, cockpit.flood.minCount));
  }, [prs, filterCriteria, cockpit.flood.minCount]);

  const handleViewDetail = useCallback(
    async (num: number) => {
      setFocusedNumber(num);
      setDetailLoading(true);
      setDetailError(null);
      setDetailData(null);
      try {
        if (token === 'demo') {
          const pr = prs.find((p) => p.number === num);
          setDetailData({
            number: num,
            title: pr?.title ?? `Demo PR #${num}`,
            body: 'Offline demo fixture. Connect a PAT to load live GitHub review/commits.',
            state: pr?.state ?? 'OPEN',
            draft: pr?.isDraft ?? false,
            createdAt: pr?.createdAt ?? '',
            updatedAt: pr?.updatedAt ?? '',
            url: pr?.url ?? '#',
            headRefName: pr?.headRefName ?? '',
            baseRefName: 'main',
            additions: pr?.additions ?? 0,
            deletions: pr?.deletions ?? 0,
            changedFiles: 0,
            mergeable: pr?.mergeable ?? 'UNKNOWN',
            reviewDecision: pr?.reviewDecision ?? null,
            author: pr?.author ?? 'demo',
            authorAvatarUrl: '',
            commits: [],
            files: [],
            reviews: [],
            linkedIssues: [],
          });
          return;
        }
        if (!token) return;
        setDetailData(await fetchPRDetail(owner, repo, num, token));
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Failed to fetch PR details');
      } finally {
        setDetailLoading(false);
      }
    },
    [token, owner, repo, prs]
  );

  const handleToggle = (n: number) => {
    setSelectedPRs((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleSelectAll = (ids: number[]) => {
    setSelectedPRs((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const runClose = async (numbers: number[], deleteBranches: boolean) => {
    if (!token || numbers.length === 0) return;
    setIsClosing(true);
    try {
      const result = await bulkClosePRs(
        owner,
        repo,
        numbers,
        token,
        deleteBranches,
        (done, total) => setNukeProgress({ done, total })
      );
      const derived = deriveStateAfterBulkClose(prs, result.closed);
      setPrs(derived.remaining);
      setCategories(derived.categories);
      setStats(derived.stats);
      setFloods(derived.floods);
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

  const handlePaletteSelect = (item: PaletteItem) => {
    setPaletteOpen(false);
    setPaletteQuery('');
    if (item.kind === 'pr') {
      void handleViewDetail(item.prNumber);
      return;
    }
    if (item.id === 'refresh') void loadPRs();
    if (item.id === 'close-selected') {
      setConfirm({
        title: 'Close selected PRs',
        body: `Close ${selectedPRs.size} PRs and delete their branches? This cannot be undone.`,
        confirmLabel: `Close ${selectedPRs.size}`,
        numbers: [...selectedPRs],
        deleteBranches: true,
      });
    }
    if (item.id === 'nuke-flood') {
      const numbers = floods.flatMap((f) => f.prs.map((p) => p.number));
      setConfirm({
        title: 'Nuke flood',
        body: `Close ${numbers.length} flood PRs and delete branches? Issues stay open.`,
        confirmLabel: `Nuke ${numbers.length}`,
        numbers,
        deleteBranches: true,
      });
    }
    if (item.id === 'select-duplicate-copies') {
      setSelectedPRs(new Set(numbersToCloseKeepingOldest(duplicates)));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        setConfirm(null);
        setDetailData(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (isTextInput(e.target)) return;

      if (e.key === '/' && !paletteOpen) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === '?' && !paletteOpen) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (
        shouldHandleRefreshShortcut(e.key, e.target, { isClosing, loading })
      ) {
        void loadPRs();
        return;
      }
      if (paletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPaletteIndex((i) => Math.min(i + 1, Math.max(paletteItems.length - 1, 0)));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPaletteIndex((i) => Math.max(i - 1, 0));
        }
        if (e.key === 'Enter' && paletteItems[paletteIndex]) {
          e.preventDefault();
          handlePaletteSelect(paletteItems[paletteIndex]);
        }
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        const idx = orderedPrs.findIndex((p) => p.number === focusedNumber);
        const next = orderedPrs[Math.min(idx + 1, orderedPrs.length - 1)] ?? orderedPrs[0];
        if (next) setFocusedNumber(next.number);
      }
      if (e.key === 'k' || e.key === 'K') {
        const idx = orderedPrs.findIndex((p) => p.number === focusedNumber);
        const next = orderedPrs[Math.max(idx - 1, 0)] ?? orderedPrs[0];
        if (next) setFocusedNumber(next.number);
      }
      if ((e.key === 'x' || e.key === 'X') && focusedNumber) handleToggle(focusedNumber);
      if ((e.key === 'i' || e.key === 'I') && focusedNumber) void handleViewDetail(focusedNumber);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    isClosing,
    loading,
    loadPRs,
    paletteOpen,
    paletteItems,
    paletteIndex,
    orderedPrs,
    focusedNumber,
    handleViewDetail,
  ]);

  useEffect(() => {
    setPaletteIndex(0);
  }, [paletteQuery]);

  return (
    <div className="app-shell" data-testid="cockpit-board">
      {showTokenModal && (
        <TokenGate
          onSubmit={(t) => {
            sessionStorage.setItem(TOKEN_KEY, t);
            setTokenError(undefined);
            setToken(t);
          }}
          onOAuthLogin={handleOAuthLogin}
          error={tokenError}
          oauthAvailable={Boolean(CLIENT_ID)}
        />
      )}

      {oauthLoading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>Exchanging GitHub OAuth code…</span>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <h1>Copilot Cockpit</h1>
          <RepoChip target={cockpit.target} onChange={handleTargetChange} />
          {user && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>@{user}</span>}
        </div>
        <div className="header-right">
          {lastFetched && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              Updated {lastFetched}
            </span>
          )}
          <button className="btn btn--sm glitch-rgb" type="button" onClick={() => setPaletteOpen(true)}>
            Command
          </button>
          <button className="btn btn--sm" type="button" onClick={() => void loadPRs()} disabled={loading || isClosing}>
            {loading ? '⟳' : '↻'} Refresh
          </button>
          {token && (
            <button
              className="btn btn--sm"
              type="button"
              onClick={() => {
                sessionStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser('');
                setPrs([]);
                setShowTokenModal(true);
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="card card--danger" style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ color: 'var(--accent-red)' }}>⚠ {error}</p>
          <button className="btn btn--sm" type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <span>
            Loading PRs… {loadProgress.loaded} / ~{loadProgress.total}
          </span>
        </div>
      )}

      {!loading && stats && categories && (
        <>
          <StatRail stats={stats} />
          <FilterBar criteria={filterCriteria} onChange={setFilterCriteria} uniqueLabels={uniqueLabels} />
          <FloodAlert
            floods={floods}
            onNuke={(floodPRs) =>
              setConfirm({
                title: 'Nuke flood',
                body: `Close ${floodPRs.length} flood PRs and delete branches?`,
                confirmLabel: `Nuke ${floodPRs.length}`,
                numbers: floodPRs.map((p) => p.number),
                deleteBranches: true,
              })
            }
            isNuking={isClosing}
            nukeProgress={nukeProgress}
          />
          <DuplicateAlert
            clusters={duplicates}
            onSelectCopies={() => setSelectedPRs(new Set(numbersToCloseKeepingOldest(duplicates)))}
          />

          {selectedPRs.size > 0 && (
            <div className="card selection-bar">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {selectedPRs.size} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn--danger"
                  type="button"
                  disabled={isClosing}
                  onClick={() =>
                    setConfirm({
                      title: 'Close selected',
                      body: `Close ${selectedPRs.size} PRs and delete branches?`,
                      confirmLabel: `Close ${selectedPRs.size}`,
                      numbers: [...selectedPRs],
                      deleteBranches: true,
                    })
                  }
                >
                  Close + delete branches
                </button>
                <button className="btn btn--sm" type="button" onClick={() => setSelectedPRs(new Set())}>
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="lane-board">
            {cockpit.lanes.map((lane) => (
              <LaneColumn
                key={lane.id}
                lane={lane}
                prs={categories[lane.id as keyof CategorizedPRs] ?? []}
                selectedPRs={selectedPRs}
                focusedNumber={focusedNumber}
                onToggle={handleToggle}
                onSelectAll={handleSelectAll}
                onInspect={handleViewDetail}
              />
            ))}
          </div>

          <PRDetail
            detail={detailData}
            loading={detailLoading}
            error={detailError}
            onClose={() => {
              setDetailData(null);
              setDetailError(null);
            }}
          />
        </>
      )}

      {!loading && prs.length === 0 && token && !showTokenModal && (
        <div className="empty-state">
          <p>No open PRs found.</p>
          <button className="btn btn--primary" type="button" onClick={() => void loadPRs()}>
            Refresh
          </button>
        </div>
      )}

      {paletteOpen && (
        <CommandPalette
          query={paletteQuery}
          onQuery={setPaletteQuery}
          items={paletteItems}
          activeIndex={paletteIndex}
          onSelect={handlePaletteSelect}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const job = confirm;
            setConfirm(null);
            void runClose(job.numbers, job.deleteBranches);
          }}
        />
      )}
      <StatusBar target={cockpit.target} selectedCount={selectedPRs.size} />
    </div>
  );
}
