import { NextRequest, NextResponse } from 'next/server';
import { getPolicyBySlug, getEvidenceForPolicy, updatePolicy } from '@/lib/db';

// GET /api/policies/[slug] - Get single policy with evidence
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const policy = await getPolicyBySlug(slug);

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    const evidence = await getEvidenceForPolicy(policy.id);

    // Group evidence by type
    const groupedEvidence = {
      successMetrics: evidence.filter((e) => e.evidenceType === 'success_metric'),
      criticisms: evidence.filter((e) => e.evidenceType === 'criticism'),
      irelandSources: evidence.filter((e) => e.isIrelandSource),
      other: evidence.filter(
        (e) => e.evidenceType !== 'success_metric' &&
               e.evidenceType !== 'criticism' &&
               !e.isIrelandSource
      ),
    };

    return NextResponse.json({
      policy,
      evidence: groupedEvidence,
      totalEvidence: evidence.length,
    });
  } catch (error) {
    console.error('[API] Error getting policy:', error);
    return NextResponse.json(
      { error: 'Failed to get policy' },
      { status: 500 }
    );
  }
}

// PATCH /api/policies/[slug] - Update policy (e.g., archive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const policy = await getPolicyBySlug(slug);

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Only allow updating status field
    const updates: Record<string, unknown> = {};

    if ('status' in body && typeof body.status === 'string') {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const updated = await updatePolicy(policy.id, updates);

    return NextResponse.json({ policy: updated });
  } catch (error) {
    console.error('[API] Error updating policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}
