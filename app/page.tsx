import Link from 'next/link';
import { TopOpportunities } from '@/components/dashboard/TopOpportunities';
import { getHighValuePolicies, getRecentRuns, getPolicies } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  try {
    const [topPolicies, recentRuns, allPolicies] = await Promise.all([
      getHighValuePolicies(3),
      getRecentRuns(5),
      getPolicies({ status: 'active', limit: 100 }),
    ]);

    return {
      topPolicies,
      recentRuns,
      stats: {
        totalPolicies: allPolicies.length,
        highValue: allPolicies.filter((p) => p.opportunityValue === 'high').length,
        countries: [...new Set(allPolicies.map((p) => p.sourceCountry))].length,
      },
    };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    return {
      topPolicies: [],
      recentRuns: [],
      stats: { totalPolicies: 0, highValue: 0, countries: 0 },
    };
  }
}

export default async function DashboardPage() {
  const { topPolicies, recentRuns, stats } = await getDashboardData();

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="border-b border-[var(--border)] pb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Policy Innovation Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Discover innovation policies from peer economies that Ireland could adopt
        </p>
        <Link href="/research" className="btn btn-primary">
          Start New Research
        </Link>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-6">
        <div className="border-l-2 border-[var(--border)] pl-4">
          <p className="text-3xl font-semibold text-[var(--text-primary)]">
            {stats.highValue}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">High-Value Opportunities</p>
        </div>

        <div className="border-l-2 border-[var(--border)] pl-4">
          <p className="text-3xl font-semibold text-[var(--text-primary)]">
            {stats.countries}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Countries Analyzed</p>
        </div>

        <div className="border-l-2 border-[var(--border)] pl-4">
          <p className="text-3xl font-semibold text-[var(--text-primary)]">
            {stats.totalPolicies}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Policies Discovered</p>
        </div>
      </section>

      {/* Top Opportunities */}
      <TopOpportunities policies={topPolicies} />

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">Recent Research Runs</h2>
          <div className="divide-y divide-[var(--border)]">
            {recentRuns.map((run) => (
              <div key={run.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      run.status === 'completed'
                        ? 'bg-[var(--success)]'
                        : run.status === 'running'
                        ? 'bg-[var(--accent)]'
                        : run.status === 'failed'
                        ? 'bg-[var(--error)]'
                        : 'bg-[var(--text-muted)]'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">
                      {run.type === 'discovery' ? 'Discovery Scan' : 'Targeted Research'}
                      {run.countries && ` — ${run.countries.join(', ')}`}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(run.createdAt).toLocaleDateString('en-IE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {run.policiesFound} policies
                  </p>
                  {run.highValueCount > 0 && (
                    <p className="text-xs text-[var(--success)]">
                      {run.highValueCount} high-value
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {topPolicies.length === 0 && recentRuns.length === 0 && (
        <section className="py-16 text-center border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No research data yet
          </h3>
          <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
            Start by running your first research cycle. Select countries to analyze
            and discover high-value innovation policies.
          </p>
          <Link href="/research" className="btn btn-primary">
            Start Research
          </Link>
        </section>
      )}
    </div>
  );
}
