'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

export interface SelectedItem {
  id: string;
  name: string;
  slug?: string;
  description?: string;
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
  isExamLocked: boolean;
  examSwitchCount: number;
  applyExamSwitch: (newExam: SelectedItem) => Promise<void>;
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
  const [isExamLocked, setIsExamLocked] = useState(true);
  const [examSwitchCount, setExamSwitchCount] = useState(0);

  // Sync to local storage
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
    } catch (err) {
      console.error('Failed to persist selection:', err);
    }
  }, []);

  // Fetch initial hierarchy from Supabase and Server
  const refreshHierarchy = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      let currentLockedExam: SelectedItem | null = null;
      let userLocked = true;
      let switchCount = 0;

      if (user) {
        // Fetch server-authoritative exam state from API
        try {
          const res = await fetch('/api/exams/current');
          const data = await res.json();
          if (data.success && data.currentExam) {
            currentLockedExam = {
              id: data.currentExam.id,
              name: data.currentExam.name,
              slug: data.currentExam.slug || data.currentExam.id,
              description: data.currentExam.description,
            };
            userLocked = data.examLocked;
            switchCount = data.switchCount || 0;
            setIsExamLocked(userLocked);
            setExamSwitchCount(switchCount);
          }
        } catch (apiErr) {
          console.error('Failed to query /api/exams/current, falling back to direct query:', apiErr);
        }

        // Direct DB fallback if API fails
        if (!currentLockedExam) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_exam_id, exam_locked, exam_switch_count')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            userLocked = profile.exam_locked !== false;
            switchCount = profile.exam_switch_count || 0;
            setIsExamLocked(userLocked);
            setExamSwitchCount(switchCount);

            if (profile.current_exam_id) {
              const { data: examData } = await supabase
                .from('exams')
                .select('id, name, slug, description')
                .eq('id', profile.current_exam_id)
                .maybeSingle();

              if (examData) {
                currentLockedExam = {
                  id: examData.id,
                  name: examData.name,
                  slug: examData.slug || examData.id,
                  description: examData.description,
                };
              }
            }
          }
        }
      }

      // Fetch all active exams from platform
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, name, slug, description')
        .eq('status', 'active')
        .order('name');

      const allActiveExams: SelectedItem[] = (examsData && examsData.length > 0)
        ? examsData.map((e) => ({ id: e.id, name: e.name, slug: e.slug || e.id, description: e.description }))
        : [];

      setAvailableExams(allActiveExams);

      // Determine active exam
      let activeExam = currentLockedExam;
      if (!activeExam && allActiveExams.length > 0) {
        activeExam = allActiveExams[0];
      }

      if (activeExam) {
        // Fetch subjects for active exam
        const { data: subjectsData } = await supabase
          .from('exam_subjects')
          .select('id, name, description, created_at')
          .eq('exam_id', activeExam.id)
          .order('created_at', { ascending: true });

        const subjList = (subjectsData && subjectsData.length > 0)
          ? subjectsData.map((s) => ({
              id: s.id,
              name: s.name,
              slug: (s.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            }))
          : [];

        setAvailableSubjects(subjList);

        // Fetch topics for top subject
        let topicList: SelectedItem[] = [];
        if (subjList.length > 0) {
          const { data: topicsData } = await supabase
            .from('exam_topics')
            .select('id, name, description, created_at')
            .eq('subject_id', subjList[0].id)
            .order('created_at', { ascending: true });

          topicList = (topicsData && topicsData.length > 0)
            ? topicsData.map((t) => ({
                id: t.id,
                name: t.name,
                slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
              }))
            : [];
        }

        setAvailableTopics(topicList);

        const newSel = {
          exam: activeExam,
          subject: subjList.length > 0 ? subjList[0] : null,
          topic: topicList.length > 0 ? topicList[0] : null,
        };
        setSelection(newSel);
        persistSelection(newSel);
      }
    } catch (err) {
      console.error('Error refreshing selection hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection]);

  // Apply atomic switch to a new target exam
  const applyExamSwitch = useCallback(async (newExam: SelectedItem) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      // Load subjects for new target exam
      const { data: subjectsData } = await supabase
        .from('exam_subjects')
        .select('id, name, description, created_at')
        .eq('exam_id', newExam.id)
        .order('created_at', { ascending: true });

      const subjList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map((s) => ({
            id: s.id,
            name: s.name,
            slug: (s.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
          }))
        : [];

      setAvailableSubjects(subjList);

      let topicList: SelectedItem[] = [];
      if (subjList.length > 0) {
        const { data: topicsData } = await supabase
          .from('exam_topics')
          .select('id, name, description, created_at')
          .eq('subject_id', subjList[0].id)
          .order('created_at', { ascending: true });

        topicList = (topicsData && topicsData.length > 0)
          ? topicsData.map((t) => ({
              id: t.id,
              name: t.name,
              slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            }))
          : [];
      }

      setAvailableTopics(topicList);

      const newSel = {
        exam: newExam,
        subject: subjList.length > 0 ? subjList[0] : null,
        topic: topicList.length > 0 ? topicList[0] : null,
      };

      setSelection(newSel);
      persistSelection(newSel);
      setExamSwitchCount((prev) => prev + 1);
    } catch (err) {
      console.error('Error applying exam switch in selection context:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection]);

  useEffect(() => {
    let mounted = true;
    const runRefresh = async () => {
      if (mounted) {
        await refreshHierarchy();
      }
    };
    runRefresh();

    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      if (mounted) {
        await refreshHierarchy();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshHierarchy]);

  // Set Exam (Allowed only if unlocked or during initialization)
  const setExam = useCallback(async (exam: SelectedItem) => {
    if (isExamLocked && selection.exam && selection.exam.id !== exam.id) {
      console.warn('Exam is locked on Free Plan. Please use the official $2 USD switch flow.');
      return;
    }
    await applyExamSwitch(exam);
  }, [isExamLocked, selection.exam, applyExamSwitch]);

  // Load topics when subject changes
  const setSubject = useCallback(async (subject: SelectedItem) => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('id, name, description, created_at')
        .eq('subject_id', subject.id)
        .order('created_at', { ascending: true });

      const topicList = (topicsData && topicsData.length > 0)
        ? topicsData.map((t) => ({
            id: t.id,
            name: t.name,
            slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
          }))
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
        isExamLocked,
        examSwitchCount,
        applyExamSwitch,
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
