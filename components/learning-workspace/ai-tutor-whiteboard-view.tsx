'use client';

import React from 'react';
import { useSelection } from '@/lib/context/selection-context';
import { OnboardingData } from '@/components/onboarding-flow';
import { TutorInteractiveWorkspace } from '@/components/ai-tutor/tutor-interactive-workspace';

interface AiTutorWhiteboardViewProps {
  user: OnboardingData;
}

export function AiTutorWhiteboardView({ user }: AiTutorWhiteboardViewProps) {
  const { selection } = useSelection();

  // Fallback canonical medical IDs if selection is incomplete
  const examId = selection.exam?.id || '8d30e3bb-d55a-4b9d-83ff-1d1ebc96f241';
  const subjectId = selection.subject?.id || '7e4b9d12-1f8a-4c90-9f2d-888888888888';
  const topicId = selection.topic?.id || 'a1b2c3d4-e5f6-7890-abcd-111111111111';

  return (
    <TutorInteractiveWorkspace
      examId={examId}
      subjectId={subjectId}
      topicId={topicId}
      userId={user.userId || user.email || 'system-user'}
      topicName={selection.topic?.name || 'Coronary Artery Disease'}
      subjectName={selection.subject?.name || 'Cardiology'}
      examName={selection.exam?.name || user.examName || 'USMLE Step 1'}
    />
  );
}

