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
  verificationStatus: 'verified' | 'needs_review';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featuredOnly = searchParams.get('featured') === 'true';
    const query = searchParams.get('q')?.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    
    // Build query
    let dbExams: any[] = [];
    try {
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
          verification_status,
          metadata,
          exam_versions(id, version_year, source_url, verified_at, verification_status, is_current),
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
        .neq('status', 'archived');

      if (featuredOnly) {
        queryBuilder = queryBuilder.eq('is_featured', true);
      }

      const res = await queryBuilder;
      if (res.error) {
        // Fallback without joins
        let flatQuery = (supabase as any)
          .from('exams')
          .select('id, name, slug, description, difficulty, question_count, time_limit_mins, is_featured, status, verification_status, metadata')
          .neq('status', 'archived');
        if (featuredOnly) {
          flatQuery = flatQuery.eq('is_featured', true);
        }
        const flatRes = await flatQuery;
        dbExams = flatRes.data || [];
      } else {
        dbExams = res.data || [];
      }
    } catch (err: any) {
      console.warn('API /api/exams fallback warning:', err);
      dbExams = [];
    }

    // Map DB results to match the frontend ExamItem interface expectations
    let mappedExams = (dbExams || []).map((exam: any) => {
      const metadata = exam.metadata || {}
      const approvedCurrentVersion = (exam.exam_versions || []).some((version: any) =>
        version.is_current === true &&
        version.verification_status === 'verified' &&
        Boolean(version.verified_at && version.source_url && version.version_year)
      )
      const verificationStatus =
        String(exam.verification_status || '').toLowerCase() === 'verified' &&
        metadata.exam_metadata_audit_status === 'verified' &&
        approvedCurrentVersion
          ? 'verified'
          : 'needs_review'

      return {
      id: exam.id,
      name: exam.name,
      slug: exam.slug,
      category: exam.exam_categories?.name || 'Unspecified',
      country: exam.countries?.name || 'Unspecified',
      flag: exam.countries?.flag_emoji || '🌐',
      description: exam.description || '',
      is_featured: exam.is_featured,
      code: exam.slug.toUpperCase(),
      question_count: exam.question_count,
      time_limit_mins: exam.time_limit_mins,
      difficulty: exam.difficulty,
      verificationStatus,
    };
    });

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
