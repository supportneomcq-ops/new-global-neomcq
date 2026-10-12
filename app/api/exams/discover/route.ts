import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { normalizeInput } from '@/lib/knowledge/normalizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawExamName = body.exam_name?.trim();
    const rawCountry = body.country_name?.trim() || body.country_id?.trim() || 'Global';

    if (!rawExamName) {
      return NextResponse.json(
        { success: false, error: 'Exam name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', { p_user_id: authData.user.id });
    if (adminError || isAdmin !== true) {
      return NextResponse.json({ success: false, error: 'Admin access required for AI exam discovery.' }, { status: 403 });
    }
    if (rawExamName.length > 160 || rawCountry.length > 100) {
      return NextResponse.json({ success: false, error: 'Exam or country name is too long.' }, { status: 400 });
    }

    // 1. Resolve Country from Database
    let countryId: string | null = null;
    let countryName = rawCountry;
    let flagEmoji = '🌐';

    if (rawCountry && rawCountry !== 'Global') {
      const { data: countryData } = await (supabase as any)
        .from('countries')
        .select('id, name, flag_emoji')
        .or(`id.eq.${rawCountry},name.ilike.%${rawCountry}%,iso2.ilike.${rawCountry}`)
        .maybeSingle();

      if (countryData) {
        countryId = countryData.id;
        countryName = countryData.name;
        flagEmoji = countryData.flag_emoji || '🌐';
      }
    }

    // Do not create country rows from arbitrary request text. Countries are managed
    // through the canonical country catalog; an unknown country must be corrected there first.
    if (!countryId && countryName && countryName !== 'Global') {
      return NextResponse.json(
        { success: false, error: 'Select a country from the supported country list.' },
        { status: 400 }
      );
    }

    const norm = normalizeInput(rawExamName);
    const cleanQuery = norm.canonical.toLowerCase();
    const querySlug = norm.slug.toLowerCase();

    // 3. Search platform catalog (exams table) for existing verified or platform exam
    let examQuery = (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        short_name,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        is_featured,
        official_url,
        country_id,
        verification_status,
        countries (name, iso2, flag_emoji),
        exam_subjects (
          id,
          name,
          description,
          exam_topics (
            id,
            name,
            description
          )
        )
      `)
      .or(`name.ilike.%${rawExamName}%,slug.ilike.%${querySlug}%`);

    if (countryId) {
      examQuery = examQuery.eq('country_id', countryId);
    }

    const { data: existingExams } = await examQuery;

    if (existingExams && existingExams.length > 0) {
      const match = existingExams[0];
      return NextResponse.json({
        success: true,
        source: 'platform_catalog',
        is_existing: true,
        exam: {
          id: match.id,
          name: match.name,
          slug: match.slug,
          short_name: match.short_name,
          description: match.description,
          country: match.countries?.name || countryName,
          flag: match.countries?.flag_emoji || flagEmoji,
          official_url: match.official_url,
          subjects: match.exam_subjects || [],
        },
      });
    }

    // 4. Check ai_discovered_exams table for existing AI discovery
    const { data: existingDiscovery } = await (supabase as any)
      .from('ai_discovered_exams')
      .select('*')
      .or(`raw_exam_name.ilike.%${rawExamName}%,canonical_exam_name.ilike.%${rawExamName}%,slug.ilike.%${querySlug}%`)
      .maybeSingle();

    if (existingDiscovery) {
      // If already discovered and promoted to exam_id, fetch exam details
      if (existingDiscovery.promoted_to_exam_id) {
        const { data: promotedExam } = await (supabase as any)
          .from('exams')
          .select(`
            id, name, slug, short_name, description, official_url,
            countries(name, flag_emoji),
            exam_subjects(id, name, description, exam_topics(id, name, description))
          `)
          .eq('id', existingDiscovery.promoted_to_exam_id)
          .single();

        if (promotedExam) {
          return NextResponse.json({
            success: true,
            source: 'ai_discovered_exams',
            is_existing: true,
            exam: {
              id: promotedExam.id,
              name: promotedExam.name,
              slug: promotedExam.slug,
              short_name: promotedExam.short_name,
              description: promotedExam.description,
              country: promotedExam.countries?.name || countryName,
              flag: promotedExam.countries?.flag_emoji || flagEmoji,
              official_url: promotedExam.official_url,
              subjects: promotedExam.exam_subjects || [],
            },
          });
        }
      }
    }

    // 5. Conduct AI Investigation using Gemini server-side
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const researchPrompt = `You are an expert global examination research AI.
Research and identify the canonical official metadata and complete syllabus for the examination:
- Country: ${countryName}
- Entered Exam Name: "${rawExamName}"

Perform a complete analysis based on official government regulators, examination boards, or licensing bodies.
Return ONLY a valid JSON object matching this exact schema:
{
  "canonical_name": "Official Full Exam Name (e.g. Uganda Advanced Certificate of Education)",
  "short_name": "Short Abbreviation (e.g. UACE)",
  "authority_name": "Official Conducting Authority (e.g. Uganda National Examinations Board - UNEB)",
  "official_website": "Official Portal URL or Portal Domain (e.g. https://uneb.ac.ug)",
  "exam_type": "Exam Category (e.g. Senior Secondary Certificate / Medical Licensing / Professional Certification / University Entrance)",
  "level": "National or Regional",
  "mode": "Exam Pattern & Format (e.g. Written Theory & Practical Papers)",
  "duration": "Exam Period / Time Limit (e.g. 3 Weeks / 3 Hours per paper)",
  "question_count": 150,
  "description": "Comprehensive 2-3 sentence overview of what this exam tests, who takes it, and its official mandate.",
  "confidence_score": 0.98,
  "syllabus": [
    {
      "name": "Subject Name",
      "description": "Short overview of subject scope",
      "topics": [
        "Topic 1 Name",
        "Topic 2 Name",
        "Topic 3 Name",
        "Topic 4 Name",
        "Topic 5 Name"
      ]
    }
  ]
}

Provide between 4 and 8 comprehensive core subjects, each containing 4 to 6 specific high-yield topics.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: researchPrompt,
    });

    const responseText = response.text || '{}';
    const jsonText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const discovered = JSON.parse(jsonText);

    const canonicalName = discovered.canonical_name || rawExamName;
    const shortName = discovered.short_name || rawExamName;
    const examSlug = `${norm.slug}-${countryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // 6. Record in ai_discovered_exams table
    const { data: aiDiscoveredRecord, error: aiDiscErr } = await (supabase as any)
      .from('ai_discovered_exams')
      .insert({
        country_id: countryId,
        raw_exam_name: rawExamName,
        canonical_exam_name: canonicalName,
        short_name: shortName,
        slug: examSlug,
        authority_name: discovered.authority_name || 'Ministry / Regulatory Board',
        official_website: discovered.official_website || 'https://official-exam-board.gov',
        exam_type: discovered.exam_type || 'National Examination',
        level: discovered.level || 'National',
        mode: discovered.mode || 'Standard Examination',
        duration: discovered.duration || '3 Hours',
        question_count: discovered.question_count || 100,
        syllabus_structure: discovered.syllabus || [],
        verification_status: 'pending_review',
        confidence_score: discovered.confidence_score || 0.95,
      })
      .select('id')
      .single();

    // 7. Auto-create exam record in exams table
    const { data: newExamRecord, error: examInsErr } = await (supabase as any)
      .from('exams')
      .insert({
        country_id: countryId,
        name: canonicalName,
        slug: examSlug,
        short_name: shortName,
        description: discovered.description || `AI-Discovered official examination for ${countryName}.`,
        difficulty: 'Advanced',
        question_count: discovered.question_count || 100,
        time_limit_mins: 180,
        is_featured: false,
        created_by_ai: true,
        status: 'active',
        official_url: discovered.official_website || '',
        source_url: discovered.official_website || '',
        exam_type: discovered.exam_type || 'National Examination',
        level: discovered.level || 'National',
        mode: discovered.mode || 'Standard Written Exam',
        duration: discovered.duration || '3 Hours',
        verification_status: 'ai_discovered',
        last_verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (!newExamRecord) {
      console.error('Error inserting auto-created exam:', examInsErr);
      return NextResponse.json(
        { success: false, error: 'Failed to create exam record' },
        { status: 500 }
      );
    }

    const createdExamId = newExamRecord.id;

    // Link ai_discovered_exams -> promoted_to_exam_id
    if (aiDiscoveredRecord) {
      await (supabase as any)
        .from('ai_discovered_exams')
        .update({ promoted_to_exam_id: createdExamId })
        .eq('id', aiDiscoveredRecord.id);
    }

    // 8. Insert Subjects and Topics
    const createdSubjects: any[] = [];
    const syllabus = discovered.syllabus || [];

    for (const subjData of syllabus) {
      const subjSlug = subjData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Check or create master subject
      let masterSubjId: string | null = null;
      const { data: exSubj } = await (supabase as any)
        .from('subjects')
        .select('id')
        .or(`slug.eq.${subjSlug},name.ilike.%${subjData.name}%`)
        .maybeSingle();

      if (exSubj) {
        masterSubjId = exSubj.id;
      } else {
        const { data: newSubj } = await (supabase as any)
          .from('subjects')
          .insert({
            name: subjData.name,
            slug: subjSlug,
            description: subjData.description || `${subjData.name} domain`,
          })
          .select('id')
          .single();
        if (newSubj) masterSubjId = newSubj.id;
      }

      if (!masterSubjId) continue;

      // Create exam_subjects record
      const { data: examSubjRecord } = await (supabase as any)
        .from('exam_subjects')
        .insert({
          exam_id: createdExamId,
          subject_id: masterSubjId,
          name: subjData.name,
          official_name: subjData.name,
          display_name: subjData.name,
          description: subjData.description || `${subjData.name} for ${shortName}`,
          required: true,
          active: true,
          verification_status: 'ai_discovered',
        })
        .select('id, name, description')
        .single();

      if (!examSubjRecord) continue;

      const createdTopics: any[] = [];
      const topicsList = subjData.topics || [];

      for (const topicName of topicsList) {
        const topicSlug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        let masterTopicId: string | null = null;
        const { data: exTopic } = await (supabase as any)
          .from('topics')
          .select('id')
          .eq('subject_id', masterSubjId)
          .or(`slug.eq.${topicSlug},name.ilike.%${topicName}%`)
          .maybeSingle();

        if (exTopic) {
          masterTopicId = exTopic.id;
        } else {
          const { data: newTopic } = await (supabase as any)
            .from('topics')
            .insert({
              subject_id: masterSubjId,
              name: topicName,
              slug: topicSlug,
              description: `${topicName} topic`,
            })
            .select('id')
            .single();
          if (newTopic) masterTopicId = newTopic.id;
        }

        if (!masterTopicId) continue;

        const { data: examTopicRecord } = await (supabase as any)
          .from('exam_topics')
          .insert({
            subject_id: examSubjRecord.id,
            topic_id: masterTopicId,
            name: topicName,
            official_name: topicName,
            display_name: topicName,
            importance: 'High',
            active: true,
            verification_status: 'ai_discovered',
          })
          .select('id, name, description')
          .single();

        if (examTopicRecord) {
          createdTopics.push(examTopicRecord);
        }
      }

      createdSubjects.push({
        id: examSubjRecord.id,
        name: examSubjRecord.name,
        description: examSubjRecord.description,
        exam_topics: createdTopics,
      });
    }

    return NextResponse.json({
      success: true,
      source: 'ai_discovery_engine',
      is_existing: false,
      exam: {
        id: createdExamId,
        name: canonicalName,
        slug: examSlug,
        short_name: shortName,
        description: discovered.description,
        country: countryName,
        flag: flagEmoji,
        official_url: discovered.official_website,
        authority_name: discovered.authority_name,
        confidence_score: discovered.confidence_score || 0.98,
        subjects: createdSubjects,
      },
    });
  } catch (error: any) {
    console.error('AI Exam Discovery Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'AI discovery failed' },
      { status: 500 }
    );
  }
}
