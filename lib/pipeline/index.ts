import { signalHunter, discoverGlobalPolicies } from './signal-hunter';
import { globalVetting } from './global-vetting';
import { gapAnalysis } from './gap-analysis';
import { generateReports } from './report-generator';
import {
  createRun,
  updateRunPhase,
  updateRunStatus,
  updateRunCounts,
} from '../db';
import type { Policy, Run, ResearchOptions } from '../types';

export interface PipelineResult {
  run: Run;
  policies: Policy[];
  success: boolean;
  error?: string;
}

/**
 * Run the full research pipeline for specified countries
 */
export async function runResearchPipeline(
  countries: string[],
  options?: ResearchOptions
): Promise<PipelineResult> {
  const searchMode = options?.searchMode || 'broad';
  const searchQuery = options?.searchQuery;

  console.log(`[Pipeline] Starting research for countries: ${countries.join(', ')} (mode: ${searchMode})`);
  if (searchQuery) {
    console.log(`[Pipeline] Search query: "${searchQuery}"`);
  }

  // Create run record
  const run = await createRun('manual', countries, searchMode, searchQuery);

  try {
    // Phase 1: Signal Hunter
    console.log('[Pipeline] Phase 1: Signal Hunter');
    await updateRunPhase(run.id, 'signal_hunter');
    const signals = await signalHunter(countries, { searchMode, searchQuery });

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

    if (vetted.length === 0) {
      await updateRunStatus(run.id, 'completed');
      await updateRunCounts(run.id, signals.length, 0);
      return {
        run: { ...run, status: 'completed', policiesFound: signals.length },
        policies: [],
        success: true,
      };
    }

    // Phase 3: Gap Analysis
    console.log('[Pipeline] Phase 3: Gap Analysis');
    await updateRunPhase(run.id, 'gap_analysis');
    const analyzed = await gapAnalysis(vetted);

    // Filter to policies worth reporting on
    const reportable = analyzed.filter(
      (p) => p.opportunityValue === 'high' || p.opportunityValue === 'medium'
    );

    // Phase 4: Report Generation
    console.log('[Pipeline] Phase 4: Report Generation');
    await updateRunPhase(run.id, 'report_generation');
    const policies = await generateReports(reportable);

    // Calculate high value count
    const highValueCount = policies.filter((p) => p.opportunityValue === 'high').length;

    // Mark complete
    await updateRunStatus(run.id, 'completed');
    await updateRunCounts(run.id, policies.length, highValueCount);

    console.log(`[Pipeline] Complete. Generated ${policies.length} reports (${highValueCount} high-value)`);

    return {
      run: {
        ...run,
        status: 'completed',
        policiesFound: policies.length,
        highValueCount,
      },
      policies,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pipeline] Error:', errorMessage);

    await updateRunStatus(run.id, 'failed', errorMessage);

    return {
      run: { ...run, status: 'failed', errorMessage },
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
