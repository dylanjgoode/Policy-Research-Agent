'use client';

import { OpportunityCard } from './OpportunityCard';
import type { Policy } from '@/lib/types';

interface TopOpportunitiesProps {
  policies: Policy[];
  loading?: boolean;
}

export function TopOpportunities({ policies, loading = false }: TopOpportunitiesProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="section-title">High-Value Opportunities</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[var(--border)] p-5 animate-pulse">
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/4 mb-3" />
              <div className="h-4 bg-[var(--bg-elevated)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-full mb-3" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-1/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="section-title">High-Value Opportunities</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Policies working in peer economies that Ireland is not utilizing
        </p>
      </div>

      {policies.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          {policies.slice(0, 3).map((policy) => (
            <OpportunityCard key={policy.id} policy={policy} />
          ))}
        </div>
      ) : (
        <div className="border border-[var(--border)] p-8 text-center">
          <p className="text-[var(--text-muted)]">
            No high-value opportunities discovered yet.
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Run a research cycle to discover policies from peer economies.
          </p>
        </div>
      )}
    </section>
  );
}
