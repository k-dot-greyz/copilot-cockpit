import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PR, PRDetail } from '../../lib/github';
import { mapPRToTarotSpread, type TarotCardSpreadSlot, type TarotElement } from '../../lib/tarot/spread-mapper';
import { TarotGlyph } from './TarotGlyph';

interface TarotSpreadModalProps {
  pr: PR | null;
  detail: PRDetail | null;
  onClose: () => void;
  onAction?: (actionKind: string, prNumber: number) => void;
}

const elementGlows: Record<TarotElement, { border: string; glow: string; text: string; bg: string }> = {
  void: {
    border: 'rgba(168, 85, 247, 0.6)',
    glow: '0 0 24px rgba(168, 85, 247, 0.3)',
    text: '#c084fc',
    bg: 'linear-gradient(135deg, rgba(30, 20, 50, 0.85), rgba(15, 10, 30, 0.95))',
  },
  fire: {
    border: 'rgba(239, 68, 68, 0.6)',
    glow: '0 0 24px rgba(239, 68, 68, 0.3)',
    text: '#f87171',
    bg: 'linear-gradient(135deg, rgba(50, 20, 20, 0.85), rgba(25, 10, 10, 0.95))',
  },
  water: {
    border: 'rgba(59, 130, 246, 0.6)',
    glow: '0 0 24px rgba(59, 130, 246, 0.3)',
    text: '#60a5fa',
    bg: 'linear-gradient(135deg, rgba(20, 35, 60, 0.85), rgba(10, 18, 35, 0.95))',
  },
  aether: {
    border: 'rgba(234, 179, 8, 0.6)',
    glow: '0 0 24px rgba(234, 179, 8, 0.35)',
    text: '#fbbf24',
    bg: 'linear-gradient(135deg, rgba(50, 40, 20, 0.85), rgba(25, 20, 10, 0.95))',
  },
  electric: {
    border: 'rgba(16, 185, 129, 0.6)',
    glow: '0 0 24px rgba(16, 185, 129, 0.3)',
    text: '#34d399',
    bg: 'linear-gradient(135deg, rgba(20, 50, 40, 0.85), rgba(10, 25, 20, 0.95))',
  },
  dark: {
    border: 'rgba(148, 163, 184, 0.6)',
    glow: '0 0 20px rgba(148, 163, 184, 0.25)',
    text: '#cbd5e1',
    bg: 'linear-gradient(135deg, rgba(30, 35, 45, 0.85), rgba(15, 18, 25, 0.95))',
  },
};

export function TarotSpreadModal({ pr, detail, onClose, onAction }: TarotSpreadModalProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const spread = useMemo(() => {
    if (!pr) return null;
    return mapPRToTarotSpread(pr, detail);
  }, [pr, detail]);

  const cardsList = useMemo(() => {
    if (!spread) return [];
    return [spread.cards.origin, spread.cards.crucible, spread.cards.oracle];
  }, [spread]);

  const toggleFlip = useCallback((cardId: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!pr || !spread) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        setActiveCardIndex(0);
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveCardIndex(1);
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setActiveCardIndex(2);
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        const activeCard = cardsList[activeCardIndex];
        if (activeCard) toggleFlip(activeCard.id);
        return;
      }
      if (e.key === 'Enter') {
        const activeCard = cardsList[activeCardIndex];
        if (activeCard?.action && onAction) {
          e.preventDefault();
          onAction(activeCard.action.kind, pr.number);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pr, spread, cardsList, activeCardIndex, toggleFlip, onClose, onAction]);

  if (!pr || !spread) return null;

  const { explainer } = spread;

  const riskBadgeClass =
    explainer.risk_level === 'low'
      ? 'badge--ready'
      : explainer.risk_level === 'moderate'
        ? 'badge--draft'
        : 'badge--flood';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tarot review spread for PR #${pr.number}`}
      data-testid="tarot-spread-modal"
    >
      <div
        className="modal"
        style={{
          maxWidth: '1080px',
          width: '94%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                🔮 DIVINATION SPREAD:
              </span>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                #{pr.number} {pr.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
              <span
                className={`badge ${spread.orientation === 'upright' ? 'badge--ready' : 'badge--flood'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {spread.orientation === 'upright' ? '✨ UPRIGHT DIVINATION' : '⚠️ REVERSED (GLITCHED)'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                @{pr.author} · {pr.headRefName}
              </span>
            </div>
          </div>
          <button className="btn btn--sm" onClick={onClose} aria-label="Close spread modal">
            ✕ Esc
          </button>
        </div>

        {/* Floating Explainer Arcana Card */}
        <div
          className="glitch-rgb"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
          data-testid="tarot-explainer-arcana"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🎴</span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-purple)' }}>
                EXPLAINER ARCANA (BOUNCER VERDICT)
              </strong>
            </div>
            <span className={`badge ${riskBadgeClass}`}>RISK: {explainer.risk_level.toUpperCase()}</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {explainer.verdict}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            {explainer.summary}
          </p>
          {explainer.key_files.length > 0 && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {explainer.key_files.slice(0, 6).map((file) => (
                <code key={file} style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>
                  {file}
                </code>
              ))}
              {explainer.key_files.length > 6 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  +{explainer.key_files.length - 6} more files
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3-Card Tarot Spread Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {cardsList.map((card, idx) => {
            const isFocused = activeCardIndex === idx;
            const isFlipped = flippedCards.has(card.id);
            const style = elementGlows[card.element] || elementGlows.void;

            return (
              <div
                key={card.id}
                tabIndex={0}
                role="region"
                aria-label={`${card.title}: ${card.arcana}`}
                onClick={() => {
                  setActiveCardIndex(idx);
                  toggleFlip(card.id);
                }}
                onFocus={() => setActiveCardIndex(idx)}
                className={`project-card glitch-rgb ${isFocused ? 'pr-card--focused' : ''}`}
                data-testid={`tarot-slot-${card.position}`}
                style={{
                  background: style.bg,
                  border: `2px solid ${card.is_reversed ? 'var(--border-danger)' : style.border}`,
                  boxShadow: card.is_reversed
                    ? '0 0 24px rgba(248, 113, 113, 0.35)'
                    : isFocused
                      ? style.glow
                      : 'var(--shadow-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '380px',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: isFocused ? '2px solid var(--color-glitch-cyan)' : 'none',
                  outlineOffset: '2px',
                  transform: card.is_reversed ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
                }}
              >
                {/* Counter-rotate content if card is reversed so text remains readable */}
                <div
                  style={{
                    transform: card.is_reversed ? 'rotate(180deg)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                  }}
                >
                  {!isFlipped ? (
                    /* CARD FRONT FACE */
                    <>
                      <div>
                        {/* Slot Position & Element Rune */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            [{idx + 1}] {card.title}
                          </span>
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: style.text,
                              fontSize: '0.68rem',
                            }}
                          >
                            {card.element.toUpperCase()}
                          </span>
                        </div>

                        {/* Arcana Title & Archetype */}
                        <h3 style={{ fontSize: '1.2rem', color: style.text, marginBottom: '0.2rem' }}>
                          {card.arcana}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                          {card.archetype}
                        </p>

                        {/* Central Glyph Frame */}
                        <div
                          style={{
                            margin: '1.5rem auto',
                            width: '96px',
                            height: '96px',
                            borderRadius: '50%',
                            border: `2px dashed ${style.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: style.text,
                            boxShadow: style.glow,
                          }}
                        >
                          <TarotGlyph name={card.glyphs[0] || 'Sparkles'} size={48} />
                        </div>
                      </div>

                      {/* Bottom Status & Actions */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span
                            className="badge"
                            style={{
                              background: card.is_reversed ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)',
                              color: card.is_reversed ? 'var(--accent-red)' : 'var(--accent-green)',
                              fontSize: '0.7rem',
                            }}
                          >
                            {card.is_reversed ? '⚠️ REVERSED' : '✓ UPRIGHT'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            [Space to Flip]
                          </span>
                        </div>

                        {card.action && (
                          <button
                            className={`btn ${card.action.kind === 'nuke' || card.action.kind === 'block' ? 'btn--danger' : 'btn--primary'}`}
                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAction) onAction(card.action.kind, pr.number);
                            }}
                          >
                            {card.action.label}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    /* CARD BACK FACE (METRICS INSPECTOR) */
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: style.text }}>
                            TELEMETRY: {card.title}
                          </span>
                          <span className="badge badge--draft" style={{ fontSize: '0.65rem' }}>
                            FLIPPED
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                          {Object.entries(card.metrics).map(([key, val]) => (
                            <div
                              key={key}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderBottom: '1px dotted var(--border-subtle)',
                                paddingBottom: '0.2rem',
                              }}
                            >
                              <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{String(val ?? 'none')}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <button
                          className="btn btn--sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlip(card.id);
                          }}
                        >
                          Flip Back [Space]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Help & Navigation Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span>
            Shortcuts: <kbd className="kbd">1</kbd> Origin · <kbd className="kbd">2</kbd> Crucible ·{' '}
            <kbd className="kbd">3</kbd> Oracle · <kbd className="kbd">Space</kbd> Flip ·{' '}
            <kbd className="kbd">Enter</kbd> Action · <kbd className="kbd">Esc</kbd> Exit
          </span>
          <span style={{ color: 'var(--accent-purple)' }}>GlitchWorks Tarot Schema v1</span>
        </div>
      </div>
    </div>
  );
}
