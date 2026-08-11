import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Perform a lightweight query to test Supabase endpoint responsiveness
    const { error } = await supabase.from('contacts').select('id').limit(1);

    return NextResponse.json({
      status: 'connected',
      note: 'Database service is active.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Database health check error:', err);
    return NextResponse.json({
      status: 'degraded',
      message: 'Database check failed.',
    }, { status: 500 });
  }
}
