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
    exam: null,
    subject: null,
    topic: null,
  });

  const [availableExams, setAvailableExams] = useState<SelectedItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SelectedItem[]>([]);
  const [availableTopics, setAvailableTopics] = useState<SelectedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync to local storage & Supabase
  const persistSelection = useCallback(async (newSelection: SelectionState) => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userStorageKey = user ? `${STORAGE_KEY}_${user.id}` : `${STORAGE_KEY}_guest`;
      const userActiveKey = user ? `neomcq_active_exam_${user.id}` : 'neomcq_active_exam_guest';

      if (typeof window !== 'undefined') {
        localStorage.setItem(userStorageKey, JSON.stringify(newSelection));
        if (newSelection.exam) {
          localStorage.setItem(userActiveKey, newSelection.exam.id);
        }
      }

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

      // Fetch User's primary exam from Supabase if logged in (Source of Truth)
      const { data: { user } } = await supabase.auth.getUser();
      
      let userExamsList: SelectedItem[] = [];

      if (user) {
        const { data: userExamsData } = await supabase
          .from('user_exams')
          .select('exam_id, exams(id, name, slug)')
          .eq('user_id', user.id);

        if (userExamsData && userExamsData.length > 0) {
          userExamsList = userExamsData
            .filter((ue) => ue.exams)
            .map((ue) => ({
              id: (ue.exams as any).id,
              name: (ue.exams as any).name,
              slug: (ue.exams as any).slug || (ue.exams as any).id,
            }));
        }
      }

      // Fetch all active exams from the platform
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name');

      const allActiveExams: SelectedItem[] = (examsData && examsData.length > 0)
        ? examsData.map((e) => ({ id: e.id, name: e.name, slug: e.slug || e.id }))
        : [];

      // Combine user enrolled exams first, followed by remaining active exams
      const combinedMap = new Map<string, SelectedItem>();
      for (const ue of userExamsList) {
        combinedMap.set(ue.id, ue);
      }
      for (const ae of allActiveExams) {
        if (!combinedMap.has(ae.id)) {
          combinedMap.set(ae.id, ae);
        }
      }

      const examsList = Array.from(combinedMap.values());
      setAvailableExams(examsList);

      if (examsList.length > 0) {
        // Find active exam
        let activeExam = examsList[0];
        const userActiveKey = user ? `neomcq_active_exam_${user.id}` : 'neomcq_active_exam_guest';
        const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem(userActiveKey) : null;
        if (savedActiveId) {
          const matched = examsList.find((e) => e.id === savedActiveId);
          if (matched) activeExam = matched;
        }

        // Check if user-scoped cached selection exists in localStorage (Guest / unauthenticated fallback)
        const userStorageKey = user ? `${STORAGE_KEY}_${user.id}` : `${STORAGE_KEY}_guest`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(userStorageKey) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.exam && parsed.exam.id === activeExam.id) {
              setSelection(parsed);
              
              // Load subjects for cached exam
              const { data: subjectsData } = await supabase
                .from('exam_subjects')
                .select('id, name, slug')
                .eq('exam_id', parsed.exam.id)
                .order('order_index');

              const subjList = (subjectsData && subjectsData.length > 0)
                ? subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }))
                : [];
              setAvailableSubjects(subjList);

              // Load topics for cached subject
              let topicList: SelectedItem[] = [];
              if (parsed.subject && subjList.some((s) => s.id === parsed.subject.id)) {
                const { data: topicsData } = await supabase
                  .from('exam_topics')
                  .select('id, name, slug')
                  .eq('subject_id', parsed.subject.id)
                  .order('order_index');

                topicList = (topicsData && topicsData.length > 0)
                  ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
                  : [];
              }
              setAvailableTopics(topicList);

              setIsLoading(false);
              return;
            }
          } catch (e) {
            // fallback
          }
        }

        // Fetch subjects for active exam
        const { data: subjectsData } = await supabase
          .from('exam_subjects')
          .select('id, name, slug')
          .eq('exam_id', activeExam.id)
          .order('order_index');

        const subjList = (subjectsData && subjectsData.length > 0)
          ? subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }))
          : [];

        setAvailableSubjects(subjList);

        // Fetch topics for top subject
        let topicList: SelectedItem[] = [];
        if (subjList.length > 0) {
          const { data: topicsData } = await supabase
            .from('exam_topics')
            .select('id, name, slug')
            .eq('subject_id', subjList[0].id)
            .order('order_index');

          topicList = (topicsData && topicsData.length > 0)
            ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
            : [];
        }

        setAvailableTopics(topicList);

        const newSel = {
          exam: activeExam,
          subject: subjList.length > 0 ? subjList[0] : null,
          topic: topicList.length > 0 ? topicList[0] : null,
        };
        setSelection(newSel);
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

    // Listen for auth state changes to re-evaluate the hierarchy immediately
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        await refreshHierarchy();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshHierarchy]);

  // Load subjects when exam changes
  const setExam = useCallback(async (exam: SelectedItem) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: subjectsData } = await supabase
        .from('exam_subjects')
        .select('id, name, slug')
        .eq('exam_id', exam.id)
        .order('order_index');

      const subjList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map((s) => ({ id: s.id, name: s.name, slug: s.slug || s.id }))
        : [];

      setAvailableSubjects(subjList);

      let topicList: SelectedItem[] = [];
      if (subjList.length > 0) {
        // Load topics for first subject
        const { data: topicsData } = await supabase
          .from('exam_topics')
          .select('id, name, slug')
          .eq('subject_id', subjList[0].id)
          .order('order_index');

        topicList = (topicsData && topicsData.length > 0)
          ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
          : [];
      }

      setAvailableTopics(topicList);

      const newSel = {
        exam,
        subject: subjList.length > 0 ? subjList[0] : null,
        topic: topicList.length > 0 ? topicList[0] : null,
      };
      setSelection(newSel);
      persistSelection(newSel);
    } catch (err) {
      console.error('Error setting exam:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection]);

  // Load topics when subject changes
  const setSubject = useCallback(async (subject: SelectedItem) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('id, name, slug')
        .eq('subject_id', subject.id)
        .order('order_index');

      const topicList = (topicsData && topicsData.length > 0)
        ? topicsData.map((t) => ({ id: t.id, name: t.name, slug: t.slug || t.id }))
        : [];

      setAvailableTopics(topicList);

      setSelection((prev) => {
        const newSel = { ...prev, subject, topic: topicList.length > 0 ? topicList[0] : null };
        persistSelection(newSel);
        return newSel;
      });
    } catch (err) {
      console.error('Error setting subject:', err);
    } finally {
      setIsLoading(false);
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
