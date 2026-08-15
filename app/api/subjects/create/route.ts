import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { matchSubjectSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, subjectName } = body

    if (!examId || !subjectName || typeof subjectName !== 'string' || !subjectName.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId and a valid subjectName are required' },
        { status: 400 }
      )
    }

    const trimmedSubjectName = subjectName.trim()
    const supabase = getSupabaseAdmin()

    // 1. Verify exam exists
    const { data: examData, error: examErr } = await (supabase as any)
      .from('exams')
      .select('id, name')
      .eq('id', examId)
      .single()

    if (examErr || !examData) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      )
    }

    // 2. Smart Match to prevent duplicate subjects
    const matchResult = await matchSubjectSmart(supabase, examId, trimmedSubjectName)

    if (matchResult.matched && matchResult.entity) {
      // Return existing subject with its topics
      const { data: existingTopics } = await (supabase as any)
        .from('exam_topics')
        .select('id, subject_id, name, description, created_at')
        .eq('subject_id', matchResult.entity.id)
        .order('created_at', { ascending: true })

      return NextResponse.json({
        success: true,
        reused: true,
        subject: {
          id: matchResult.entity.id,
          name: matchResult.entity.name,
          slug: matchResult.normalizedSlug || normalizeInput(matchResult.entity.name).slug,
          description: matchResult.entity.description,
          exam_topics: existingTopics || [],
        },
        message: `Reused existing subject '${matchResult.canonicalName}'`,
      })
    }

    // 3. Create new canonical subject under this exam
    const norm = normalizeInput(trimmedSubjectName)
    const { data: insertedSubject, error: insertErr } = await (supabase as any)
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: trimmedSubjectName,
        description: `Subject ${trimmedSubjectName} for ${examData.name}`,
        weight_percentage: 10,
      })
      .select('id, exam_id, name, description, weight_percentage, created_at')
      .single()

    if (insertErr || !insertedSubject) {
      console.error('Insert exam_subjects error:', insertErr)
      throw new Error(`Failed to create subject: ${insertErr?.message || 'Database error'}`)
    }

    // Also record alias if subject_aliases table exists
    try {
      await (supabase as any)
        .from('subject_aliases')
        .insert({
          subject_id: insertedSubject.id,
          alias: norm.canonical || trimmedSubjectName.toLowerCase(),
        })
    } catch (aliasErr) {
      // Non-blocking
    }

    // 4. Generate initial starter topics
    let starterTopics: any[] = []
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const prompt = `You are a curriculum expert. For the exam "${examData.name}", generate 4-6 core high-yield topics for the subject "${trimmedSubjectName}". Return ONLY a valid JSON array of strings containing the topic names, e.g. ["Topic 1", "Topic 2", "Topic 3"].`
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
        const text = response.text || '[]'
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const topicNames = JSON.parse(cleaned)

        if (Array.isArray(topicNames)) {
          for (let i = 0; i < topicNames.length; i++) {
            const tName = topicNames[i]
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
      subject: {
        id: insertedSubject.id,
        name: insertedSubject.name,
        slug: norm.slug,
        description: insertedSubject.description,
        exam_topics: starterTopics,
      },
      message: `Created new subject '${trimmedSubjectName}' with ${starterTopics.length} topics`,
    })
  } catch (error: any) {
    console.error('Subject Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subject' },
      { status: 500 }
    )
  }
}
