'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  Filter,
  Database,
  AlertCircle,
  CheckCircle,
  Copy,
  Zap,
  Globe,
  FileText,
} from 'lucide-react';
import type {
  ActivitySummary,
  Run,
  ActivityEvent,
  Phase,
  FunnelMetrics,
  ApiMetrics,
} from '@/lib/types';

interface ActivityReportProps {
  run: Run;
  summary: ActivitySummary | null;
  activities?: ActivityEvent[];
  onClone?: () => void;
  policiesFound?: number;
}

const phaseLabels: Record<Phase, string> = {
  signal_hunter: 'Signal Hunter',
  global_vetting: 'Global Vetting',
  gap_analysis: 'Gap Analysis',
  report_generation: 'Report Generation',
};

const phaseIcons: Record<Phase, React.ReactNode> = {
  signal_hunter: <Search size={16} />,
  global_vetting: <CheckCircle size={16} />,
  gap_analysis: <Globe size={16} />,
  report_generation: <FileText size={16} />,
};

function formatDuration(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function OutcomeBanner({
  outcome,
  reason,
}: {
  outcome: ActivitySummary['outcome'];
  reason: string;
}) {
  const config = {
    policies_found: {
      icon: CheckCircle,
      color: 'text-[var(--success)]',
      bgColor: 'bg-[var(--success)]/10',
      borderColor: 'border-[var(--success)]/30',
      title: 'Research Complete',
    },
    no_implementations: {
      icon: Search,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      title: 'No Implementations Found',
    },
    no_evidence: {
      icon: Filter,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      title: 'Insufficient Evidence',
    },
    error: {
      icon: AlertCircle,
      color: 'text-[var(--error)]',
      bgColor: 'bg-[var(--error)]/10',
      borderColor: 'border-[var(--error)]/30',
      title: 'Research Error',
    },
  }[outcome];

  const Icon = config.icon;

  return (
    <div className={`p-4 rounded border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start gap-3">
        <Icon className={`${config.color} shrink-0 mt-0.5`} size={20} />
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{config.title}</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{reason}</p>
        </div>
      </div>
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: FunnelMetrics }) {
  const stages = [
    { label: 'Signals Found', value: funnel.signalsFound, color: 'bg-blue-500' },
    { label: 'Passed Vetting', value: funnel.signalsVetted, color: 'bg-indigo-500' },
    { label: 'Analyzed', value: funnel.signalsAnalyzed, color: 'bg-violet-500' },
    { label: 'Reported', value: funnel.policiesReported, color: 'bg-[var(--accent)]' },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
        Research Funnel
      </h4>
      <div className="space-y-2">
        {stages.map((stage) => (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-28 text-sm text-[var(--text-secondary)]">{stage.label}</span>
            <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded overflow-hidden">
              <div
                className={`h-full ${stage.color} transition-all duration-500`}
                style={{ width: `${(stage.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="w-8 text-sm font-medium text-[var(--text-primary)] text-right">
              {stage.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiMetricsCard({ metrics }: { metrics: ApiMetrics }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
        API Usage
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Zap size={14} />
            <span className="text-xs">API Calls</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">{metrics.totalCalls}</p>
        </div>
        <div className="p-3 border border-[var(--border)] rounded bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <Database size={14} />
            <span className="text-xs">Cache Hits</span>
          </div>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {metrics.cacheHits}
            <span className="text-sm text-[var(--text-muted)] ml-1">
              / {metrics.cacheHits + metrics.cacheMisses}
            </span>
          </p>
        </div>
      </div>
      {metrics.totalTokensUsed > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Total tokens used: {metrics.totalTokensUsed.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function PhaseTimeline({
  summary,
  activities,
}: {
  summary: ActivitySummary;
  activities?: ActivityEvent[];
}) {
  const [expandedPhase, setExpandedPhase] = useState<Phase | null>(null);
  const phases: Phase[] = ['signal_hunter', 'global_vetting', 'gap_analysis', 'report_generation'];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
        Phase Timeline
      </h4>
      <div className="space-y-2">
        {phases.map((phase) => {
          const timing = summary.timing.phaseTimings[phase];
          const phaseActivities = activities?.filter((a) => a.phase === phase) || [];
          const isExpanded = expandedPhase === phase;
          const hasActivities = phaseActivities.length > 0;

          return (
            <div key={phase} className="border border-[var(--border)] rounded overflow-hidden">
              <button
                onClick={() => hasActivities && setExpandedPhase(isExpanded ? null : phase)}
                className={`w-full p-3 flex items-center justify-between transition-colors ${
                  hasActivities ? 'hover:bg-[var(--bg-surface)] cursor-pointer' : 'cursor-default'
                }`}
                disabled={!hasActivities}
              >
                <div className="flex items-center gap-3">
                  {hasActivities ? (
                    isExpanded ? (
                      <ChevronDown size={16} className="text-[var(--text-muted)]" />
                    ) : (
                      <ChevronRight size={16} className="text-[var(--text-muted)]" />
                    )
                  ) : (
                    <span className="w-4" />
                  )}
                  <span className="text-[var(--text-secondary)]">{phaseIcons[phase]}</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {phaseLabels[phase]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  {timing && (
                    <>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(timing.durationMs)}
                      </span>
                    </>
                  )}
                  {hasActivities && (
                    <span className="text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
                      {phaseActivities.length} events
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && hasActivities && (
                <div className="border-t border-[var(--border)] p-3 space-y-1.5 bg-[var(--bg-secondary)] max-h-64 overflow-y-auto">
                  {phaseActivities.map((event, i) => (
                    <ActivityEventRow key={i} event={event} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityEventRow({ event }: { event: ActivityEvent }) {
  const eventTypeColors: Record<string, string> = {
    query_sent: 'text-blue-500',
    signal_found: 'text-[var(--success)]',
    signal_rejected: 'text-[var(--error)]',
    evidence_found: 'text-indigo-500',
    cache_hit: 'text-[var(--text-muted)]',
    cache_miss: 'text-amber-500',
    api_error: 'text-[var(--error)]',
    item_filtered: 'text-amber-500',
    phase_started: 'text-[var(--text-muted)]',
    phase_completed: 'text-[var(--success)]',
  };

  const eventTypeLabels: Record<string, string> = {
    query_sent: 'Query',
    signal_found: 'Found',
    signal_rejected: 'Rejected',
    evidence_found: 'Evidence',
    cache_hit: 'Cache hit',
    cache_miss: 'API call',
    api_error: 'Error',
    item_filtered: 'Filtered',
    phase_started: 'Started',
    phase_completed: 'Completed',
  };

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-[var(--text-muted)] w-16 shrink-0">{formatTime(event.timestamp)}</span>
      <span className={`w-16 shrink-0 ${eventTypeColors[event.eventType] || 'text-[var(--text-secondary)]'}`}>
        {eventTypeLabels[event.eventType] || event.eventType}
      </span>
      <span className="text-[var(--text-primary)] truncate">
        {event.itemName && <span className="font-medium">{event.itemName}</span>}
        {event.targetCountry && !event.itemName && (
          <span className="text-[var(--text-secondary)]">{event.targetCountry}</span>
        )}
        {event.queryText && (
          <span className="text-[var(--text-muted)]" title={event.queryText}>
            &quot;{event.queryText.slice(0, 60)}...&quot;
          </span>
        )}
        {event.rejectionReason && (
          <span className="text-[var(--error)]"> ({event.rejectionReason})</span>
        )}
        {event.apiCallDurationMs && (
          <span className="text-[var(--text-muted)]"> {event.apiCallDurationMs}ms</span>
        )}
      </span>
    </div>
  );
}

export function ActivityReport({
  run,
  summary,
  activities,
  onClone,
  policiesFound = 0,
}: ActivityReportProps) {
  if (!summary) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <AlertCircle size={24} className="mx-auto mb-2" />
        <p>Activity report not available for this run.</p>
        <p className="text-xs mt-1">This run may have completed before activity tracking was enabled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Outcome Banner */}
      <OutcomeBanner outcome={summary.outcome} reason={summary.outcomeReason} />

      {/* Summary Stats */}
      <div className="flex items-center justify-between text-sm text-[var(--text-muted)] border-b border-[var(--border)] pb-4">
        <span>
          <Clock size={14} className="inline mr-1" />
          Total duration: {formatDuration(summary.timing.totalDurationMs)}
        </span>
        {run.countries && run.countries.length > 0 && (
          <span>
            <Globe size={14} className="inline mr-1" />
            {run.countries.length} {run.countries.length === 1 ? 'country' : 'countries'} searched
          </span>
        )}
      </div>

      {/* Funnel Visualization */}
      <FunnelChart funnel={summary.funnel} />

      {/* Phase Timeline */}
      <PhaseTimeline summary={summary} activities={activities} />

      {/* API Metrics */}
      <ApiMetricsCard metrics={summary.apiMetrics} />

      {/* Rejections Summary */}
      {(summary.rejections.atVetting > 0 ||
        summary.rejections.atGapAnalysis > 0 ||
        summary.rejections.lowOpportunity > 0) && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Filtering Summary
          </h4>
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            {summary.rejections.atVetting > 0 && (
              <p>
                <Filter size={12} className="inline mr-1" />
                {summary.rejections.atVetting} {summary.rejections.atVetting === 1 ? 'policy' : 'policies'}{' '}
                failed vetting (insufficient success evidence)
              </p>
            )}
            {summary.rejections.atGapAnalysis > 0 && (
              <p>
                <Filter size={12} className="inline mr-1" />
                {summary.rejections.atGapAnalysis}{' '}
                {summary.rejections.atGapAnalysis === 1 ? 'policy' : 'policies'} filtered at gap
                analysis
              </p>
            )}
            {summary.rejections.lowOpportunity > 0 && (
              <p>
                <Filter size={12} className="inline mr-1" />
                {summary.rejections.lowOpportunity}{' '}
                {summary.rejections.lowOpportunity === 1 ? 'policy' : 'policies'} had low opportunity
                value
              </p>
            )}
          </div>
        </div>
      )}

      {/* Clone Action */}
      {onClone && (
        <div className="border-t border-[var(--border)] pt-6">
          <button
            onClick={onClone}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
          >
            <Copy size={16} />
            Clone with Modified Scope
          </button>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Run this search again with different countries or refined parameters
          </p>
        </div>
      )}
    </div>
  );
}
