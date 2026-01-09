import { NextRequest, NextResponse } from 'next/server';
import { runDiscoveryPipeline } from '@/lib/pipeline';
import { getActiveRun } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max for Vercel

// GET /api/cron/discover - Weekly discovery cron job
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel Cron)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for active run
    const activeRun = await getActiveRun();
    if (activeRun) {
      return NextResponse.json({
        message: 'Run already in progress',
        runId: activeRun.id,
      });
    }

    // Run discovery pipeline
    const result = await runDiscoveryPipeline();

    return NextResponse.json({
      message: 'Discovery complete',
      run: result.run,
      policiesFound: result.policies.length,
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('[Cron] Discovery error:', error);
    return NextResponse.json(
      { error: 'Discovery failed' },
      { status: 500 }
    );
  }
}
