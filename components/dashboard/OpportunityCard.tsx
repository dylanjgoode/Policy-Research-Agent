'use client';

import Link from 'next/link';
import type { Policy } from '@/lib/types';

interface OpportunityCardProps {
  policy: Policy;
}

const countryFlags: Record<string, string> = {
  Singapore: 'SG',
  Denmark: 'DK',
  Israel: 'IL',
  Estonia: 'EE',
  Finland: 'FI',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  'South Korea': 'KR',
  'United Kingdom': 'GB',
  Ireland: 'IE',
};

export function OpportunityCard({ policy }: OpportunityCardProps) {
  const opportunityBadge = {
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  }[policy.opportunityValue || 'low'];

  return (
    <Link href={`/policies/${policy.slug}`}>
      <article className="border border-[var(--border)] p-5 h-full flex flex-col transition-colors hover:border-[var(--border-hover)] cursor-pointer">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[var(--text-muted)]">
            {countryFlags[policy.sourceCountry] || policy.sourceCountry}
          </span>
          <span className="text-[var(--border)]">|</span>
          <span className={`badge ${opportunityBadge}`}>
            {policy.opportunityValue || 'pending'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-medium text-[var(--text-primary)] mb-2 line-clamp-2">
          {policy.name}
        </h3>

        {/* Hook */}
        {policy.conceptHook && (
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2 flex-grow">
            {policy.conceptHook}
          </p>
        )}

        {/* Category */}
        <div className="mb-3">
          <span className="badge badge-accent">{policy.category}</span>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-auto pt-3 border-t border-[var(--border)]">
          {policy.successScore !== null && (
            <span>
              {Math.round(policy.successScore * 100)}% success
            </span>
          )}
          {policy.criticismScore !== null && policy.criticismScore > 0.3 && (
            <span>
              {Math.round(policy.criticismScore * 100)}% criticism
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
