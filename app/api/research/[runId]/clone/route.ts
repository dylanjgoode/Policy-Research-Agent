import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/db';
import { runResearchPipeline } from '@/lib/pipeline';
import { SEARCHABLE_COUNTRIES } from '@/lib/types';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

// POST /api/research/[runId]/clone - Clone a run with different countries
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const body = await request.json();
    const { countries } = body;

    // Get the original run
    const originalRun = await getRun(runId);
    if (!originalRun) {
      return NextResponse.json({ error: 'Original run not found' }, { status: 404 });
    }

    // Check that the run has a stored interpretation
    if (!originalRun.interpretation) {
      return NextResponse.json(
        { error: 'Original run has no stored interpretation - cannot clone' },
        { status: 400 }
      );
    }

    // Validate countries
    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one country for the cloned run' },
        { status: 400 }
      );
    }

    const validCountries = countries.filter((c: string) =>
      SEARCHABLE_COUNTRIES.includes(c as typeof SEARCHABLE_COUNTRIES[number])
    );

    if (validCountries.length === 0) {
      return NextResponse.json(
        { error: 'No valid countries selected', validCountries: SEARCHABLE_COUNTRIES },
        { status: 400 }
      );
    }

    // Start a new pipeline with the same interpretation but new countries
    const result = await runResearchPipeline(validCountries, {
      interpretation: originalRun.interpretation,
    });

    return NextResponse.json({
      message: 'Cloned research complete',
      originalRunId: runId,
      run: result.run,
      policiesFound: result.policies.length,
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('[API] Error cloning run:', error);
    return NextResponse.json(
      { error: 'Failed to clone run' },
      { status: 500 }
    );
  }
}
