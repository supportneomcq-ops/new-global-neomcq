import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GoogleGenAI, Type } from '@google/genai'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examQuery, country, category, userId } = body

    if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim()) {
      return NextResponse.json({ error: 'Exam search term is required' }, { status: 400 })
    }

    const cleanQuery = examQuery.trim()
    const querySlug = slugify(cleanQuery)
    const supabase = getSupabaseAdmin()

    // -------------------------------------------------------------
    // STEP 1: Search Supabase Database for existing exam
    // -------------------------------------------------------------
    // Check by slug, name, or aliases
    const { data: existingExams } = await (supabase as any)
      .from('exams')
      .select(`
        *,
        exam_subjects (
          id,
          name,
          slug,
          description,
          weight_percentage,
          topic_count,
          order_index,
          exam_topics (
            id,
            parent_id,
            name,
            slug,
            description,
            level,
            target_weight,
            order_index,
            tags
          )
        )
      `)
      .or(`slug.eq.${querySlug},name.ilike.%${cleanQuery}%`)
      .limit(5)

    // Check alias table if direct exam lookup produced no match
    let matchedExam = existingExams?.find((e: any) => 
      e.slug === querySlug || 
      e.name.toLowerCase() === cleanQuery.toLowerCase() ||
      (e.aliases && e.aliases.map((a: string) => a.toLowerCase()).includes(cleanQuery.toLowerCase()))
    )

    if (!matchedExam && existingExams && existingExams.length > 0) {
      matchedExam = existingExams[0]
    }

    if (!matchedExam) {
      const { data: aliasMatch } = await (supabase as any)
        .from('exam_aliases')
        .select('exam_id, exams(*)')
        .ilike('alias', cleanQuery)
        .maybeSingle()

      if (aliasMatch && aliasMatch.exams) {
        matchedExam = aliasMatch.exams
      }
    }

    // If exam exists and already has subjects attached, reuse immediately!
    if (matchedExam && matchedExam.exam_subjects && matchedExam.exam_subjects.length > 0) {
      return NextResponse.json({
        success: true,
        isExisting: true,
        reused: true,
        exam: matchedExam,
        message: `Existing structure for ${matchedExam.name} retrieved.`,
      })
    }

    // -------------------------------------------------------------
    // STEP 2: Check AI Content Cache before hitting Gemini API
    // -------------------------------------------------------------
    const cacheKey = `exam_syllabus:${querySlug}`
    const { data: cached } = await (supabase as any)
      .from('ai_content_cache')
      .select('payload')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cached && cached.payload && cached.payload.exam) {
      const cachedSyllabus = cached.payload
      // Persist cached exam into DB if missing
      const { data: insertedExam } = await saveExamToDatabase(supabase, cachedSyllabus.exam, cachedSyllabus.subjects)
      return NextResponse.json({
        success: true,
        isExisting: false,
        cached: true,
        exam: insertedExam || cachedSyllabus.exam,
        message: `Exam structure for ${cachedSyllabus.exam.name} restored from AI cache.`,
      })
    }

    // -------------------------------------------------------------
    // STEP 3: Generate via Gemini AI Model
    // -------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing.' }, { status: 500 })
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const prompt = `You are the Global AI Exam Architect for NeoMCQ.
User requested exam: "${cleanQuery}" ${country ? `in country: ${country}` : ''} ${category ? `category: ${category}` : ''}.

Generates complete, rigorous, real-world curriculum details for this exam from scratch.
You MUST generate every single core subject and topic under this exam syllabus.
Examples:
- If FMGE / NEET PG: Anatomy, Physiology, Biochemistry, Pharmacology, Pathology, Microbiology, Forensic Medicine, Preventive & Social Medicine, Medicine, Surgery, OBG, Pediatrics, Orthopedics, ENT, Ophthalmology, Dermatology, Psychiatry, Radiology, Anaesthesia, Emergency Medicine.
- If USMLE Step 1/2: Behavioral Health, Biochemistry, Biostatistics, Cardiovascular, Endocrine, Gastrointestinal, Hematology & Oncology, Musculoskeletal, Neurology, Renal, Reproductive, Respiratory.
- If UPSC CSE: Indian History, Indian Polity, Geography, Economy, Environment & Ecology, General Science, Current Affairs, CSAT.
- If CPA: Auditing & Attestation (AUD), Financial Accounting & Reporting (FAR), Regulation (REG), Discipline (BAR/ISC/TCP).

Respond strictly with valid JSON conforming to the following structure:
{
  "exam": {
    "name": "Full Official Exam Name",
    "slug": "official-slug",
    "aliases": ["Alias 1", "Alias 2", "Code"],
    "description": "Comprehensive description of exam purpose, syllabus structure and format.",
    "difficulty": "Advanced", // 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Adaptive'
    "question_count": 200,
    "time_limit_mins": 210,
    "category_name": "Medical Licensing",
    "country_name": "${country || 'Global'}",
    "official_website": "https://official-exam-board.org",
    "ai_confidence_score": 98.5
  },
  "subjects": [
    {
      "name": "Subject Name (e.g. Human Anatomy)",
      "description": "Overview of key concepts in this subject.",
      "weight_percentage": 8.5,
      "order_index": 1,
      "topics": [
        {
          "name": "Topic Name (e.g. Neuroanatomy)",
          "description": "Key structures and pathways.",
          "target_weight": 2.5,
          "order_index": 1,
          "tags": ["high-yield", "core"],
          "subtopics": [
            {
              "name": "Subtopic Name (e.g. Cranial Nerves)",
              "description": "Functional components and lesion localization.",
              "concepts": [
                {
                  "name": "Concept Name (e.g. Trigeminal Neuralgia Clinical Features)",
                  "description": "Pain distribution and diagnostic criteria."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are an expert global curriculum designer for medical, engineering, civil service, finance, and professional licensing exams. Always generate comprehensive, accurate, high-yield syllabi.',
      },
    })

    const rawText = response.text || '{}'
    let generatedData: any = null

    try {
      const jsonStart = rawText.indexOf('{')
      const jsonEnd = rawText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        generatedData = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1))
      } else {
        throw new Error('No valid JSON block in AI response')
      }
    } catch (jsonErr: any) {
      console.error('Failed to parse Gemini exam generation JSON:', rawText)
      return NextResponse.json({ error: 'Failed to structure AI exam syllabus', raw: rawText }, { status: 500 })
    }

    if (!generatedData.exam || !generatedData.subjects || !Array.isArray(generatedData.subjects)) {
      return NextResponse.json({ error: 'AI output structure missing exam or subjects' }, { status: 500 })
    }

    // -------------------------------------------------------------
    // STEP 4: Store generated Exam & Hierarchy in Supabase Database
    // -------------------------------------------------------------
    const savedResult = await saveExamToDatabase(supabase, generatedData.exam, generatedData.subjects)

    // Store in Cache for 30 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await (supabase as any).from('ai_content_cache').upsert({
      cache_key: cacheKey,
      content_type: 'exam_syllabus',
      payload: generatedData,
      expires_at: expiresAt.toISOString(),
    })

    // Log Audit Event
    if (userId) {
      await (supabase as any).from('audit_logs').insert({
        user_id: userId,
        action: 'AI_EXAM_GENERATED',
        entity_type: 'exams',
        entity_id: savedResult.id,
        details: { exam_name: generatedData.exam.name, subjects_count: generatedData.subjects.length },
      })
    }

    return NextResponse.json({
      success: true,
      isExisting: false,
      reused: false,
      exam: savedResult,
      message: `Global AI Exam Engine successfully created ${generatedData.exam.name} with ${generatedData.subjects.length} core subjects.`,
    })
  } catch (error: any) {
    console.error('Exam Resolve Engine Error:', error)
    return NextResponse.json({ error: error.message || 'Server error resolving exam' }, { status: 500 })
  }
}

async function saveExamToDatabase(supabase: any, examData: any, subjectsData: any[]) {
  const generatedSlug = examData.slug || slugify(examData.name)

  // 1. Check or Insert Country & Category
  let countryId: string | null = null;
  if (examData.country_name) {
    const { data: cData } = await supabase
      .from('countries')
      .select('id')
      .ilike('name', examData.country_name)
      .maybeSingle()
    if (cData) countryId = cData.id
  }

  let categoryId: string | null = null;
  if (examData.category_name) {
    const { data: catData } = await supabase
      .from('exam_categories')
      .select('id')
      .ilike('name', examData.category_name)
      .maybeSingle()

    if (catData) {
      categoryId = catData.id
    } else {
      const { data: newCat } = await supabase
        .from('exam_categories')
        .insert({
          name: examData.category_name,
          slug: slugify(examData.category_name),
          description: `AI Categorized for ${examData.category_name}`,
        })
        .select('id')
        .single()
      if (newCat) categoryId = newCat.id
    }
  }

  // 2. Insert or Upsert Exam Record
  const { data: insertedExam, error: examErr } = await supabase
    .from('exams')
    .upsert(
      {
        name: examData.name,
        slug: generatedSlug,
        description: examData.description || `AI generated syllabus for ${examData.name}`,
        difficulty: examData.difficulty || 'Adaptive',
        question_count: examData.question_count || 150,
        time_limit_mins: examData.time_limit_mins || 180,
        category_id: categoryId,
        country_id: countryId,
        is_featured: true,
        created_by_ai: true,
        status: 'active',
        approval_status: 'auto_approved',
        aliases: examData.aliases || [],
        ai_confidence_score: examData.ai_confidence_score || 98.50,
        official_website: examData.official_website || null,
        ai_version: 'v3.5',
        prompt_version: '2026-v1',
        source: 'Global AI Exam Engine',
        version: 1,
        metadata: { generated_at: new Date().toISOString() },
      },
      { onConflict: 'slug' }
    )
    .select('*, exam_subjects(*)')
    .single()

  if (examErr || !insertedExam) {
    throw new Error(`Failed to save exam to database: ${examErr?.message}`)
  }

  const examId = insertedExam.id

  // 3. Save Exam Aliases
  if (examData.aliases && Array.isArray(examData.aliases)) {
    for (const aliasStr of examData.aliases) {
      if (aliasStr && aliasStr.trim()) {
        await supabase
          .from('exam_aliases')
          .insert({ exam_id: examId, alias: aliasStr.trim() })
          .single()
          .catch(() => {}) // Ignore duplicates
      }
    }
  }

  // 4. Save Subjects, Topics, Subtopics, Concepts
  for (let sIdx = 0; sIdx < subjectsData.length; sIdx++) {
    const s = subjectsData[sIdx]
    const subjectSlug = slugify(s.name)

    const { data: insertedSubject } = await supabase
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: s.name,
        slug: subjectSlug,
        description: s.description || null,
        weight_percentage: s.weight_percentage || 0,
        topic_count: s.topics ? s.topics.length : 0,
        order_index: s.order_index || sIdx + 1,
        version: 1,
        ai_confidence: 98.00,
        ai_version: 'v3.5',
      })
      .select('id')
      .single()

    if (insertedSubject && s.topics && Array.isArray(s.topics)) {
      for (let tIdx = 0; tIdx < s.topics.length; tIdx++) {
        const t = s.topics[tIdx]
        const { data: insertedTopic } = await supabase
          .from('exam_topics')
          .insert({
            subject_id: insertedSubject.id,
            parent_id: null,
            name: t.name,
            slug: slugify(t.name),
            description: t.description || null,
            level: 'topic',
            target_weight: t.target_weight || 0,
            order_index: t.order_index || tIdx + 1,
            version: 1,
            ai_confidence: 98.00,
            tags: t.tags || ['core'],
          })
          .select('id')
          .single()

        if (insertedTopic && t.subtopics && Array.isArray(t.subtopics)) {
          for (let stIdx = 0; stIdx < t.subtopics.length; stIdx++) {
            const st = t.subtopics[stIdx]
            const { data: insertedSubtopic } = await supabase
              .from('exam_topics')
              .insert({
                subject_id: insertedSubject.id,
                parent_id: insertedTopic.id,
                name: st.name,
                slug: slugify(st.name),
                description: st.description || null,
                level: 'subtopic',
                target_weight: 0,
                order_index: stIdx + 1,
                version: 1,
                ai_confidence: 98.00,
                tags: ['subtopic'],
              })
              .select('id')
              .single()

            if (insertedSubtopic && st.concepts && Array.isArray(st.concepts)) {
              for (let cIdx = 0; cIdx < st.concepts.length; cIdx++) {
                const c = st.concepts[cIdx]
                await supabase.from('exam_topics').insert({
                  subject_id: insertedSubject.id,
                  parent_id: insertedSubtopic.id,
                  name: c.name,
                  slug: slugify(c.name),
                  description: c.description || null,
                  level: 'concept',
                  target_weight: 0,
                  order_index: cIdx + 1,
                  version: 1,
                  ai_confidence: 98.00,
                  tags: ['concept'],
                })
              }
            }
          }
        }
      }
    }
  }

  // Retrieve complete inserted structure
  const { data: fullExam } = await supabase
    .from('exams')
    .select(`
      *,
      exam_subjects (
        id,
        name,
        slug,
        description,
        weight_percentage,
        topic_count,
        order_index,
        exam_topics (
          id,
          parent_id,
          name,
          slug,
          description,
          level,
          target_weight,
          order_index,
          tags
        )
      )
    `)
    .eq('id', examId)
    .single()

  return fullExam || insertedExam
}
