import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
  if (!roleNames.includes('admin') && !roleNames.includes('super_admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

// GET: List subjects and topics for a given exam
export async function GET(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json({ error: 'examId parameter required' }, { status: 400 });
    }

    // Fetch subjects for this exam
    const { data: subjects, error: sError } = await adminClient
      .from('exam_subjects')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true });

    if (sError) throw sError;

    // Fetch topics for these subjects
    const subjectIds = (subjects || []).map((s) => s.id);
    let topics: any[] = [];
    if (subjectIds.length > 0) {
      const { data: tData, error: tError } = await adminClient
        .from('exam_topics')
        .select('*')
        .in('subject_id', subjectIds)
        .order('created_at', { ascending: true });

      if (tError) throw tError;
      topics = tData || [];
    }

    return NextResponse.json({
      success: true,
      subjects: subjects || [],
      topics: topics || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Add or update Subject / Topic
export async function POST(req: NextRequest) {
  try {
    await checkIsAdmin();
    const adminClient = getSupabaseAdmin();
    const body = await req.json();

    const { entity, action, data } = body;

    // 1. SUBJECT OPERATIONS
    if (entity === 'subject') {
      if (action === 'create') {
        const { exam_id, name, slug, description, weight_percentage, order_index, status } = data;
        
        // Duplicate check
        const { data: existing } = await adminClient
          .from('exam_subjects')
          .select('id')
          .eq('exam_id', exam_id)
          .or(`name.eq."${name}",slug.eq."${slug}"`);

        if (existing && existing.length > 0) {
          return NextResponse.json({ error: 'Subject with this name or slug already exists' }, { status: 400 });
        }

        const { data: created, error } = await adminClient
          .from('exam_subjects')
          .insert({
            exam_id,
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description: description || '',
            weight_percentage: parseFloat(weight_percentage) || 10,
            order_index: parseInt(order_index) || 0,
            status: status || 'published',
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, subject: created });
      }

      if (action === 'update') {
        const { id, name, slug, description, weight_percentage, order_index, status } = data;
        const { data: updated, error } = await adminClient
          .from('exam_subjects')
          .update({
            name,
            slug,
            description,
            weight_percentage: parseFloat(weight_percentage),
            order_index: parseInt(order_index),
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, subject: updated });
      }

      if (action === 'delete') {
        const { id } = data;
        // Cascade delete topics under this subject
        await adminClient.from('exam_topics').delete().eq('subject_id', id);
        const { error } = await adminClient.from('exam_subjects').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
    }

    // 2. TOPIC OPERATIONS
    if (entity === 'topic') {
      if (action === 'create') {
        const { subject_id, name, slug, parent_topic_id, level, weight_percentage, order_index, tags } = data;

        // Duplicate check
        const { data: existing } = await adminClient
          .from('exam_topics')
          .select('id')
          .eq('subject_id', subject_id)
          .or(`name.eq."${name}",slug.eq."${slug}"`);

        if (existing && existing.length > 0) {
          return NextResponse.json({ error: 'Topic with this name or slug already exists in this subject' }, { status: 400 });
        }

        const { data: created, error } = await adminClient
          .from('exam_topics')
          .insert({
            subject_id,
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            parent_topic_id: parent_topic_id || null,
            level: level || 'topic',
            weight_percentage: parseFloat(weight_percentage) || 5,
            order_index: parseInt(order_index) || 0,
            tags: tags || [],
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, topic: created });
      }

      if (action === 'update') {
        const { id, name, slug, parent_topic_id, level, weight_percentage, order_index, tags } = data;
        const { data: updated, error } = await adminClient
          .from('exam_topics')
          .update({
            name,
            slug,
            parent_topic_id: parent_topic_id || null,
            level,
            weight_percentage: parseFloat(weight_percentage),
            order_index: parseInt(order_index),
            tags: tags || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, topic: updated });
      }

      if (action === 'delete') {
        const { id } = data;
        const { error } = await adminClient.from('exam_topics').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid entity or action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
