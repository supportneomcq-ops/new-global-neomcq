'use client';

import React, { useState, useEffect } from 'react';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { TutorInteractiveWorkspace } from '@/components/ai-tutor/tutor-interactive-workspace';
import { getSupabaseClient } from '@/lib/supabase';

interface AiTutorWhiteboardViewProps {
  user: OnboardingData;
}

export function AiTutorWhiteboardView({ user }: AiTutorWhiteboardViewProps) {
  const { selection } = useSelection();
  const [resolvedUserId, setResolvedUserId] = useState<string>(user.userId || '');

  useEffect(() => {
    if (!resolvedUserId) {
      const fetchAuthUser = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.id) {
            setResolvedUserId(authUser.id);
          }
        } catch (err) {
          console.warn('[AiTutorWhiteboardView] Auth resolution note:', err);
        }
      };
      fetchAuthUser();
    }
  }, [resolvedUserId]);

  const examId = selection.exam?.id;
  const subjectId = selection.subject?.id;
  const topicId = selection.topic?.id;

  if (!resolvedUserId) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-slate-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <h2 className="text-lg font-bold">Verify your account to use AI Tutor</h2>
        <p className="mt-2 text-sm">We could not confirm your signed-in session. Please sign in again before starting a tutor session.</p>
      </section>
    );
  }

  if (!examId || !subjectId || !topicId) {
    return (
      <section className="rounded-2xl border border-violet-200 bg-white p-6 text-slate-900 dark:border-violet-800/70 dark:bg-slate-900 dark:text-slate-100">
        <h2 className="text-lg font-bold">Choose a topic for your AI Tutor</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Select your exam, subject, and topic in the learning context bar above. The tutor will use that exact curriculum context and will not substitute unrelated content.</p>
      </section>
    );
  }

  return (
    <TutorInteractiveWorkspace
      examId={examId}
      subjectId={subjectId}
      topicId={topicId}
      userId={resolvedUserId}
      topicName={selection.topic?.name || ''}
      subjectName={selection.subject?.name || ''}
      examName={selection.exam?.name || ''}
    )
}

