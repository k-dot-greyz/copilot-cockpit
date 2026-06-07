import React, { useEffect, useRef } from 'react';
import type { PRDetail as PRDetailType } from '../lib/github';

interface PRDetailProps {
  detail: PRDetailType | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export const PRDetail: React.FC<PRDetailProps> = ({
  detail,
  loading,
  error,
  onClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus the drawer when opened for accessibility (focus trap / focus handling)
  useEffect(() => {
    if (detail || loading || error) {
      drawerRef.current?.focus();
    }
  }, [detail, loading, error]);

  if (!detail && !loading && !error) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 90,
          animation: 'fade-in 150ms ease-out',
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '90%',
          maxWidth: '600px',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-4px 0 32px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
          animation: 'slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-lg)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-md)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
              <span className="pr-card__number">#{detail?.number || ''}</span>
              {detail && (
                <span className={`badge ${detail.state === 'MERGED' ? 'badge--ready' : detail.state === 'CLOSED' ? 'badge--flood' : 'badge--human'}`}>
                  {detail.state}
                </span>
              )}
              {detail?.draft && <span className="badge badge--draft">DRAFT</span>}
            </div>
            <h2 id="drawer-title" style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>
              {loading ? 'Loading PR Details...' : detail?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn--sm"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xl)',
          }}
        >
          {loading && (
            <div className="loading-state" style={{ height: '100%', justifyContent: 'center' }}>
              <div className="spinner" />
              <span>Fetching rich metadata...</span>
            </div>
          )}

          {error && (
            <div className="card card--danger" style={{ margin: 0 }}>
              <p style={{ color: 'var(--accent-red)' }}>⚠ {error}</p>
            </div>
          )}

          {!loading && detail && (
            <>
              {/* Author & Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                {detail.authorAvatarUrl && (
                  <img
                    src={detail.authorAvatarUrl}
                    alt={`${detail.author}'s avatar`}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>@{detail.author}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {detail.headRefName} ➔ {detail.baseRefName}
                  </div>
                </div>
              </div>

              {/* Stats / Badges */}
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <div className="stat-item" style={{ minWidth: '100px', padding: 'var(--space-sm) var(--space-md)' }}>
                  <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-green)' }}>
                    +{detail.additions}
                  </span>
                  <span className="stat-label" style={{ fontSize: '0.6rem' }}>ADDITIONS</span>
                </div>
                <div className="stat-item" style={{ minWidth: '100px', padding: 'var(--space-sm) var(--space-md)' }}>
                  <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-red)' }}>
                    -{detail.deletions}
                  </span>
                  <span className="stat-label" style={{ fontSize: '0.6rem' }}>DELETIONS</span>
                </div>
                <div className="stat-item" style={{ minWidth: '100px', padding: 'var(--space-sm) var(--space-md)' }}>
                  <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-blue)' }}>
                    {detail.changedFiles}
                  </span>
                  <span className="stat-label" style={{ fontSize: '0.6rem' }}>FILES</span>
                </div>
              </div>

              {/* Body Description */}
              <div>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-sm)' }}>
                  📝 DESCRIPTION
                </h3>
                <div
                  className="card"
                  style={{
                    background: 'var(--bg-glass)',
                    padding: 'var(--space-md)',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    maxHeight: '250px',
                    overflowY: 'auto',
                  }}
                >
                  {detail.body.trim() || <em style={{ color: 'var(--text-muted)' }}>No description provided.</em>}
                </div>
              </div>

              {/* Linked Issues */}
              {detail.linkedIssues.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-sm)' }}>
                    🔗 LINKED ISSUES
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {detail.linkedIssues.map((issue) => (
                      <a
                        key={issue.number}
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card"
                        style={{
                          padding: 'var(--space-sm) var(--space-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-sm)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>#{issue.number}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{issue.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Changed */}
              {detail.files.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-sm)' }}>
                    📁 FILES CHANGED
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-xs)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {detail.files.map((file) => (
                      <div
                        key={file.path}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '0.25rem 0.5rem',
                          background: 'var(--bg-glass)',
                          borderRadius: '4px',
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 'var(--space-md)' }} title={file.path}>
                          {file.path}
                        </span>
                        <span style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
                          <span style={{ color: 'var(--accent-green)' }}>+{file.additions}</span>
                          <span style={{ color: 'var(--accent-red)' }}>-{file.deletions}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {detail.reviews.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-sm)' }}>
                    💬 REVIEWS
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {detail.reviews.map((review, idx) => (
                      <div
                        key={idx}
                        className="card"
                        style={{
                          padding: 'var(--space-md)',
                          background: 'var(--bg-glass)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            @{review.author}
                          </span>
                          <span
                            className={`badge ${
                              review.state === 'APPROVED'
                                ? 'badge--ready'
                                : review.state === 'CHANGES_REQUESTED'
                                ? 'badge--flood'
                                : 'badge--draft'
                            }`}
                            style={{ fontSize: '0.6rem' }}
                          >
                            {review.state}
                          </span>
                        </div>
                        {review.body && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginTop: 'var(--space-xs)' }}>
                            {review.body}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commits */}
              {detail.commits.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-sm)' }}>
                    💻 COMMITS
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-xs)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {detail.commits.map((commit) => (
                      <div
                        key={commit.oid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-md)',
                          fontSize: '0.75rem',
                          padding: '0.4rem 0.6rem',
                          background: 'var(--bg-glass)',
                          borderRadius: '4px',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)', fontWeight: 600, flexShrink: 0 }}>
                          {commit.abbreviatedOid}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {commit.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
