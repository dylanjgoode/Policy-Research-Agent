import { NextRequest, NextResponse } from 'next/server';
import { runResearchPipeline } from '@/lib/pipeline';
import { getActiveRuns, getRecentRuns, cancelActiveRun } from '@/lib/db';
import { SEARCHABLE_COUNTRIES, type PolicyInterpretation } from '@/lib/types';

// GET /api/research - Get recent runs and status
export async function GET() {
  try {
    const [activeRuns, recentRuns] = await Promise.all([
      getActiveRuns(),
      getRecentRuns(10),
    ]);

    return NextResponse.json({
      activeRuns,
      recentRuns,
      availableCountries: SEARCHABLE_COUNTRIES,
    });
  } catch (error) {
    console.error('[API] Error getting research status:', error);
    return NextResponse.json(
      { error: 'Failed to get research status' },
      { status: 500 }
    );
  }
}

// POST /api/research - Start new research (allows concurrent runs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { countries, policyInterpretation } = body;

    // Validate interpretation
    if (!policyInterpretation || typeof policyInterpretation !== 'object') {
      return NextResponse.json(
        { error: 'policyInterpretation is required' },
        { status: 400 }
      );
    }

    const interpretation = policyInterpretation as PolicyInterpretation;
    if (!interpretation.policyName || !interpretation.originalInput) {
      return NextResponse.json(
        { error: 'policyInterpretation must include policyName and originalInput' },
        { status: 400 }
      );
    }

    // Validate countries
    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one country to research' },
        { status: 400 }
      );
    }

    // Validate country names (now includes Ireland and UK)
    const validCountries = countries.filter((c: string) =>
      SEARCHABLE_COUNTRIES.includes(c as typeof SEARCHABLE_COUNTRIES[number])
    );

    if (validCountries.length === 0) {
      return NextResponse.json(
        { error: 'No valid countries selected', validCountries: SEARCHABLE_COUNTRIES },
        { status: 400 }
      );
    }

    // Start pipeline with interpretation (concurrent runs now allowed)
    const result = await runResearchPipeline(validCountries, {
      interpretation,
    });

    return NextResponse.json({
      message: 'Research complete',
      run: result.run,
      policiesFound: result.policies.length,
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('[API] Error starting research:', error);
    return NextResponse.json(
      { error: 'Failed to start research' },
      { status: 500 }
    );
  }
}

// DELETE /api/research - Cancel all active research runs
export async function DELETE() {
  try {
    const activeRuns = await getActiveRuns();
    if (activeRuns.length === 0) {
      return NextResponse.json(
        { message: 'No active runs to cancel' },
        { status: 200 }
      );
    }

    await cancelActiveRun();
    return NextResponse.json({
      message: 'All active research cancelled',
      cancelledCount: activeRuns.length,
    });
  } catch (error) {
    console.error('[API] Error cancelling research:', error);
    return NextResponse.json(
      { error: 'Failed to cancel research' },
      { status: 500 }
    );
  }
}
