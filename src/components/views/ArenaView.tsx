import React from 'react';
import type { PlayerState, JobCard } from '../../lib/game/types';
import { isJobEligible, calculateShiftPayout } from '../../lib/game/engine';

interface ArenaViewProps {
  state: PlayerState;
  jobs: JobCard[];
  onClockIn: (job: JobCard) => void;
}

export function ArenaView({ state, jobs, onClockIn }: ArenaViewProps) {
  return (
    <div data-testid="hrpg-view-arena" className="section-group">
      <div className="section-header">
        <h2>⚔️ Arena — Wage-Slaving & Career Hustles</h2>
        <span className="section-count">{jobs.length} Opportunities</span>
      </div>

      <div className="pr-grid">
        {jobs.map((job) => {
          const eligible = isJobEligible(job, state.stats);
          const payout = calculateShiftPayout(job, state.stats);

          return (
            <div
              key={job.id}
              className="card"
              data-testid={`hrpg-job-card-${job.id}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ color: 'var(--text-primary)' }}>{job.title}</h3>
                  <span className={`badge ${eligible ? 'badge--ready' : 'badge--draft'}`}>
                    Tier {job.tier} ({job.track})
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                  {job.description}
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>💰 Est. Payout: <strong style={{ color: 'var(--accent-green)' }}>${payout}</strong></span>
                  <span>⚡ Cost: {job.energy_cost} Energy</span>
                  <span>⏰ Duration: {job.hours}h</span>
                </div>
              </div>

              <div>
                <button
                  className={`btn ${eligible ? 'btn--primary' : ''}`}
                  disabled={!eligible || state.energy < job.energy_cost}
                  onClick={() => onClockIn(job)}
                  data-testid={`hrpg-job-clockin-${job.id}`}
                >
                  {state.energy < job.energy_cost ? 'Exhausted' : eligible ? 'Clock In' : 'Promo Locked'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
