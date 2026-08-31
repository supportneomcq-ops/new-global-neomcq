import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { resolveSubject } from '@/lib/server/exam-intelligence'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, subjectName, confirmed } = body

    if (!examId || !subjectName || typeof subjectName !== 'string' || !subjectName.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId and a valid subjectName string are required.' },
        { status: 400 }
      )
    }

    const trimmedSubjectName = subjectName.trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify target exam exists in database
    const { data: examData, error: examErr } = await (supabase as any)
      .from('exams')
      .select('id, name, slug')
      .eq('id', examId)
      .maybeSingle()

    if (examErr || !examData) {
      return NextResponse.json(
        { success: false, error: 'Selected exam was not found in database.' },
        { status: 404 }
      )
    }

    // 2. Perform Intelligence Resolution using Phase 3A Engine
    const resolution = await resolveSubject({
      examInput: examData.name,
      subjectInput: trimmedSubjectName,
    })

    // 3. Handle Canonical Matches (EXACT_MATCH, NORMALIZED_MATCH, ALIAS_MATCH, SEMANTIC_MATCH)
    if (['EXACT_MATCH', 'NORMALIZED_MATCH', 'ALIAS_MATCH', 'SEMANTIC_MATCH'].includes(resolution.decision)) {
      let canonicalSubject: any = null

      if (resolution.canonical_id || resolution.subject_id) {
        const targetId = resolution.canonical_id || resolution.subject_id
        const { data: foundSubj } = await (supabase as any)
          .from('exam_subjects')
          .select('id, exam_id, name, description')
          .eq('id', targetId)
          .maybeSingle()
        canonicalSubject = foundSubj
      }

      // Fallback search by normalized slug or name under this exam if ID didn't match directly
      if (!canonicalSubject) {
        const norm = normalizeInput(trimmedSubjectName)
        const { data: matchedSubjs } = await (supabase as any)
          .from('exam_subjects')
          .select('id, exam_id, name, description')
          .eq('exam_id', examId)
          .or(`name.ilike.${norm.canonical},name.ilike.${trimmedSubjectName}`)
          .limit(1)

        if (matchedSubjs && matchedSubjs.length > 0) {
          canonicalSubject = matchedSubjs[0]
        }
      }

      if (canonicalSubject) {
        // Fetch topics for this existing canonical subject
        const { data: existingTopics } = await (supabase as any)
          .from('exam_topics')
          .select('id, subject_id, name, description, created_at')
          .eq('subject_id', canonicalSubject.id)
          .order('created_at', { ascending: true })

        return NextResponse.json({
          success: true,
          reused: true,
          resolution,
          subject: {
            id: canonicalSubject.id,
            name: canonicalSubject.name,
            slug: normalizeInput(canonicalSubject.name).slug,
            description: canonicalSubject.description,
            exam_topics: existingTopics || [],
          },
          message: `Reused existing canonical subject '${canonicalSubject.name}' (${resolution.decision}).`,
        })
      }
    }

    // 4. Handle Irrelevant / Invalid Input
    if (resolution.decision === 'INVALID') {
      return NextResponse.json(
        {
          success: false,
          error: resolution.reason || `"${trimmedSubjectName}" does not appear relevant to the ${examData.name} curriculum.`,
          decision: 'INVALID',
          resolution,
        },
        { status: 400 }
      )
    }

    // 5. Handle Needs Review
    if (resolution.decision === 'NEEDS_REVIEW') {
      return NextResponse.json(
        {
          success: false,
          error: resolution.reason || `Unable to classify "${trimmedSubjectName}". Queued for curriculum review.`,
          decision: 'NEEDS_REVIEW',
          resolution,
        },
        { status: 400 }
      )
    }

    // 6. Handle Valid New Subject Creation
    if (resolution.decision === 'VALID_NEW') {
      // Step A: If client has not confirmed yet, ask for explicit confirmation in UI
      if (confirmed !== true) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          resolution,
          message: `New subject identified for ${examData.name}. Please confirm to add.`,
        })
      }

      // Step B: Server-authoritative insertion after confirmation
      const norm = normalizeInput(trimmedSubjectName)
      let insertedSubject: any = null

      try {
        const { data: newSubj, error: insertErr } = await (supabase as any)
          .from('exam_subjects')
          .insert({
            exam_id: examId,
            name: trimmedSubjectName,
            description: `Curricular subject ${trimmedSubjectName} for ${examData.name}`,
            weight_percentage: 10,
          })
          .select('id, exam_id, name, description, weight_percentage, created_at')
          .single()

        if (insertErr) {
          // Check for unique constraint / race condition (e.g. Postgres code 23505)
          if (insertErr.code === '23505' || insertErr.message?.includes('unique') || insertErr.message?.includes('duplicate')) {
            const { data: existingSubj } = await (supabase as any)
              .from('exam_subjects')
              .select('id, exam_id, name, description')
              .eq('exam_id', examId)
              .ilike('name', trimmedSubjectName)
              .maybeSingle()

            if (existingSubj) {
              const { data: existingTopics } = await (supabase as any)
                .from('exam_topics')
                .select('id, subject_id, name, description, created_at')
                .eq('subject_id', existingSubj.id)
                .order('created_at', { ascending: true })

              return NextResponse.json({
                success: true,
                reused: true,
                resolution,
                subject: {
                  id: existingSubj.id,
                  name: existingSubj.name,
                  slug: normalizeInput(existingSubj.name).slug,
                  description: existingSubj.description,
                  exam_topics: existingTopics || [],
                },
                message: `Subject '${existingSubj.name}' already existed (race condition handled).`,
              })
            }
          }
          throw insertErr
        }

        insertedSubject = newSubj
      } catch (dbErr: any) {
        console.error('Database insertion error for exam_subjects:', dbErr)
        return NextResponse.json(
          { success: false, error: dbErr.message || 'Failed to insert subject into database.' },
          { status: 500 }
        )
      }

      // Record alias
      try {
        await (supabase as any)
          .from('subject_aliases')
          .insert({
            subject_id: insertedSubject.id,
            alias: norm.canonical || trimmedSubjectName.toLowerCase(),
          })
      } catch {
        // Non-blocking alias insert
      }

      // Generate 3-4 initial starter topics using Gemini
      let starterTopics: any[] = []
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
          const prompt = `You are an academic curriculum designer. For the exam "${examData.name}", generate 4 core high-yield topics strictly belonging to the subject "${trimmedSubjectName}". Return ONLY a JSON array of strings containing topic names, e.g. ["Topic 1", "Topic 2", "Topic 3", "Topic 4"].`
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          })
          const text = response.text || '[]'
          const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
          const topicNames = JSON.parse(cleaned)

          if (Array.isArray(topicNames)) {
            for (const tName of topicNames) {
              if (typeof tName === 'string' && tName.trim()) {
                const { data: top } = await (supabase as any)
                  .from('exam_topics')
                  .insert({
                    subject_id: insertedSubject.id,
                    name: tName.trim(),
                    description: `Topic ${tName.trim()} under ${trimmedSubjectName}`,
                  })
                  .select('id, subject_id, name, description, created_at')
                  .single()

                if (top) {
                  starterTopics.push({
                    ...top,
                    slug: normalizeInput(top.name).slug,
                  })
                }
              }
            }
          }
        } catch (aiErr) {
          console.warn('AI starter topic generation note:', aiErr)
        }
      }

      // Fallback topic if none generated
      if (starterTopics.length === 0) {
        const { data: defaultTop } = await (supabase as any)
          .from('exam_topics')
          .insert({
            subject_id: insertedSubject.id,
            name: `Core Principles of ${trimmedSubjectName}`,
            description: `Foundational overview and core concepts of ${trimmedSubjectName}`,
          })
          .select('id, subject_id, name, description, created_at')
          .single()

        if (defaultTop) {
          starterTopics.push({
            ...defaultTop,
            slug: normalizeInput(defaultTop.name).slug,
          })
        }
      }

      return NextResponse.json({
        success: true,
        reused: false,
        resolution,
        subject: {
          id: insertedSubject.id,
          name: insertedSubject.name,
          slug: norm.slug,
          description: insertedSubject.description,
          exam_topics: starterTopics,
        },
        message: `Created new subject '${trimmedSubjectName}' with ${starterTopics.length} initial topics.`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Unexpected resolution outcome.', resolution },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Subject Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subject.' },
      { status: 500 }
    )
  }
}

