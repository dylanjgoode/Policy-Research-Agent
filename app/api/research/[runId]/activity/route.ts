import { NextRequest, NextResponse } from 'next/server';
import { getRunWithActivity, getRunActivities } from '@/lib/db';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

// GET /api/research/[runId]/activity - Get activity report for a run
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';

    const run = await getRunWithActivity(runId);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const response: {
      run: typeof run;
      summary: typeof run.activitySummary;
      activities?: Awaited<ReturnType<typeof getRunActivities>>;
    } = {
      run,
      summary: run.activitySummary,
    };

    // Optionally include detailed activity log
    if (detailed) {
      response.activities = await getRunActivities(runId);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error getting activity:', error);
    return NextResponse.json(
      { error: 'Failed to get activity report' },
      { status: 500 }
    );
  }
}
