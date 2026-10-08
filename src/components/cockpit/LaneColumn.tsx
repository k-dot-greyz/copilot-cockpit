import type { LaneCard } from '../../lib/config/cockpit';
import type { PR } from '../../lib/github';
import { CockpitPRCard } from './CockpitPRCard';

export function LaneColumn({
  lane,
  prs,
  selectedPRs,
  focusedNumber,
  onToggle,
  onSelectAll,
  onInspect,
}: {
  lane: LaneCard;
  prs: PR[];
  selectedPRs: Set<number>;
  focusedNumber: number | null;
  onToggle: (n: number) => void;
  onSelectAll: (ids: number[]) => void;
  onInspect: (n: number) => void;
}) {
  const selectedInLane = prs.filter((p) => selectedPRs.has(p.number)).length;
  return (
    <section
      className="lane-column"
      data-accent={lane.accent}
      data-testid={`lane-${lane.id}`}
      aria-labelledby={`lane-${lane.id}-title`}
    >
      <div className="lane-column__header">
        <h2 className="lane-column__title" id={`lane-${lane.id}-title`}>
          {lane.emoji} {lane.title}{' '}
          <span className={`badge badge--${lane.accent}`}>{prs.length}</span>
        </h2>
        <button
          className="btn btn--sm"
          type="button"
          onClick={() => onSelectAll(prs.map((p) => p.number))}
        >
          {selectedInLane === prs.length && prs.length > 0 ? 'Deselect' : 'Select'}
        </button>
      </div>
      {prs.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.5rem' }}>
          Empty lane
        </p>
      )}
      {prs.map((pr) => (
        <CockpitPRCard
          key={pr.number}
          pr={pr}
          selected={selectedPRs.has(pr.number)}
          focused={focusedNumber === pr.number}
          onToggle={onToggle}
          onInspect={onInspect}
        />
      ))}
    </section>
  );
}
