import type {
  ActivityEvent,
  ActivitySummary,
  ActivityCollector,
  Phase,
  PhaseTimingInfo,
  FunnelMetrics,
  ApiMetrics,
  SourceMetrics,
  RejectionMetrics,
  ActivityOutcome,
  SourceType,
} from '../types';

interface PhaseTimingState {
  startedAt: string;
  endedAt?: string;
}

/**
 * Creates an activity collector for tracking pipeline execution.
 * Events are accumulated in-memory and flushed to DB on finalize().
 */
export function createActivityCollector(
  runId: string,
  onInsertActivities: (events: ActivityEvent[]) => Promise<void>,
  onUpdateSummary: (runId: string, summary: ActivitySummary) => Promise<void>
): ActivityCollector {
  const events: ActivityEvent[] = [];
  const phaseTimings: Map<Phase, PhaseTimingState> = new Map();
  const pipelineStartTime = Date.now();

  return {
    runId,

    emit(event) {
      const fullEvent: ActivityEvent = {
        ...event,
        runId,
        timestamp: new Date().toISOString(),
      };
      events.push(fullEvent);

      // Track phase timings
      if (event.eventType === 'phase_started') {
        phaseTimings.set(event.phase, { startedAt: fullEvent.timestamp });
      } else if (event.eventType === 'phase_completed') {
        const timing = phaseTimings.get(event.phase);
        if (timing) {
          timing.endedAt = fullEvent.timestamp;
        }
      }
    },

    getSummary() {
      return computeSummaryFromEvents(events, phaseTimings, pipelineStartTime);
    },

    async finalize() {
      // Batch insert all events
      if (events.length > 0) {
        await onInsertActivities(events);
      }
      // Update runs.activity_summary
      const summary = this.getSummary();
      await onUpdateSummary(runId, summary);
    },
  };
}

function computeSummaryFromEvents(
  events: ActivityEvent[],
  phaseTimings: Map<Phase, PhaseTimingState>,
  pipelineStartTime: number
): ActivitySummary {
  const timing = computeTimings(phaseTimings, pipelineStartTime);
  const funnel = computeFunnel(events);
  const apiMetrics = computeApiMetrics(events);
  const sourcesDiscovered = computeSourceMetrics(events);
  const rejections = computeRejections(events);
  const { outcome, outcomeReason } = determineOutcome(events, funnel);

  return {
    timing,
    funnel,
    apiMetrics,
    sourcesDiscovered,
    rejections,
    outcome,
    outcomeReason,
  };
}

function computeTimings(
  phaseTimings: Map<Phase, PhaseTimingState>,
  pipelineStartTime: number
): ActivitySummary['timing'] {
  const totalDurationMs = Date.now() - pipelineStartTime;

  const phaseTimingsResult: Partial<Record<Phase, PhaseTimingInfo>> = {};

  for (const [phase, state] of phaseTimings) {
    const startMs = new Date(state.startedAt).getTime();
    const endMs = state.endedAt ? new Date(state.endedAt).getTime() : null;

    phaseTimingsResult[phase] = {
      startedAt: state.startedAt,
      endedAt: state.endedAt || null,
      durationMs: endMs ? endMs - startMs : null,
    };
  }

  return {
    totalDurationMs,
    phaseTimings: phaseTimingsResult,
  };
}

function computeFunnel(events: ActivityEvent[]): FunnelMetrics {
  const signalsFound = events.filter(
    (e) => e.eventType === 'signal_found' && e.phase === 'signal_hunter'
  ).length;

  // Count signals that passed vetting (found in signal_hunter but not rejected)
  const signalsRejectedAtVetting = events.filter(
    (e) =>
      (e.eventType === 'signal_rejected' || e.eventType === 'item_filtered') &&
      e.phase === 'global_vetting'
  ).length;

  const signalsVetted = Math.max(0, signalsFound - signalsRejectedAtVetting);

  // Count signals that passed gap analysis
  const signalsFilteredAtGap = events.filter(
    (e) => e.eventType === 'item_filtered' && e.phase === 'gap_analysis'
  ).length;

  const signalsAnalyzed = Math.max(0, signalsVetted - signalsFilteredAtGap);

  // Count final policies reported
  const policiesReported = events.filter(
    (e) => e.eventType === 'signal_found' && e.phase === 'report_generation'
  ).length;

  return {
    signalsFound,
    signalsVetted,
    signalsAnalyzed,
    policiesReported,
  };
}

function computeApiMetrics(events: ActivityEvent[]): ApiMetrics {
  const querySentEvents = events.filter((e) => e.eventType === 'query_sent');
  const cacheHitEvents = events.filter((e) => e.eventType === 'cache_hit');
  const cacheMissEvents = events.filter((e) => e.eventType === 'cache_miss');

  const totalTokensUsed = events.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

  return {
    totalCalls: querySentEvents.length,
    cacheHits: cacheHitEvents.length,
    cacheMisses: cacheMissEvents.length,
    totalTokensUsed,
  };
}

function computeSourceMetrics(events: ActivityEvent[]): SourceMetrics {
  const evidenceEvents = events.filter((e) => e.eventType === 'evidence_found');

  const byType: Partial<Record<SourceType, number>> = {};
  const byCountry: Record<string, number> = {};

  for (const event of evidenceEvents) {
    // Count by source type from metadata
    const sourceType = event.metadata?.sourceType as SourceType | undefined;
    if (sourceType) {
      byType[sourceType] = (byType[sourceType] || 0) + 1;
    }

    // Count by country
    const country = event.targetCountry;
    if (country) {
      byCountry[country] = (byCountry[country] || 0) + 1;
    }
  }

  return {
    total: evidenceEvents.length,
    byType,
    byCountry,
  };
}

function computeRejections(events: ActivityEvent[]): RejectionMetrics {
  const atVetting = events.filter(
    (e) =>
      (e.eventType === 'signal_rejected' || e.eventType === 'item_filtered') &&
      e.phase === 'global_vetting'
  ).length;

  const atGapAnalysis = events.filter(
    (e) => e.eventType === 'item_filtered' && e.phase === 'gap_analysis'
  ).length;

  const lowOpportunity = events.filter(
    (e) =>
      e.eventType === 'item_filtered' &&
      e.phase === 'report_generation' &&
      e.rejectionReason?.includes('opportunity')
  ).length;

  return {
    atVetting,
    atGapAnalysis,
    lowOpportunity,
  };
}

function determineOutcome(
  events: ActivityEvent[],
  funnel: FunnelMetrics
): { outcome: ActivityOutcome; outcomeReason: string } {
  // Check for errors
  const errorEvents = events.filter((e) => e.eventType === 'api_error');
  if (errorEvents.length > 0) {
    const lastError = errorEvents[errorEvents.length - 1];
    return {
      outcome: 'error',
      outcomeReason: `Pipeline encountered an error: ${lastError.metadata?.error || 'Unknown error'}`,
    };
  }

  // Check if we found policies
  if (funnel.policiesReported > 0) {
    return {
      outcome: 'policies_found',
      outcomeReason: `Found ${funnel.policiesReported} policy ${funnel.policiesReported === 1 ? 'implementation' : 'implementations'} worth reporting.`,
    };
  }

  // No policies found - determine why
  if (funnel.signalsFound === 0) {
    return {
      outcome: 'no_implementations',
      outcomeReason:
        'No implementations of this policy concept were found in the selected countries. Try expanding your search to more countries or refining your policy description.',
    };
  }

  if (funnel.signalsVetted === 0) {
    return {
      outcome: 'no_evidence',
      outcomeReason: `Found ${funnel.signalsFound} potential ${funnel.signalsFound === 1 ? 'signal' : 'signals'}, but none passed evidence quality thresholds. The sources may lack sufficient documentation of outcomes.`,
    };
  }

  if (funnel.signalsAnalyzed === 0) {
    return {
      outcome: 'no_evidence',
      outcomeReason: `Found ${funnel.signalsVetted} vetted ${funnel.signalsVetted === 1 ? 'policy' : 'policies'}, but none had sufficient data for Ireland gap analysis.`,
    };
  }

  // Signals analyzed but no reports generated (low opportunity value)
  return {
    outcome: 'no_evidence',
    outcomeReason: `Analyzed ${funnel.signalsAnalyzed} ${funnel.signalsAnalyzed === 1 ? 'policy' : 'policies'}, but none represented high-value opportunities for Ireland (either already exists or low success evidence).`,
  };
}
