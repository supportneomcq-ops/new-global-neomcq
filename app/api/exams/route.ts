import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface ExamItem {
  id: string;
  name: string;
  category: string;
  country: string;
  code: string;
  flag: string;
  description: string;
  is_featured: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featuredOnly = searchParams.get('featured') === 'true';
    const query = searchParams.get('q')?.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    
    // Build query
    let queryBuilder = (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        is_featured,
        status,
        countries (
          name,
          iso2,
          flag_emoji
        ),
        exam_categories (
          name,
          slug
        )
      `)
      .eq('status', 'active');

    if (featuredOnly) {
      queryBuilder = queryBuilder.eq('is_featured', true);
    }

    const { data: dbExams, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    // Map DB results to match the frontend ExamItem interface expectations
    let mappedExams = (dbExams || []).map((exam: any) => ({
      id: exam.id,
      name: exam.name,
      slug: exam.slug,
      category: exam.exam_categories?.name || 'Professional Certification',
      country: exam.countries?.name || 'Global',
      flag: exam.countries?.flag_emoji || '🌐',
      description: exam.description || '',
      is_featured: exam.is_featured,
      code: exam.slug.toUpperCase(),
      question_count: exam.question_count,
      time_limit_mins: exam.time_limit_mins,
      difficulty: exam.difficulty
    }));

    // Apply client-side fuzzy query filter if query param exists
    if (query) {
      mappedExams = mappedExams.filter(
        (e: any) =>
          e.name.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query) ||
          e.code.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      total: mappedExams.length,
      exams: mappedExams,
    });
  } catch (error: any) {
    console.error('API Exams Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}
