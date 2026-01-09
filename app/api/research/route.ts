import { NextRequest, NextResponse } from 'next/server';
import { runResearchPipeline } from '@/lib/pipeline';
import { getActiveRun, getRecentRuns } from '@/lib/db';
import { PEER_COUNTRIES } from '@/lib/types';

// GET /api/research - Get recent runs and status
export async function GET() {
  try {
    const [activeRun, recentRuns] = await Promise.all([
      getActiveRun(),
      getRecentRuns(10),
    ]);

    return NextResponse.json({
      activeRun,
      recentRuns,
      availableCountries: PEER_COUNTRIES,
    });
  } catch (error) {
    console.error('[API] Error getting research status:', error);
    return NextResponse.json(
      { error: 'Failed to get research status' },
      { status: 500 }
    );
  }
}

// POST /api/research - Start new research
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { countries } = body;

    // Validate countries
    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one country to research' },
        { status: 400 }
      );
    }

    // Validate country names
    const validCountries = countries.filter((c: string) =>
      PEER_COUNTRIES.includes(c as typeof PEER_COUNTRIES[number])
    );

    if (validCountries.length === 0) {
      return NextResponse.json(
        { error: 'No valid countries selected', validCountries: PEER_COUNTRIES },
        { status: 400 }
      );
    }

    // Check for active run
    const activeRun = await getActiveRun();
    if (activeRun) {
      return NextResponse.json(
        { error: 'A research run is already in progress', activeRun },
        { status: 409 }
      );
    }

    // Start pipeline (non-blocking for initial response)
    const pipelinePromise = runResearchPipeline(validCountries);

    // Return immediately with run info
    // The pipeline will continue in the background
    const result = await pipelinePromise;

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
