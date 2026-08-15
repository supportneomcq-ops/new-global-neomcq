import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { matchSubjectSmart } from '@/lib/knowledge/matcher'
import { normalizeInput } from '@/lib/knowledge/normalizer'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { examId, subjectName } = body

    if (!examId || !subjectName || !subjectName.trim()) {
      return NextResponse.json(
        { success: false, error: 'examId and subjectName are required' },
        { status: 400 }
      )
    }

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
    const matchResult = await matchSubjectSmart(supabase, examId, subjectName.trim())

    if (matchResult.matched && matchResult.entity) {
      return NextResponse.json({
        success: true,
        reused: true,
        subject: matchResult.entity,
        message: `Reused existing subject '${matchResult.canonicalName}'`,
      })
    }

    // 3. Create new canonical subject under this exam
    const norm = normalizeInput(subjectName)
    const { data: insertedSubject, error: insertErr } = await (supabase as any)
      .from('exam_subjects')
      .insert({
        exam_id: examId,
        name: subjectName.trim(),
        slug: norm.slug || subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `Subject ${subjectName.trim()} for ${examData.name}`,
        weight_percentage: 10,
        order_index: 100,
        version: 1,
        ai_confidence: 95.0,
      })
      .select('id, name, slug, description, order_index')
      .single()

    if (insertErr || !insertedSubject) {
      throw new Error(`Failed to create subject: ${insertErr?.message}`)
    }

    // 4. Generate initial topics using Gemini if available
    let starterTopics: any[] = []
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const prompt = `You are a curriculum expert. For the exam "${examData.name}", generate 4-6 high-yield, core topics for the subject "${subjectName.trim()}". Return ONLY a valid JSON array of strings containing the topic names, e.g. ["Topic 1", "Topic 2", "Topic 3"].`
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
                  slug: tName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  level: 'topic',
                  order_index: i + 1,
                  version: 1,
                  ai_confidence: 95.0,
                })
                .select('id, name, slug, order_index')
                .single()
              if (top) starterTopics.push(top)
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
          name: `Core Principles of ${subjectName.trim()}`,
          slug: `core-principles-${norm.slug}`,
          level: 'topic',
          order_index: 1,
        })
        .select('id, name, slug, order_index')
        .single()
      if (defaultTop) starterTopics.push(defaultTop)
    }

    return NextResponse.json({
      success: true,
      reused: false,
      subject: {
        ...insertedSubject,
        exam_topics: starterTopics,
      },
      message: `Created new subject '${subjectName.trim()}' with ${starterTopics.length} topics`,
    })
  } catch (error: any) {
    console.error('Subject Create API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create subject' },
      { status: 500 }
    )
  }
}
