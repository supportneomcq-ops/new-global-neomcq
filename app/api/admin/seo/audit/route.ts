import { NextResponse } from 'next/server';
import { runSeoHealthAudit } from '@/lib/seo/audit';

export async function GET() {
  try {
    const audit = await runSeoHealthAudit();
    return NextResponse.json({ success: true, audit });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Audit failed' },
      { status: 500 }
    );
  }
}
