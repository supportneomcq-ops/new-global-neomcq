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
  subtopic: SelectedItem | null;
}

interface SelectionContextType {
  selection: SelectionState;
  setExam: (exam: SelectedItem) => void;
  setSubject: (subject: SelectedItem) => void;
  setTopic: (topic: SelectedItem) => void;
  setSubtopic: (subtopic: SelectedItem | null) => void;
  setFullSelection: (exam: SelectedItem, subject: SelectedItem, topic: SelectedItem, subtopic?: SelectedItem | null) => void;
  availableExams: SelectedItem[];
  availableSubjects: SelectedItem[];
  availableTopics: SelectedItem[];
  availableSubtopics: SelectedItem[];
  isLoading: boolean;
  isExamLocked: boolean;
  examSwitchCount: number;
  targetDate: string | null;
  targetScore: number | null;
  applyExamSwitch: (newExam: SelectedItem) => Promise<void>;
  refreshHierarchy: () => Promise<void>;
  addSubject: (name: string, description?: string) => Promise<SelectedItem>;
  addTopic: (name: string, subjectId?: string, description?: string) => Promise<SelectedItem>;
  addSubtopic: (name: string, topicId?: string, description?: string) => Promise<SelectedItem>;
}

const STORAGE_KEY = 'neomcq_current_selection';

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

function sanitizeSelectedItem(item: any): SelectedItem | null {
  if (!item || typeof item !== 'object') return null;
  if ('nativeEvent' in item || 'target' in item || 'preventDefault' in item || '_reactName' in item || 'stateNode' in item) {
    return null;
  }
  if (!item.id && !item.name) return null;
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    slug: item.slug ? String(item.slug) : undefined,
    description: item.description ? String(item.description) : undefined,
  };
}

function sanitizeSelectionState(state: SelectionState): SelectionState {
  return {
    exam: sanitizeSelectedItem(state.exam),
    subject: sanitizeSelectedItem(state.subject),
    topic: sanitizeSelectedItem(state.topic),
    subtopic: sanitizeSelectedItem(state.subtopic),
  };
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>({
    exam: null,
    subject: null,
    topic: null,
    subtopic: null,
  });

  const [availableExams, setAvailableExams] = useState<SelectedItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SelectedItem[]>([]);
  const [availableTopics, setAvailableTopics] = useState<SelectedItem[]>([]);
  const [availableSubtopics, setAvailableSubtopics] = useState<SelectedItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExamLocked, setIsExamLocked] = useState(true);
  const [examSwitchCount, setExamSwitchCount] = useState(0);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [targetScore, setTargetScore] = useState<number | null>(null);

  // Sync to local storage
  const persistSelection = useCallback(async (newSelection: SelectionState) => {
    try {
      const cleanSel = sanitizeSelectionState(newSelection);
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userStorageKey = user ? `${STORAGE_KEY}_${user.id}` : `${STORAGE_KEY}_guest`;
      const userActiveKey = user ? `neomcq_active_exam_${user.id}` : 'neomcq_active_exam_guest';

      if (typeof window !== 'undefined') {
        localStorage.setItem(userStorageKey, JSON.stringify(cleanSel));
        if (cleanSel.exam && cleanSel.exam.id) {
          localStorage.setItem(userActiveKey, cleanSel.exam.id);
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
      let userTargetDate: string | null = null;
      let userTargetScore: number | null = null;

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
            userTargetDate = data.targetDate || null;
            userTargetScore = data.targetScore || null;
            setIsExamLocked(userLocked);
            setExamSwitchCount(switchCount);
            setTargetDate(userTargetDate);
            setTargetScore(userTargetScore);
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
        .neq('status', 'archived')
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
        let { data: subjectsData } = await supabase
          .from('exam_subjects')
          .select('id, name, description, created_at')
          .eq('exam_id', activeExam.id)
          .order('name', { ascending: true });

        // If active exam has 0 subjects in database, trigger lazy reconciliation
        if (!subjectsData || subjectsData.length === 0) {
          try {
            await fetch('/api/curriculum/reconcile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                examId: activeExam.id,
                examInput: activeExam.name,
              }),
            });
            const refreshed = await supabase
              .from('exam_subjects')
              .select('id, name, description, created_at')
              .eq('exam_id', activeExam.id)
              .order('name', { ascending: true });
            subjectsData = refreshed.data;
          } catch (reconcileErr) {
            console.warn('Lazy curriculum reconciliation note:', reconcileErr);
          }
        }

        const subjList = (subjectsData && subjectsData.length > 0)
          ? subjectsData.map((s) => ({
              id: s.id,
              name: s.name,
              slug: (s.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
              description: s.description,
            }))
          : [];

        setAvailableSubjects(subjList);

        // Determine which subject to select
        let selectedSubj = subjList.length > 0 ? subjList[0] : null;
        let savedSel: SelectionState | null = null;
        if (typeof window !== 'undefined') {
          const userStorageKey = user ? `${STORAGE_KEY}_${user.id}` : `${STORAGE_KEY}_guest`;
          const stored = localStorage.getItem(userStorageKey);
          if (stored) {
            try {
              savedSel = JSON.parse(stored);
            } catch {}
          }
        }

        const currentSubjId = savedSel?.subject?.id;
        const matchedSubj = subjList.find((s) => s.id === currentSubjId);
        if (matchedSubj) {
          selectedSubj = matchedSubj;
        }

        // Fetch topics for the selected subject
        let topicList: SelectedItem[] = [];
        if (selectedSubj) {
          const { data: topicsData } = await supabase
            .from('exam_topics')
            .select('id, name, description, created_at')
            .eq('subject_id', selectedSubj.id)
            .order('name', { ascending: true });

          topicList = (topicsData && topicsData.length > 0)
            ? topicsData.map((t) => ({
                id: t.id,
                name: t.name,
                slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
                description: t.description,
              }))
            : [];
        }

        setAvailableTopics(topicList);

        let selectedTop = topicList.length > 0 ? topicList[0] : null;
        const currentTopId = savedSel?.topic?.id;
        const matchedTop = topicList.find((t) => t.id === currentTopId);
        if (matchedTop) {
          selectedTop = matchedTop;
        }

        // Fetch subtopics for the selected topic
        let subtopicList: SelectedItem[] = [];
        if (selectedTop) {
          const { data: subtopicsData } = await supabase
            .from('exam_subtopics')
            .select('id, name, description, created_at')
            .eq('topic_id', selectedTop.id)
            .order('name', { ascending: true });

          subtopicList = (subtopicsData && subtopicsData.length > 0)
            ? subtopicsData.map((st) => ({
                id: st.id,
                name: st.name,
                slug: (st.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
                description: st.description,
              }))
            : [];
        }

        setAvailableSubtopics(subtopicList);

        let selectedSubtop = subtopicList.length > 0 ? subtopicList[0] : null;
        const currentSubtopId = savedSel?.subtopic?.id;
        const matchedSubtop = subtopicList.find((st) => st.id === currentSubtopId);
        if (matchedSubtop) {
          selectedSubtop = matchedSubtop;
        }

        const newSel: SelectionState = {
          exam: activeExam,
          subject: selectedSubj,
          topic: selectedTop,
          subtopic: selectedSubtop,
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
        .order('name', { ascending: true });

      const subjList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map((s) => ({
            id: s.id,
            name: s.name,
            slug: (s.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            description: s.description,
          }))
        : [];

      setAvailableSubjects(subjList);

      let topicList: SelectedItem[] = [];
      let subtopicList: SelectedItem[] = [];

      if (subjList.length > 0) {
        const { data: topicsData } = await supabase
          .from('exam_topics')
          .select('id, name, description, created_at')
          .eq('subject_id', subjList[0].id)
          .order('name', { ascending: true });

        topicList = (topicsData && topicsData.length > 0)
          ? topicsData.map((t) => ({
              id: t.id,
              name: t.name,
              slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
              description: t.description,
            }))
          : [];

        if (topicList.length > 0) {
          const { data: subtopicsData } = await supabase
            .from('exam_subtopics')
            .select('id, name, description, created_at')
            .eq('topic_id', topicList[0].id)
            .order('name', { ascending: true });

          subtopicList = (subtopicsData && subtopicsData.length > 0)
            ? subtopicsData.map((st) => ({
                id: st.id,
                name: st.name,
                slug: (st.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
                description: st.description,
              }))
            : [];
        }
      }

      setAvailableTopics(topicList);
      setAvailableSubtopics(subtopicList);

      const newSel: SelectionState = {
        exam: newExam,
        subject: subjList.length > 0 ? subjList[0] : null,
        topic: topicList.length > 0 ? topicList[0] : null,
        subtopic: subtopicList.length > 0 ? subtopicList[0] : null,
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
    const cleanExam = sanitizeSelectedItem(exam);
    if (!cleanExam) return;
    if (isExamLocked && selection.exam && selection.exam.id !== cleanExam.id) {
      console.warn('Exam is locked on Free Plan. Please use the official $2 USD switch flow.');
      return;
    }
    await applyExamSwitch(cleanExam);
  }, [isExamLocked, selection.exam, applyExamSwitch]);

  // Load topics & subtopics when subject changes
  const setSubject = useCallback(async (subject: SelectedItem) => {
    const cleanSubject = sanitizeSelectedItem(subject);
    if (!cleanSubject) return;
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: topicsData } = await supabase
        .from('exam_topics')
        .select('id, name, description, created_at')
        .eq('subject_id', cleanSubject.id)
        .order('name', { ascending: true });

      const topicList = (topicsData && topicsData.length > 0)
        ? topicsData.map((t) => ({
            id: t.id,
            name: t.name,
            slug: (t.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            description: t.description,
          }))
        : [];

      setAvailableTopics(topicList);

      let subtopicList: SelectedItem[] = [];
      const firstTopic = topicList.length > 0 ? topicList[0] : null;

      if (firstTopic) {
        const { data: subtopicsData } = await supabase
          .from('exam_subtopics')
          .select('id, name, description, created_at')
          .eq('topic_id', firstTopic.id)
          .order('name', { ascending: true });

        subtopicList = (subtopicsData && subtopicsData.length > 0)
          ? subtopicsData.map((st) => ({
              id: st.id,
              name: st.name,
              slug: (st.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
              description: st.description,
            }))
          : [];
      }

      setAvailableSubtopics(subtopicList);

      setSelection((prev) => {
        const newSel: SelectionState = {
          ...prev,
          subject: cleanSubject,
          topic: firstTopic,
          subtopic: subtopicList.length > 0 ? subtopicList[0] : null,
        };
        persistSelection(newSel);
        return newSel;
      });
    } catch (err) {
      console.error('Error setting subject:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection]);

  // Load subtopics when topic changes
  const setTopic = useCallback(async (topic: SelectedItem) => {
    const cleanTopic = sanitizeSelectedItem(topic);
    if (!cleanTopic) return;
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: subtopicsData } = await supabase
        .from('exam_subtopics')
        .select('id, name, description, created_at')
        .eq('topic_id', cleanTopic.id)
        .order('name', { ascending: true });

      const subtopicList = (subtopicsData && subtopicsData.length > 0)
        ? subtopicsData.map((st) => ({
            id: st.id,
            name: st.name,
            slug: (st.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            description: st.description,
          }))
        : [];

      setAvailableSubtopics(subtopicList);

      setSelection((prev) => {
        const newSel: SelectionState = {
          ...prev,
          topic: cleanTopic,
          subtopic: subtopicList.length > 0 ? subtopicList[0] : null,
        };
        persistSelection(newSel);
        return newSel;
      });
    } catch (err) {
      console.error('Error setting topic:', err);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection]);

  const setSubtopic = useCallback((subtopic: SelectedItem | null) => {
    const cleanSubtop = subtopic ? sanitizeSelectedItem(subtopic) : null;
    setSelection((prev) => {
      const newSel: SelectionState = { ...prev, subtopic: cleanSubtop };
      persistSelection(newSel);
      return newSel;
    });
  }, [persistSelection]);

  const setFullSelection = useCallback((
    exam: SelectedItem,
    subject: SelectedItem,
    topic: SelectedItem,
    subtopic?: SelectedItem | null
  ) => {
    const cleanExam = sanitizeSelectedItem(exam);
    const cleanSubject = sanitizeSelectedItem(subject);
    const cleanTopic = sanitizeSelectedItem(topic);
    const cleanSubtop = subtopic ? sanitizeSelectedItem(subtopic) : null;
    const newSel: SelectionState = {
      exam: cleanExam,
      subject: cleanSubject,
      topic: cleanTopic,
      subtopic: cleanSubtop,
    };
    setSelection(newSel);
    persistSelection(newSel);
  }, [persistSelection]);

  // + Add Subject
  const addSubject = useCallback(async (name: string, description?: string): Promise<SelectedItem> => {
    if (!selection.exam?.id) throw new Error('No active exam selected.');
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId: selection.exam.id, name, description }),
    });
    const data = await res.json();
    if (!data.success || !data.subject) {
      throw new Error(data.error || 'Failed to add subject.');
    }
    const created: SelectedItem = {
      id: data.subject.id,
      name: data.subject.name,
      slug: (data.subject.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      description: data.subject.description,
    };
    setAvailableSubjects((prev) => {
      if (prev.some((s) => s.id === created.id)) return prev;
      return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
    });
    await setSubject(created);
    return created;
  }, [selection.exam, setSubject]);

  // + Add Topic
  const addTopic = useCallback(async (name: string, subjectId?: string, description?: string): Promise<SelectedItem> => {
    const targetSubjectId = subjectId || selection.subject?.id;
    if (!targetSubjectId) throw new Error('No active subject selected.');
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: selection.exam?.id,
        subjectId: targetSubjectId,
        name,
        description,
      }),
    });
    const data = await res.json();
    if (!data.success || !data.topic) {
      throw new Error(data.error || 'Failed to add topic.');
    }
    const created: SelectedItem = {
      id: data.topic.id,
      name: data.topic.name,
      slug: (data.topic.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      description: data.topic.description,
    };
    setAvailableTopics((prev) => {
      if (prev.some((t) => t.id === created.id)) return prev;
      return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
    });
    await setTopic(created);
    return created;
  }, [selection.exam, selection.subject, setTopic]);

  // + Add Subtopic
  const addSubtopic = useCallback(async (name: string, topicId?: string, description?: string): Promise<SelectedItem> => {
    const targetTopicId = topicId || selection.topic?.id;
    if (!targetTopicId) throw new Error('No active topic selected.');
    const res = await fetch('/api/subtopics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId: selection.exam?.id,
        subjectId: selection.subject?.id,
        topicId: targetTopicId,
        name,
        description,
      }),
    });
    const data = await res.json();
    if (!data.success || !data.subtopic) {
      throw new Error(data.error || 'Failed to add subtopic.');
    }
    const created: SelectedItem = {
      id: data.subtopic.id,
      name: data.subtopic.name,
      slug: (data.subtopic.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      description: data.subtopic.description,
    };
    setAvailableSubtopics((prev) => {
      if (prev.some((st) => st.id === created.id)) return prev;
      return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
    });
    setSubtopic(created);
    return created;
  }, [selection.exam, selection.subject, selection.topic, setSubtopic]);

  return (
    <SelectionContext.Provider
      value={{
        selection,
        setExam,
        setSubject,
        setTopic,
        setSubtopic,
        setFullSelection,
        availableExams,
        availableSubjects,
        availableTopics,
        availableSubtopics,
        isLoading,
        isExamLocked,
        examSwitchCount,
        targetDate,
        targetScore,
        applyExamSwitch,
        refreshHierarchy,
        addSubject,
        addTopic,
        addSubtopic,
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
