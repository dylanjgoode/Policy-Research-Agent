import { signalHunter, discoverGlobalPolicies } from './signal-hunter';
import { globalVetting } from './global-vetting';
import { gapAnalysis } from './gap-analysis';
import { generateReports } from './report-generator';
import { createActivityCollector } from './activity-collector';
import {
  createRun,
  updateRunPhase,
  updateRunStatus,
  updateRunCounts,
  isRunCancelled,
  getRun,
  insertActivities,
  updateRunActivitySummary,
} from '../db';
import type { Policy, Run, ResearchOptions } from '../types';

export interface PipelineResult {
  run: Run;
  policies: Policy[];
  success: boolean;
  error?: string;
}

class RunCancelledError extends Error {
  constructor() {
    super('Run cancelled by user');
    this.name = 'RunCancelledError';
  }
}

async function checkCancelled(runId: string): Promise<void> {
  if (await isRunCancelled(runId)) {
    throw new RunCancelledError();
  }
}

/**
 * Run the full research pipeline for specified countries
 */
export async function runResearchPipeline(
  countries: string[],
  options: ResearchOptions
): Promise<PipelineResult> {
  const { interpretation } = options;

  console.log(`[Pipeline] Starting research for policy: "${interpretation.policyName}"`);
  console.log(`[Pipeline] Countries: ${countries.join(', ')}`);

  // Create run record with full interpretation for cloning
  const run = await createRun('manual', countries, 'reverse', interpretation.policyName, interpretation);

  // Create activity collector for this run
  const activity = createActivityCollector(run.id, insertActivities, updateRunActivitySummary);

  try {
    // Phase 1: Signal Hunter
    await checkCancelled(run.id);
    console.log('[Pipeline] Phase 1: Signal Hunter');
    await updateRunPhase(run.id, 'signal_hunter');
    activity.emit({ phase: 'signal_hunter', eventType: 'phase_started' });
    const signals = await signalHunter(countries, { interpretation, activity });
    activity.emit({ phase: 'signal_hunter', eventType: 'phase_completed', itemCount: signals.length });

    if (signals.length === 0) {
      await activity.finalize();
      await updateRunStatus(run.id, 'completed');
      await updateRunCounts(run.id, 0, 0);
      const finalRun = await getRun(run.id);
      return {
        run: finalRun || { ...run, status: 'completed' },
        policies: [],
        success: true,
      };
    }

    // Phase 2: Global Vetting
    await checkCancelled(run.id);
    console.log('[Pipeline] Phase 2: Global Vetting');
    await updateRunPhase(run.id, 'global_vetting');
    activity.emit({ phase: 'global_vetting', eventType: 'phase_started' });
    const vetted = await globalVetting(signals, { activity });
    activity.emit({ phase: 'global_vetting', eventType: 'phase_completed', itemCount: vetted.length });

    if (vetted.length === 0) {
      await activity.finalize();
      await updateRunStatus(run.id, 'completed');
      await updateRunCounts(run.id, signals.length, 0);
      const finalRun = await getRun(run.id);
      return {
        run: finalRun || { ...run, status: 'completed', policiesFound: signals.length },
        policies: [],
        success: true,
      };
    }

    // Phase 3: Gap Analysis
    await checkCancelled(run.id);
    console.log('[Pipeline] Phase 3: Gap Analysis');
    await updateRunPhase(run.id, 'gap_analysis');
    activity.emit({ phase: 'gap_analysis', eventType: 'phase_started' });
    const analyzed = await gapAnalysis(vetted, { activity });
    activity.emit({ phase: 'gap_analysis', eventType: 'phase_completed', itemCount: analyzed.length });

    // Filter to policies worth reporting on
    const reportable = analyzed.filter(
      (p) => p.opportunityValue === 'high' || p.opportunityValue === 'medium'
    );

    // Emit item_filtered for non-reportable policies
    for (const policy of analyzed) {
      if (policy.opportunityValue !== 'high' && policy.opportunityValue !== 'medium') {
        activity.emit({
          phase: 'report_generation',
          eventType: 'item_filtered',
          itemName: policy.name,
          rejectionReason: `Low opportunity value: ${policy.opportunityValue || 'null'}`,
        });
      }
    }

    // Phase 4: Report Generation
    await checkCancelled(run.id);
    console.log('[Pipeline] Phase 4: Report Generation');
    await updateRunPhase(run.id, 'report_generation');
    activity.emit({ phase: 'report_generation', eventType: 'phase_started' });
    const policies = await generateReports(reportable, { activity });
    activity.emit({ phase: 'report_generation', eventType: 'phase_completed', itemCount: policies.length });

    // Calculate high value count
    const highValueCount = policies.filter((p) => p.opportunityValue === 'high').length;

    // Finalize activity log
    await activity.finalize();

    // Mark complete
    await updateRunStatus(run.id, 'completed');
    await updateRunCounts(run.id, policies.length, highValueCount);

    console.log(`[Pipeline] Complete. Generated ${policies.length} reports (${highValueCount} high-value)`);

    const finalRun = await getRun(run.id);
    return {
      run: finalRun || {
        ...run,
        status: 'completed',
        policiesFound: policies.length,
        highValueCount,
      },
      policies,
      success: true,
    };
  } catch (error) {
    // Don't overwrite status if run was cancelled
    if (error instanceof RunCancelledError) {
      console.log('[Pipeline] Run was cancelled');
      await activity.finalize();
      const currentRun = await getRun(run.id);
      return {
        run: currentRun || { ...run, status: 'cancelled' },
        policies: [],
        success: false,
        error: 'Run cancelled by user',
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Error:', errorMessage);

    // Log the error in activity
    activity.emit({
      phase: 'signal_hunter', // Use current phase if available
      eventType: 'api_error',
      metadata: { error: errorMessage },
    });
    await activity.finalize();

    await updateRunStatus(run.id, 'failed', errorMessage);

    const finalRun = await getRun(run.id);
    return {
      run: finalRun || { ...run, status: 'failed', errorMessage },
      policies: [],
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Run autonomous discovery (broader global scan)
 */
export async function runDiscoveryPipeline(): Promise<PipelineResult> {
  console.log('[Pipeline] Starting discovery scan');

  // Create run record
  const run = await createRun('discovery');

  try {
    // Phase 1: Global Discovery
    console.log('[Pipeline] Phase 1: Global Discovery');
    await updateRunPhase(run.id, 'signal_hunter');
    const signals = await discoverGlobalPolicies();

    if (signals.length === 0) {
      await updateRunStatus(run.id, 'completed');
      await updateRunCounts(run.id, 0, 0);
      return {
        run: { ...run, status: 'completed' },
        policies: [],
        success: true,
      };
    }

    // Phase 2: Global Vetting
    console.log('[Pipeline] Phase 2: Global Vetting');
    await updateRunPhase(run.id, 'global_vetting');
    const vetted = await globalVetting(signals);

    // Phase 3: Gap Analysis
    console.log('[Pipeline] Phase 3: Gap Analysis');
    await updateRunPhase(run.id, 'gap_analysis');
    const analyzed = await gapAnalysis(vetted);

    // Only report high-value discoveries
    const reportable = analyzed.filter((p) => p.opportunityValue === 'high');

    // Phase 4: Report Generation
    console.log('[Pipeline] Phase 4: Report Generation');
    await updateRunPhase(run.id, 'report_generation');
    const policies = await generateReports(reportable);

    // Mark complete
    await updateRunStatus(run.id, 'completed');
    await updateRunCounts(run.id, policies.length, policies.length);

    console.log(`[Pipeline] Discovery complete. Found ${policies.length} high-value opportunities`);

    return {
      run: { ...run, status: 'completed', policiesFound: policies.length },
      policies,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Discovery error:', errorMessage);

    await updateRunStatus(run.id, 'failed', errorMessage);

    return {
      run: { ...run, status: 'failed', errorMessage },
      policies: [],
      success: false,
      error: errorMessage,
    };
  }
}

// Re-export individual phases for testing/direct use
export { signalHunter, discoverGlobalPolicies } from './signal-hunter';
export { globalVetting } from './global-vetting';
export { gapAnalysis } from './gap-analysis';
export { generateReports } from './report-generator';
