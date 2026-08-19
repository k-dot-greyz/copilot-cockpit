import React from 'react';
import type { EncounterCard, PlayerState } from '../lib/game/types';

interface EncounterModalProps {
  encounter: EncounterCard | null;
  state: PlayerState;
  onSelectChoice: (encounter: EncounterCard, choiceIndex: number) => void;
  onClose: () => void;
}

export function EncounterModal({
  encounter,
  state,
  onSelectChoice,
  onClose,
}: EncounterModalProps) {
  if (!encounter) return null;

  return (
    <div className="modal-overlay" data-testid="hrpg-encounter-modal">
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ color: 'var(--accent-purple)', fontSize: '1.25rem' }}>
            💬 {encounter.title}
          </h2>
          <span className="badge badge--bot">{encounter.speaker}</span>
        </div>

        <p
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            marginBottom: '1.5rem',
            fontStyle: 'italic',
          }}
          data-testid="hrpg-encounter-narrative"
        >
          "{encounter.narrative}"
        </p>

        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Choose your response:
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {encounter.choices.map((choice, idx) => {
            const meetsChm = !choice.requirements.chm || state.stats.chm_lvl >= choice.requirements.chm;
            const meetsKrm = !choice.requirements.krm || state.stats.krm >= choice.requirements.krm;
            const meetsDgn = !choice.requirements.dgn || state.stats.dgn >= choice.requirements.dgn;
            const isEligible = meetsChm && meetsKrm && meetsDgn;

            return (
              <button
                key={idx}
                className={`btn ${isEligible ? 'btn--primary' : ''}`}
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  whiteSpace: 'normal',
                  padding: '0.75rem 1rem',
                  opacity: isEligible ? 1 : 0.45,
                }}
                disabled={!isEligible}
                onClick={() => onSelectChoice(encounter, idx)}
                data-testid={`hrpg-encounter-choice-${idx}`}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{choice.text}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {choice.requirements.chm ? `Req: CHM L${choice.requirements.chm} ` : ''}
                    {choice.requirements.dgn ? `Req: DGN ${choice.requirements.dgn} ` : ''}
                    {choice.outcomes.affinity_gain ? `| Affinity: +${choice.outcomes.affinity_gain}` : ''}
                    {choice.outcomes.cash_delta ? ` | Cash: ${choice.outcomes.cash_delta > 0 ? '+' : ''}$${choice.outcomes.cash_delta}` : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button className="btn btn--sm" onClick={onClose} data-testid="hrpg-encounter-close-btn">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
