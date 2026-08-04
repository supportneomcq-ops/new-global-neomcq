import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { topicId, contentType = 'full_pack', difficulty = 'Intermediate', language = 'en', forceRefresh = false } = body

    if (!topicId) {
      return NextResponse.json({ error: 'Missing required topicId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Retrieve Topic & Parent Subject/Exam details
    const { data: topic, error: topicErr } = await (supabase as any)
      .from('exam_topics')
      .select(`
        *,
        exam_subjects (
          id,
          name,
          exams (
            id,
            name,
            difficulty
          )
        )
      `)
      .eq('id', topicId)
      .single()

    if (topicErr || !topic) {
      return NextResponse.json({ error: 'Topic not found in Knowledge Graph' }, { status: 404 })
    }

    const examName = topic.exam_subjects?.exams?.name || 'General Exam'
    const subjectName = topic.exam_subjects?.name || 'General Subject'
    const topicName = topic.name

    // 2. Check Learning Content Cache unless forceRefresh is true
    if (!forceRefresh) {
      const { data: cached } = await (supabase as any)
        .from('learning_content_cache')
        .select('*')
        .eq('topic_id', topicId)
        .eq('content_type', contentType)
        .eq('difficulty', difficulty)
        .eq('language', language)
        .maybeSingle()

      if (cached && cached.payload) {
        return NextResponse.json({
          success: true,
          cached: true,
          contentType,
          difficulty,
          topic: {
            id: topic.id,
            name: topic.name,
            subjectName,
            examName,
          },
          content: cached.payload,
        })
      }
    }

    // 3. Generate structured learning assets using Gemini AI Model
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY environment variable is missing' }, { status: 500 })
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const prompt = `You are the Lead Master Medical & High-Yield Exam Content Creator for NeoMCQ.com.
Generate high-yield, comprehensive learning content for:
- Exam: ${examName}
- Subject: ${subjectName}
- Topic: ${topicName}
- Target Difficulty: ${difficulty}
- Language: ${language}

Generate a complete learning asset JSON package with the following items:
1. "mcqs": Array of 5 high-yield multiple-choice questions. Each MCQ must include:
   - "question": High-yield clinical or concept stem
   - "options": Array of 4 string options
   - "correct_index": 0-3 index
   - "explanation": Comprehensive rationale explaining correct and incorrect options
   - "high_yield_tag": High-yield buzzword or concept tag
2. "notes": Comprehensive, bulleted summary notes explaining key concepts, diagnostic criteria, clinical presentation, or formulas.
3. "flashcards": Array of 6 front/back active recall flashcards.
4. "tutor_explanation": Friendly, step-by-step master tutor explanation breakdown with analogies.
5. "revision_sheet": Rapid 60-second review cheat sheet with high-yield key takeaways.

Respond strictly in valid JSON.`

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: 'You are an elite medical, engineering, and civil services professor creating active-recall exam learning content.',
      },
    })

    const rawText = response.text || '{}'
    let generatedPayload: any = null

    try {
      const jsonStart = rawText.indexOf('{')
      const jsonEnd = rawText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        generatedPayload = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1))
      } else {
        throw new Error('No valid JSON block found in AI response')
      }
    } catch (e: any) {
      return NextResponse.json({ error: 'Failed to structure AI learning content', raw: rawText }, { status: 500 })
    }

    // 4. Store permanently in learning_content_cache
    await (supabase as any)
      .from('learning_content_cache')
      .upsert({
        topic_id: topicId,
        content_type: contentType,
        difficulty,
        language,
        payload: generatedPayload,
        version: 1,
        ai_confidence_score: 98.50,
      }, { onConflict: 'topic_id,content_type,difficulty,language' })

    return NextResponse.json({
      success: true,
      cached: false,
      contentType,
      difficulty,
      topic: {
        id: topic.id,
        name: topic.name,
        subjectName,
        examName,
      },
      content: generatedPayload,
    })
  } catch (error: any) {
    console.error('Topic Content Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Server error generating topic content' }, { status: 500 })
  }
}
