import React from 'react';
import type { FilterCriteria } from '../lib/filters';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  uniqueLabels: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  criteria,
  onChange,
  uniqueLabels,
}) => {
  const handleChange = (field: keyof FilterCriteria, value: any) => {
    onChange({
      ...criteria,
      [field]: value,
    });
  };

  const handleClear = () => {
    onChange({
      state: 'OPEN',
      authorType: 'all',
      label: 'all',
      reviewDecision: 'all',
      checksStatus: 'all',
      isDraft: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    (criteria.state && criteria.state !== 'OPEN') ||
    (criteria.authorType && criteria.authorType !== 'all') ||
    (criteria.label && criteria.label !== 'all') ||
    (criteria.reviewDecision && criteria.reviewDecision !== 'all') ||
    (criteria.checksStatus && criteria.checksStatus !== 'all') ||
    (criteria.isDraft && criteria.isDraft !== 'all') ||
    (criteria.searchQuery && criteria.searchQuery !== '');

  return (
    <div
      className="card"
      style={{
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-sm)',
        }}
      >
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-purple)' }}>
          🔍 FILTER CONSOLE
        </h3>
        {hasActiveFilters && (
          <button
            className="btn btn--sm"
            onClick={handleClear}
            style={{ fontSize: '0.7rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-search"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            SEARCH QUERY
          </label>
          <input
            id="filter-search"
            type="text"
            className="input"
            placeholder="Title, branch, or #number..."
            value={criteria.searchQuery || ''}
            onChange={(e) => handleChange('searchQuery', e.target.value)}
            aria-label="Search by title, branch, or number"
          />
        </div>

        {/* State Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-state"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            PR STATE
          </label>
          <select
            id="filter-state"
            className="input"
            value={criteria.state || 'OPEN'}
            onChange={(e) => handleChange('state', e.target.value)}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="MERGED">MERGED</option>
            <option value="ALL">ALL STATES</option>
          </select>
        </div>

        {/* Author Type Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-author"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            AUTHOR TYPE
          </label>
          <select
            id="filter-author"
            className="input"
            value={criteria.authorType || 'all'}
            onChange={(e) => handleChange('authorType', e.target.value)}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="all">ALL AUTHORS</option>
            <option value="human">HUMAN ONLY</option>
            <option value="bot">BOT ONLY</option>
            <option value="external">EXTERNAL ONLY</option>
          </select>
        </div>

        {/* Label Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-label"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            LABEL
          </label>
          <select
            id="filter-label"
            className="input"
            value={criteria.label || 'all'}
            onChange={(e) => handleChange('label', e.target.value)}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="all">ALL LABELS</option>
            {uniqueLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Review Decision Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-review"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            REVIEW DECISION
          </label>
          <select
            id="filter-review"
            className="input"
            value={criteria.reviewDecision || 'all'}
            onChange={(e) => handleChange('reviewDecision', e.target.value)}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="all">ALL REVIEWS</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CHANGES_REQUESTED">CHANGES REQUESTED</option>
            <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
            <option value="none">NO REVIEW DECISION</option>
          </select>
        </div>

        {/* Checks Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-checks"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            CI CHECKS
          </label>
          <select
            id="filter-checks"
            className="input"
            value={criteria.checksStatus || 'all'}
            onChange={(e) => handleChange('checksStatus', e.target.value)}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="all">ALL CHECKS</option>
            <option value="success">SUCCESS</option>
            <option value="failure">FAILURE</option>
            <option value="pending">PENDING</option>
            <option value="none">NO CHECKS</option>
          </select>
        </div>

        {/* Draft Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label
            htmlFor="filter-draft"
            style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
          >
            DRAFT STATUS
          </label>
          <select
            id="filter-draft"
            className="input"
            value={
              criteria.isDraft === true
                ? 'true'
                : criteria.isDraft === false
                ? 'false'
                : 'all'
            }
            onChange={(e) => {
              const val = e.target.value;
              handleChange(
                'isDraft',
                val === 'true' ? true : val === 'false' ? false : 'all'
              );
            }}
            style={{ background: 'var(--bg-input)', cursor: 'pointer' }}
          >
            <option value="all">ALL PRs</option>
            <option value="true">DRAFT ONLY</option>
            <option value="false">READY ONLY</option>
          </select>
        </div>
      </div>
    </div>
  );
};
