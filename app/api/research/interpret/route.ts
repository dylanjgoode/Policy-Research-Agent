import { NextResponse } from 'next/server';
import { interpretPolicyIdea } from '@/lib/perplexity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ideaText } = body;

    if (!ideaText || typeof ideaText !== 'string') {
      return NextResponse.json(
        { error: 'ideaText is required and must be a string' },
        { status: 400 }
      );
    }

    if (ideaText.trim().length < 10) {
      return NextResponse.json(
        { error: 'ideaText must be at least 10 characters' },
        { status: 400 }
      );
    }

    const interpretation = await interpretPolicyIdea(ideaText.trim());

    return NextResponse.json({
      success: true,
      interpretation,
    });
  } catch (error) {
    console.error('[Interpret API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to interpret idea' },
      { status: 500 }
    );
  }
}
