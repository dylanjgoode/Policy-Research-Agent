import { NextRequest, NextResponse } from 'next/server';
import { getPolicies, getHighValuePolicies } from '@/lib/db';

// GET /api/policies - List policies with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status');
    const irelandStatus = searchParams.get('irelandStatus');
    const opportunityValue = searchParams.get('opportunityValue');
    const sourceCountry = searchParams.get('sourceCountry');
    const limit = searchParams.get('limit');
    const topOnly = searchParams.get('topOnly');

    // Special case: get top high-value policies
    if (topOnly === 'true') {
      const policies = await getHighValuePolicies(parseInt(limit || '3'));
      return NextResponse.json({ policies });
    }

    const filters: {
      status?: string;
      irelandStatus?: string;
      opportunityValue?: string;
      sourceCountry?: string;
      limit?: number;
    } = {};

    if (status) filters.status = status;
    if (irelandStatus) filters.irelandStatus = irelandStatus;
    if (opportunityValue) filters.opportunityValue = opportunityValue;
    if (sourceCountry) filters.sourceCountry = sourceCountry;
    if (limit) filters.limit = parseInt(limit);

    const policies = await getPolicies(filters);

    return NextResponse.json({ policies });
  } catch (error) {
    console.error('[API] Error getting policies:', error);
    return NextResponse.json(
      { error: 'Failed to get policies' },
      { status: 500 }
    );
  }
}
