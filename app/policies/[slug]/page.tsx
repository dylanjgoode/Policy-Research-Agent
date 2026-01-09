import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { getPolicyBySlug, getEvidenceForPolicy } from '@/lib/db';
import { EvidenceChain } from '@/components/policies/EvidenceChain';

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

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const policy = await getPolicyBySlug(slug);

  if (!policy) {
    notFound();
  }

  const allEvidence = await getEvidenceForPolicy(policy.id);

  const groupedEvidence = {
    successMetrics: allEvidence.filter((e) => e.evidenceType === 'success_metric'),
    criticisms: allEvidence.filter((e) => e.evidenceType === 'criticism'),
    irelandSources: allEvidence.filter((e) => e.isIrelandSource),
    other: allEvidence.filter(
      (e) =>
        e.evidenceType !== 'success_metric' &&
        e.evidenceType !== 'criticism' &&
        !e.isIrelandSource
    ),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Back link */}
      <Link
        href="/policies"
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        Back to Policies
      </Link>

      {/* Header */}
      <header className="border-b border-[var(--border)] pb-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-muted)]">
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
            {policy.opportunityValue || 'pending'} opportunity
          </span>
          <span className="badge badge-accent">{policy.category}</span>
        </div>

        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{policy.name}</h1>

        {policy.conceptHook && (
          <p className="text-[var(--text-secondary)]">{policy.conceptHook}</p>
        )}

        {/* Scores */}
        <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
          {policy.successScore !== null && (
            <span>
              {Math.round(policy.successScore * 100)}% success evidence
            </span>
          )}
          {policy.criticismScore !== null && (
            <span>
              {Math.round(policy.criticismScore * 100)}% criticism level
            </span>
          )}
        </div>

        {/* Source link */}
        {policy.originalSourceUrl && (
          <a
            href={policy.originalSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={14} />
            {policy.originalSourceTitle || 'Original source'}
          </a>
        )}
      </header>

      {/* Report Sections */}
      <div className="space-y-8">
        {/* Case Study */}
        {policy.caseStudySummary && (
          <section>
            <h2 className="section-title mb-3">Evidence from {policy.sourceCountry}</h2>
            <p className="text-[var(--text-primary)]">{policy.caseStudySummary}</p>
          </section>
        )}

        {/* Ireland Gap */}
        {policy.gapStatement && (
          <section>
            <h2 className="section-title mb-3">Ireland Gap</h2>
            <p className="text-[var(--text-primary)]">{policy.gapStatement}</p>
            {policy.irelandNotes && (
              <p className="text-sm text-[var(--text-muted)] mt-2">{policy.irelandNotes}</p>
            )}
          </section>
        )}

        {/* Pilot Proposal */}
        {policy.pilotProposal && (
          <section>
            <h2 className="section-title mb-3">Pilot Proposal</h2>
            <p className="text-[var(--text-primary)]">{policy.pilotProposal}</p>
          </section>
        )}

        {/* Risk Assessment */}
        {policy.riskAssessment && (
          <section>
            <h2 className="section-title mb-3">Risks & Mitigations</h2>
            <div className="space-y-3">
              {policy.riskAssessment.risks.map((risk, index) => (
                <div key={index} className="border-l-2 border-[var(--border)] pl-4">
                  <p className="text-sm text-[var(--text-primary)]">{risk.risk}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Severity: {risk.severity}
                  </p>
                  {policy.riskAssessment?.mitigations.find((m) => m.risk === risk.risk) && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Mitigation: {policy.riskAssessment.mitigations.find((m) => m.risk === risk.risk)?.mitigation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Evidence Chain */}
      <EvidenceChain evidence={groupedEvidence} />

      {/* Metadata */}
      <footer className="text-xs text-[var(--text-muted)] pt-6 border-t border-[var(--border)] space-y-1">
        <p>Policy ID: {policy.id}</p>
        <p>Created: {new Date(policy.createdAt).toLocaleDateString('en-IE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}</p>
        <p>Status: {policy.status}</p>
      </footer>
    </div>
  );
}
