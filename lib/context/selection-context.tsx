'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export interface SelectedItem {
  id: string;
  name: string;
  slug?: string;
}

export interface SelectionState {
  exam: SelectedItem | null;
  subject: SelectedItem | null;
  topic: SelectedItem | null;
}

interface SelectionContextType {
  selection: SelectionState;
  setExam: (exam: SelectedItem) => void;
  setSubject: (subject: SelectedItem) => void;
  setTopic: (topic: SelectedItem) => void;
  setFullSelection: (exam: SelectedItem, subject: SelectedItem, topic: SelectedItem) => void;
  availableExams: SelectedItem[];
  availableSubjects: SelectedItem[];
  availableTopics: SelectedItem[];
  isLoading: boolean;
  refreshHierarchy: () => Promise<void>;
}

const STORAGE_KEY = 'neomcq_current_selection';

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>({
    exam: { id: 'usmle-step-1', name: 'USMLE Step 1 & 2 CK', slug: 'usmle-step-1' },
    subject: { id: 'human-anatomy', name: 'Human Anatomy', slug: 'human-anatomy' },
    topic: { id: 'cardiovascular-anatomy', name: 'Cardiovascular Anatomy & Coronary Vessels', slug: 'cardiovascular-anatomy' },
  });

  const [availableExams, setAvailableExams] = useState<SelectedItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SelectedItem[]>([]);
  const [availableTopics, setAvailableTopics] = useState<SelectedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync to local storage & Supabase
  const persistSelection = useCallback(async (newSelection: SelectionState) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelection));
      }

      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && newSelection.exam) {
        // Upsert user exam selection
        await supabase
          .from('user_exams')
          .upsert(
            {
              user_id: user.id,
              exam_id: newSelection.exam.id,
              status: 'in_progress',
            },
            { onConflict: 'user_id,exam_id' }
          );
      }
    } catch (err) {
      console.error('Failed to persist selection:', err);
    }
  }, []);

  // Fetch initial hierarchy from Supabase
  const refreshHierarchy = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      // 1. Fetch Exams
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name');

      if (examsData && examsData.length > 0) {
        const examsList = examsData.map((e) => ({ id: e.id, name: e.name, slug: e.slug || e.id }));
        setAvailableExams(examsList);

        // Check if cached selection exists in localStorage
        const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.exam && parsed.subject && parsed.topic) {
              setSelection(parsed);
              
              // Load subjects for cached exam
              const { data: subjectsData } = await supabase
                .from('exam_subjects')
                .select('id, name, slug')
                .eq('exam_id', parsed.exam.id)
                .order('order_index');

              const subjList = (subjectsData && subjectsData.length > 0)
                ? subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }))
                : [parsed.subject];
              setAvailableSubjects(subjList);

              // Load topics for cached subject
              const { data: topicsData } = await supabase
                .from('exam_topics')
                .select('id, name, slug')
                .eq('subject_id', parsed.subject.id)
                .order('order_index');

              const topicList = (topicsData && topicsData.length > 0)
                ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
                : [parsed.topic];
              setAvailableTopics(topicList);

              setIsLoading(false);
              return;
            }
          } catch (e) {
            // fallback
          }
        }

        // Fetch User's primary exam from Supabase if logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userExam } = await supabase
            .from('user_exams')
            .select('exam_id, exams(id, name, slug)')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userExam?.exams) {
            const examObj = {
              id: (userExam.exams as any).id,
              name: (userExam.exams as any).name,
              slug: (userExam.exams as any).slug || (userExam.exams as any).id,
            };

            // Fetch subjects for this exam
            const { data: subjectsData } = await supabase
              .from('exam_subjects')
              .select('id, name, slug')
              .eq('exam_id', examObj.id)
              .order('order_index');

            if (subjectsData && subjectsData.length > 0) {
              const subjList = subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }));
              setAvailableSubjects(subjList);

              // Fetch topics for top subject
              const { data: topicsData } = await supabase
                .from('exam_topics')
                .select('id, name, slug')
                .eq('subject_id', subjList[0].id)
                .order('order_index');

              const topicList = (topicsData && topicsData.length > 0)
                ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
                : [{ id: 't1', name: 'General Overview', slug: 'overview' }];

              setAvailableTopics(topicList);

              const newSel = {
                exam: examObj,
                subject: subjList[0],
                topic: topicList[0],
              };
              setSelection(newSel);
              setIsLoading(false);
              return;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing selection hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const runRefresh = async () => {
      if (mounted) {
        await refreshHierarchy();
      }
    };
    runRefresh();
    return () => {
      mounted = false;
    };
  }, [refreshHierarchy]);

  // Load subjects when exam changes
  const setExam = useCallback(async (exam: SelectedItem) => {
    try {
      const supabase = getSupabaseClient();
      const { data: subjectsData } = await supabase
        .from('exam_subjects')
        .select('id, name, slug')
        .eq('exam_id', exam.id)
        .order('order_index');

      const subjList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }))
        : [{ id: `subj-${exam.id}`, name: 'Core Foundations', slug: 'foundations' }];

      setAvailableSubjects(subjList);

      // Load topics for first subject
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('id, name, slug')
        .eq('subject_id', subjList[0].id)
        .order('order_index');

      const topicList = (topicsData && topicsData.length > 0)
        ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
        : [{ id: `top-${subjList[0].id}`, name: 'Key Concepts & High Yield', slug: 'key-concepts' }];

      setAvailableTopics(topicList);

      const newSel = {
        exam,
        subject: subjList[0],
        topic: topicList[0],
      };
      setSelection(newSel);
      persistSelection(newSel);
    } catch (err) {
      console.error('Error setting exam:', err);
    }
  }, [persistSelection]);

  // Load topics when subject changes
  const setSubject = useCallback(async (subject: SelectedItem) => {
    try {
      const supabase = getSupabaseClient();
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('id, name, slug')
        .eq('subject_id', subject.id)
        .order('order_index');

      const topicList = (topicsData && topicsData.length > 0)
        ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
        : [{ id: `top-${subject.id}`, name: 'Core Topic Practice', slug: 'core-topic' }];

      setAvailableTopics(topicList);

      setSelection((prev) => {
        const newSel = { ...prev, subject, topic: topicList[0] };
        persistSelection(newSel);
        return newSel;
      });
    } catch (err) {
      console.error('Error setting subject:', err);
    }
  }, [persistSelection]);

  const setTopic = useCallback((topic: SelectedItem) => {
    setSelection((prev) => {
      const newSel = { ...prev, topic };
      persistSelection(newSel);
      return newSel;
    });
  }, [persistSelection]);

  const setFullSelection = useCallback((exam: SelectedItem, subject: SelectedItem, topic: SelectedItem) => {
    const newSel = { exam, subject, topic };
    setSelection(newSel);
    persistSelection(newSel);
  }, [persistSelection]);

  return (
    <SelectionContext.Provider
      value={{
        selection,
        setExam,
        setSubject,
        setTopic,
        setFullSelection,
        availableExams,
        availableSubjects,
        availableTopics,
        isLoading,
        refreshHierarchy,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
