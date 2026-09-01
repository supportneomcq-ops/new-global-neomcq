import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ContentCostAuditor } from '@/lib/server/content-engine/cost-auditor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'alloy', speed = 1.0, examId, subjectId, topicId, contentVersion, requestId } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Valid text string is required for TTS.' }, { status: 400 });
    }

    const cleanText = text.trim();
    const normalizedText = cleanText.toLowerCase().replace(/\s+/g, ' ');
    const textHash = crypto
      .createHash('sha256')
      .update(`${normalizedText}|${voice}|${speed}`)
      .digest('hex');

    const supabase = getSupabaseAdmin();

    // 1. Check TTS cache for existing audio to eliminate redundant provider calls
    try {
      const { data: cachedTts } = await supabase
        .from('ai_tutor_tts_cache')
        .select('id, audio_base64, content_type, provider, hit_count')
        .eq('text_hash', textHash)
        .maybeSingle();

      if (cachedTts && cachedTts.audio_base64) {
        // Increment hit_count asynchronously
        (async () => {
          try {
            await (supabase as any)
              .from('ai_tutor_tts_cache')
              .update({
                hit_count: Number(cachedTts.hit_count || 1) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', cachedTts.id);
          } catch {
            // Ignore non-blocking update errors
          }
        })();

        const audioUrl = `data:${cachedTts.content_type || 'audio/mp3'};base64,${cachedTts.audio_base64}`;

        // Record $0 COGS audit event for cached hit
        await ContentCostAuditor.recordGlobalGenerationCost({
          userId: null,
          jobId: undefined,
          taskType: 'tutor_tts_cached_hit',
          provider: cachedTts.provider || 'cache',
          model: 'tts-1',
          inputTokens: 0,
          cachedTokens: Math.ceil(cleanText.length / 4),
          outputTokens: 0,
          actualCostUsd: 0,
          requestId: requestId || undefined,
        }, supabase);

        return NextResponse.json({
          success: true,
          audioUrl,
          provider: `${cachedTts.provider || 'OpenAI TTS'} (Cached)`,
          cached: true,
          fallbackToWebSpeech: false,
        });
      }
    } catch (cacheErr) {
      console.warn('[TTS API] Cache lookup notice:', cacheErr);
    }

    // 2. Provider execution if cache miss
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });

        // Generate MP3 speech audio from server provider
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
          input: cleanText.slice(0, 4096),
          speed,
        });

        const arrayBuffer = await mp3Response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;

        // Save generated audio to TTS cache table
        try {
          await supabase.from('ai_tutor_tts_cache').insert({
            text_hash: textHash,
            text_content: cleanText,
            voice,
            speed,
            audio_base64: base64Audio,
            content_type: 'audio/mp3',
            provider: 'OpenAI TTS',
            hit_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (saveErr) {
          console.warn('[TTS API] Failed to store generated audio in cache:', saveErr);
        }

        // Audit financial COGS cost event ($0 user debit)
        const charCount = cleanText.length;
        const estCost = Number(((charCount / 1000) * 0.015).toFixed(6)); // $0.015 per 1k chars for tts-1
        await ContentCostAuditor.recordGlobalGenerationCost({
          userId: null,
          jobId: undefined,
          taskType: 'tutor_tts_generated',
          provider: 'OpenAI',
          model: 'tts-1',
          inputTokens: Math.ceil(charCount / 4),
          cachedTokens: 0,
          outputTokens: 0,
          actualCostUsd: estCost,
          requestId: requestId || undefined,
        }, supabase);

        return NextResponse.json({
          success: true,
          audioUrl,
          provider: 'OpenAI TTS (Server)',
          cached: false,
          fallbackToWebSpeech: false,
        });
      } catch (providerErr: any) {
        console.warn('[Server TTS Provider] OpenAI call failed, signaling Web Speech fallback:', providerErr?.message);
      }
    }

    // Graceful Fallback when server TTS provider is unavailable or unconfigured
    return NextResponse.json({
      success: true,
      audioUrl: null,
      provider: 'Web Speech API (Browser Fallback)',
      fallbackToWebSpeech: true,
      message: 'Server-side TTS provider unavailable or unconfigured; falling back to client Web Speech API synthesis.',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      audioUrl: null,
      provider: 'Web Speech API (Browser Fallback)',
      fallbackToWebSpeech: true,
      error: err.message,
    });
  }
}
