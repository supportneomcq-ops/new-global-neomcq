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

  const examId = selection.exam?.id || '8d30e3bb-d55a-4b9d-83ff-1d1ebc96f241';
  const subjectId = selection.subject?.id || '7e4b9d12-1f8a-4c90-9f2d-888888888888';
  const topicId = selection.topic?.id || 'a1b2c3d4-e5f6-7890-abcd-111111111111';

  return (
    <TutorInteractiveWorkspace
      examId={examId}
      subjectId={subjectId}
      topicId={topicId}
      userId={resolvedUserId || user.userId || ''}
      topicName={selection.topic?.name || 'High-Yield Exam Concepts'}
      subjectName={selection.subject?.name || 'Core Curriculum Subject'}
      examName={selection.exam?.name || user.examName || 'Examination'}
    />
  );
}

