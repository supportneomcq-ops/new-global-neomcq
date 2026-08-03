import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Perform a lightweight query to test Supabase endpoint responsiveness
    const { error } = await supabase.from('contacts').select('id').limit(1);

    return NextResponse.json({
      status: 'connected',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://exzpqrqflfhawgtnzxqx.supabase.co',
      tableChecked: 'contacts',
      note: error ? `Connected (Table query response: ${error.message})` : 'Connected & Active',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({
      status: 'error',
      error: errorMessage,
    }, { status: 500 });
  }
}
