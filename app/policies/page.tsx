import Link from 'next/link';
import { getPolicies } from '@/lib/db';

export const dynamic = 'force-dynamic';

const countryFlags: Record<string, string> = {
  Singapore: 'SG',
  Denmark: 'DK',
  Israel: 'IL',
  Estonia: 'EE',
  Finland: 'FI',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  'South Korea': 'KR',
};

export default async function PoliciesPage() {
  const policies = await getPolicies({ limit: 50 });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          All Policies
        </h1>
        <p className="text-[var(--text-secondary)]">
          {policies.length} policies discovered from peer economies
        </p>
      </header>

      {/* Policies List */}
      {policies.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {policies.map((policy) => (
            <Link
              key={policy.id}
              href={`/policies/${policy.slug}`}
              className="block py-5 hover:bg-[var(--bg-surface)] -mx-4 px-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {countryFlags[policy.sourceCountry] || policy.sourceCountry}
                    </span>
                    <span className="text-[var(--border)]">|</span>
                    <span
                      className={`badge ${
                        policy.opportunityValue === 'high'
                          ? 'badge-high'
                          : policy.opportunityValue === 'medium'
                          ? 'badge-medium'
                          : 'badge-low'
                      }`}
                    >
                      {policy.opportunityValue || 'pending'}
                    </span>
                    <span className="badge badge-accent">{policy.category}</span>
                  </div>

                  <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
                    {policy.name}
                  </h3>

                  {policy.conceptHook && (
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-1">
                      {policy.conceptHook}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
                    {policy.successScore !== null && (
                      <span>
                        {Math.round(policy.successScore * 100)}% success evidence
                      </span>
                    )}
                    {policy.criticismScore !== null && policy.criticismScore > 0.3 && (
                      <span>
                        {Math.round(policy.criticismScore * 100)}% criticism
                      </span>
                    )}
                    <span>
                      Ireland: {policy.irelandStatus === 'absent' ? 'Not found' : policy.irelandStatus}
                    </span>
                  </div>
                </div>

                <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                  View
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="py-16 text-center border border-[var(--border)]">
          <p className="text-[var(--text-muted)] mb-4">
            No policies discovered yet. Run a research cycle to find opportunities.
          </p>
          <Link href="/research" className="btn btn-primary">
            Start Research
          </Link>
        </section>
      )}
    </div>
  );
}
