import { NextRequest, NextResponse } from 'next/server';
import { resolveOrInitializeExamIntelligence } from '@/lib/server/exam-intelligence/engine';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || 'PLAB Part 1';
  try {
    const result = await resolveOrInitializeExamIntelligence({ examQuery: query });
    return NextResponse.json({
      success: true,
      examId: result.exam.id,
      examName: result.exam.name,
      reused: result.reused,
    });
  } catch (err: any) {
    console.error('Test route error:', err);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
