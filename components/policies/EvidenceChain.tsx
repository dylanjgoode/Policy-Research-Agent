'use client';

import { ExternalLink } from 'lucide-react';
import type { Evidence } from '@/lib/types';

interface GroupedEvidence {
  successMetrics: Evidence[];
  criticisms: Evidence[];
  irelandSources: Evidence[];
  other: Evidence[];
}

interface EvidenceChainProps {
  evidence: GroupedEvidence;
}

function EvidenceItem({ item }: { item: Evidence }) {
  return (
    <div className="py-3 border-b border-[var(--border)] last:border-b-0">
      <p className="text-sm text-[var(--text-primary)] mb-2">
        {item.claim}
      </p>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ExternalLink size={10} />
        {item.title || new URL(item.url).hostname}
      </a>

      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
        <span>{item.sourceType.replace('_', ' ')}</span>
        {item.publicationDate && (
          <span>{new Date(item.publicationDate).toLocaleDateString('en-IE')}</span>
        )}
        {item.confidence !== null && (
          <span>{Math.round(item.confidence * 100)}% confidence</span>
        )}
      </div>
    </div>
  );
}

function EvidenceSection({
  title,
  items,
}: {
  title: string;
  items: Evidence[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
        {title} ({items.length})
      </h4>
      <div className="pl-4 border-l border-[var(--border)]">
        {items.map((item) => (
          <EvidenceItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function EvidenceChain({ evidence }: EvidenceChainProps) {
  const totalCount =
    evidence.successMetrics.length +
    evidence.criticisms.length +
    evidence.irelandSources.length +
    evidence.other.length;

  if (totalCount === 0) {
    return (
      <div className="border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--text-muted)]">No evidence collected yet.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Evidence Chain</h3>
        <span className="text-xs text-[var(--text-muted)]">{totalCount} sources</span>
      </div>

      <div className="space-y-8">
        <EvidenceSection
          title="Success Evidence"
          items={evidence.successMetrics}
        />

        <EvidenceSection
          title="Criticisms & Risks"
          items={evidence.criticisms}
        />

        <EvidenceSection
          title="Ireland Sources"
          items={evidence.irelandSources}
        />

        <EvidenceSection
          title="Other Sources"
          items={evidence.other}
        />
      </div>
    </section>
  );
}
