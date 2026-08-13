import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data: languages, error } = await (supabase as any)
      .from('languages')
      .select('id, code, name, native_name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      languages: languages || [],
    });
  } catch (error: any) {
    console.error('API Languages Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}
