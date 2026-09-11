/**
 * NEOMCQ — BATCH 7.8: TUTOR LEARNING ANALYTICS CLIENT HELPER
 * Asynchronous, non-blocking event dispatcher for student engagement & learning behavior
 */

export interface TrackTutorEventParams {
  userId: string;
  eventType:
    | 'tutor_opened'
    | 'tutor_started'
    | 'scene_started'
    | 'scene_completed'
    | 'tutor_paused'
    | 'tutor_resumed'
    | 'tutor_seeked'
    | 'tutor_completed'
    | 'faq_opened'
    | 'faq_viewed'
    | 'doubt_asked'
    | 'canonical_faq_reused'
    | 'new_doubt_answer_generated'
    | 'tutor_exited';
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  lessonId?: string | null;
  sceneId?: string | null;
  faqId?: string | null;
  metadata?: Record<string, any>;
}

export function trackTutorEvent(params: TrackTutorEventParams): void {
  if (!params.userId || !params.eventType) return;

  // Asynchronous fire and forget - never blocks UI/playback
  try {
    fetch('/api/ai-tutor/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => {
      // Intentionally ignore network errors to ensure non-blocking playback
    });
  } catch {
    // Intentionally ignore errors
  }
}
