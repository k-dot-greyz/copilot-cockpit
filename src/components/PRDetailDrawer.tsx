import { useState, useEffect } from 'react';
import type { PR, TimelineItem } from '../lib/github';
import { fetchPRTimeline, addIssueLabel, createIssueComment } from '../lib/github';
import { timeAgo } from '../lib/triage';

interface PRDetailDrawerProps {
  pr: PR | null;
  token: string | null;
  owner: string;
  repo: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PRDetailDrawer({
  pr,
  token,
  owner,
  repo,
  onClose,
  onUpdate,
}: PRDetailDrawerProps) {
  if (!pr) return null;

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [customComment, setCustomComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadTimeline = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPRTimeline(owner, repo, pr.number, token);
      setTimeline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
    // Clear notifications on PR change
    setActionMessage(null);
    setCustomComment('');
  }, [pr.number, token]);

  const handleTriggerJules = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await addIssueLabel(owner, repo, pr.number, 'jules', token);
      setActionMessage({ text: 'Successfully added "jules" label! Jules bot will trigger shortly.', isError: false });
      onUpdate?.();
      // Reload timeline to show label if reflected
      setTimeout(loadTimeline, 1000);
    } catch (err) {
      setActionMessage({ text: err instanceof Error ? err.message : 'Failed to trigger Jules', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerCursor = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await createIssueComment(owner, repo, pr.number, '@cursor review this', token);
      setActionMessage({ text: 'Commented "@cursor review this". Cursor bot will trigger shortly.', isError: false });
      loadTimeline();
    } catch (err) {
      setActionMessage({ text: err instanceof Error ? err.message : 'Failed to trigger Cursor', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!token || !customComment.trim()) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      await createIssueComment(owner, repo, pr.number, customComment, token);
      setActionMessage({ text: 'Comment posted successfully.', isError: false });
      setCustomComment('');
      loadTimeline();
    } catch (err) {
      setActionMessage({ text: err instanceof Error ? err.message : 'Failed to post comment', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const getMergeableBadge = () => {
    switch (pr.mergeable) {
      case 'CONFLICTING':
        return <span className="badge badge--conflict">🔴 Conflict (Dirty)</span>;
      case 'MERGEABLE':
        return <span className="badge badge--mergeable">🟢 Mergeable</span>;
      case 'UNKNOWN':
      default:
        return <span className="badge badge--draft">⏳ Checking Mergeability...</span>;
    }
  };

  const getReviewBadge = () => {
    if (!pr.reviewDecision) return null;
    const desc = pr.reviewDecision.replace('_', ' ');
    const badgeClass = pr.reviewDecision === 'APPROVED' ? 'badge--ready' : 'badge--draft';
    return <span className={`badge ${badgeClass}`}>{desc}</span>;
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="pr-card__number" style={{ fontSize: '0.95rem' }}>#{pr.number}</span>
              <h2 style={{ fontSize: '1.15rem', marginTop: '0.2rem' }}>{pr.title}</h2>
            </div>
            <button className="btn btn--sm" onClick={onClose}>✕ Close</button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
            {getMergeableBadge()}
            {getReviewBadge()}
            <span className={`badge ${pr.isDraft ? 'badge--draft' : 'badge--ready'}`}>
              {pr.isDraft ? 'draft' : 'ready'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              by @{pr.author} · {timeAgo(pr.createdAt)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Branch: <code style={{ fontSize: '0.75rem' }}>{pr.headRefName}</code></span>
            <span>·</span>
            <a href={pr.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              View on GitHub ↗
            </a>
          </div>

          {pr.labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
              {pr.labels.map(l => (
                <span key={l} className="badge badge--external" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="drawer-body">
          {/* Bot Control Panel */}
          <div className="bot-actions-panel">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              🤖 Bot Control Deck
            </h3>
            <div className="bot-actions-grid">
              <button 
                className="btn btn--primary" 
                onClick={handleTriggerJules}
                disabled={actionLoading}
                title="Add 'jules' label to assign Jules bot"
              >
                Trigger Jules Bot
              </button>
              <button 
                className="btn" 
                onClick={handleTriggerCursor}
                disabled={actionLoading}
                title="Post comment '@cursor review this' to trigger Cursor review"
              >
                Request Cursor Review
              </button>
            </div>

            <div className="comment-input-area">
              <textarea 
                className="input" 
                placeholder="Post a comment or send a bot instruction..." 
                rows={2}
                value={customComment}
                onChange={e => setCustomComment(e.target.value)}
                style={{ resize: 'vertical', minHeight: '50px', fontSize: '0.8rem' }}
              />
              <button 
                className="btn btn--sm" 
                onClick={handlePostComment}
                disabled={actionLoading || !customComment.trim()}
                style={{ alignSelf: 'flex-end' }}
              >
                Post Comment
              </button>
            </div>

            {actionMessage && (
              <p style={{ 
                fontSize: '0.75rem', 
                color: actionMessage.isError ? 'var(--accent-red)' : 'var(--accent-green)',
                marginTop: '0.5rem',
                lineHeight: '1.3'
              }}>
                {actionMessage.isError ? '⚠ ' : '✔ '} {actionMessage.text}
              </p>
            )}
          </div>

          {/* Comment Threads */}
          <div>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
              Timeline & Conversation ({timeline.length})
            </h3>
            
            {loading && timeline.length === 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" />
                <span>Loading timeline...</span>
              </div>
            )}

            {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>⚠ {error}</p>}

            {!loading && timeline.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No comments or reviews on this Pull Request yet.</p>
            )}

            <div className="timeline">
              {timeline.map(item => (
                <div key={item.id} className={`timeline-item timeline-item--${item.type}`}>
                  {item.authorAvatarUrl ? (
                    <img className="timeline-avatar" src={item.authorAvatarUrl} alt={item.author} />
                  ) : (
                    <div className="timeline-avatar" style={{ background: 'var(--bg-input)' }} />
                  )}
                  <div className="timeline-content-wrapper">
                    <div className="timeline-header">
                      <span className="timeline-author">@{item.author}</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                    {item.type === 'review' && item.reviewState && (
                      <span className={`badge ${item.reviewState === 'APPROVED' ? 'badge--ready' : 'badge--draft'}`} style={{ marginBottom: '0.5rem' }}>
                        {item.reviewState.replace('_', ' ')}
                      </span>
                    )}
                    {item.type === 'review-comment' && item.filePath && (
                      <span className="timeline-filepath">
                        File: {item.filePath}{item.lineNumber ? `:L${item.lineNumber}` : ''}
                      </span>
                    )}
                    <div className="timeline-body">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn--sm" onClick={onClose}>Close Drawer</button>
        </div>
      </div>
    </>
  );
}
