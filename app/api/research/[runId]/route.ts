import { NextRequest, NextResponse } from 'next/server';
import { getRun, cancelRun } from '@/lib/db';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

// GET /api/research/[runId] - Get specific run
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const run = await getRun(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error('[API] Error getting run:', error);
    return NextResponse.json(
      { error: 'Failed to get run' },
      { status: 500 }
    );
  }
}

// DELETE /api/research/[runId] - Cancel specific run
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { runId } = await params;
    const run = await getRun(runId);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (run.status !== 'running') {
      return NextResponse.json(
        { error: 'Run is not active', status: run.status },
        { status: 400 }
      );
    }

    await cancelRun(runId);

    return NextResponse.json({
      message: 'Run cancelled',
      runId,
    });
  } catch (error) {
    console.error('[API] Error cancelling run:', error);
    return NextResponse.json(
      { error: 'Failed to cancel run' },
      { status: 500 }
    );
  }
}
