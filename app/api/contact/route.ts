import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, category, subject, message, orderRef } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    console.log('[NeoMCQ Contact Inquiry Submitted]:', {
      name,
      email,
      category,
      subject,
      orderRef,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Inquiry received. A support representative will respond shortly.',
      referenceId: `TICKET-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to process inquiry submission.' },
      { status: 500 }
    );
  }
}
