'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ChevronDown,
  Plus,
  BookOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Check,
  Layers,
  FileText,
  Bookmark,
} from 'lucide-react';
import { useSelection, SelectedItem } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { ExamSwitchModal } from '@/components/exam-switch-modal';

export function LearningContextBar() {
  const {
    selection,
    availableSubjects,
    availableTopics,
    availableSubtopics,
    setSubject,
    setTopic,
    setSubtopic,
    addSubject,
    addTopic,
    addSubtopic,
    isExamLocked,
    examSwitchCount,
  } = useSelection();

  const { refreshTopicContent, isLoading, isRefreshing } = useTopicContent();

  const activeExam = selection.exam;
  const activeSubject = selection.subject;
  const activeTopic = selection.topic;
  const activeSubtopic = selection.subtopic;

  // Dropdown States
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [isSubtopicOpen, setIsSubtopicOpen] = useState(false);
  const [isExamSwitchModalOpen, setIsExamSwitchModalOpen] = useState(false);

  // Search Filters
  const [subjectQuery, setSubjectQuery] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const [subtopicQuery, setSubtopicQuery] = useState('');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddSubtopicOpen, setIsAddSubtopicOpen] = useState(false);

  // Form Inputs
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubtopicName, setNewSubtopicName] = useState('');

  // Submitting / Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Refs for click outside
  const subjectRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);
  const subtopicRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (subjectRef.current && !subjectRef.current.contains(event.target as Node)) {
        setIsSubjectOpen(false);
      }
      if (topicRef.current && !topicRef.current.contains(event.target as Node)) {
        setIsTopicOpen(false);
      }
      if (subtopicRef.current && !subtopicRef.current.contains(event.target as Node)) {
        setIsSubtopicOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Lists
  const filteredSubjects = useMemo(() => {
    if (!subjectQuery.trim()) return availableSubjects;
    return availableSubjects.filter((s) =>
      s.name.toLowerCase().includes(subjectQuery.toLowerCase().trim())
    );
  }, [availableSubjects, subjectQuery]);

  const filteredTopics = useMemo(() => {
    if (!topicQuery.trim()) return availableTopics;
    return availableTopics.filter((t) =>
      t.name.toLowerCase().includes(topicQuery.toLowerCase().trim())
    );
  }, [availableTopics, topicQuery]);

  const filteredSubtopics = useMemo(() => {
    if (!subtopicQuery.trim()) return availableSubtopics;
    return availableSubtopics.filter((st) =>
      st.name.toLowerCase().includes(subtopicQuery.toLowerCase().trim())
    );
  }, [availableSubtopics, subtopicQuery]);

  // Handlers for Adding
  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const created = await addSubject(newSubjectName.trim());
      setModalSuccess(`Subject '${created.name}' added successfully!`);
      setTimeout(() => {
        setIsAddSubjectOpen(false);
        setNewSubjectName('');
        setModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const created = await addTopic(newTopicName.trim());
      setModalSuccess(`Topic '${created.name}' added successfully!`);
      setTimeout(() => {
        setIsAddTopicOpen(false);
        setNewTopicName('');
        setModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add topic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubtopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtopicName.trim()) return;
    setIsSubmitting(true);
    setModalError(null);
    try {
      const created = await addSubtopic(newSubtopicName.trim());
      setModalSuccess(`Subtopic '${created.name}' added successfully!`);
      setTimeout(() => {
        setIsAddSubtopicOpen(false);
        setNewSubtopicName('');
        setModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add subtopic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-[#0B101E] border-b border-slate-200 dark:border-slate-800/80 px-4 py-2.5 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Hierarchy Nav Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* 1. Exam (Locked / Selector) */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 font-bold text-slate-800 dark:text-slate-100 shadow-inner">
              <BookOpen className="w-3.5 h-3.5 text-[#6D5BFF]" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]" title={activeExam?.name || 'Exam'}>
                {activeExam?.name || 'Loading Exam...'}
              </span>
              {isExamLocked ? (
                <button
                  type="button"
                  onClick={() => setIsExamSwitchModalOpen(true)}
                  className="ml-1 text-[10px] bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#8877FF] px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-[#6D5BFF]/20 transition-colors"
                  title="Exam Locked on Study Plan. Click to switch ($2 USD / Free once per plan)."
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span className="font-extrabold">Locked</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsExamSwitchModalOpen(true)}
                  className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-500/20"
                >
                  Switch
                </button>
              )}
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">/</span>

            {/* 2. Subject Dropdown */}
            <div className="relative" ref={subjectRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubjectOpen(!isSubjectOpen);
                  setIsTopicOpen(false);
                  setIsSubtopicOpen(false);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold text-xs transition-all border ${
                  activeSubject
                    ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-[#6D5BFF]/50'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00D4FF]" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeSubject?.name || 'Select Subject'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </button>

              <AnimatePresence>
                {isSubjectOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                  >
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search subjects..."
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredSubjects.map((s) => {
                        const isSelected = activeSubject?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSubject(s);
                              setIsSubjectOpen(false);
                              setSubjectQuery('');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-[#6D5BFF]/10 text-[#6D5BFF] font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#6D5BFF]" />}
                          </button>
                        );
                      })}
                      {filteredSubjects.length === 0 && (
                        <div className="text-center py-3 text-slate-400 text-[11px]">
                          No matching subjects found
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubjectOpen(false);
                          setIsAddSubjectOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-[#6D5BFF]/10 hover:bg-[#6D5BFF]/20 text-[#6D5BFF] dark:text-[#8877FF] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subject</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">/</span>

            {/* 3. Topic Dropdown */}
            <div className="relative" ref={topicRef}>
              <button
                type="button"
                onClick={() => {
                  setIsTopicOpen(!isTopicOpen);
                  setIsSubjectOpen(false);
                  setIsSubtopicOpen(false);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold text-xs transition-all border ${
                  activeTopic
                    ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-[#A855F7]/50'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#A855F7]" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeTopic?.name || 'Select Topic'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </button>

              <AnimatePresence>
                {isTopicOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                  >
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search topics..."
                        value={topicQuery}
                        onChange={(e) => setTopicQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#A855F7]"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredTopics.map((t) => {
                        const isSelected = activeTopic?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTopic(t);
                              setIsTopicOpen(false);
                              setTopicQuery('');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-[#A855F7]/10 text-[#A855F7] font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#A855F7]" />}
                          </button>
                        );
                      })}
                      {filteredTopics.length === 0 && (
                        <div className="text-center py-3 text-slate-400 text-[11px]">
                          No matching topics found
                        </div>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTopicOpen(false);
                          setIsAddTopicOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-[#A855F7]/10 hover:bg-[#A855F7]/20 text-[#A855F7] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Topic</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">/</span>

            {/* 4. Subtopic Dropdown */}
            <div className="relative" ref={subtopicRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubtopicOpen(!isSubtopicOpen);
                  setIsSubjectOpen(false);
                  setIsTopicOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold text-xs transition-all border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-emerald-500/50"
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeSubtopic?.name || (availableSubtopics.length > 0 ? 'Select Subtopic' : 'All Subtopics')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </button>

              <AnimatePresence>
                {isSubtopicOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                  >
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search subtopics..."
                        value={subtopicQuery}
                        onChange={(e) => setSubtopicQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSubtopic(null);
                          setIsSubtopicOpen(false);
                          setSubtopicQuery('');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          !activeSubtopic
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">All Subtopics (Full Topic Coverage)</span>
                        {!activeSubtopic && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>

                      {filteredSubtopics.map((st) => {
                        const isSelected = activeSubtopic?.id === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setSubtopic(st);
                              setIsSubtopicOpen(false);
                              setSubtopicQuery('');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="truncate">{st.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubtopicOpen(false);
                          setIsAddSubtopicOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Subtopic</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Tools: SHOW / Resolve Content & Add Missing */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddTopicOpen(true)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              title="Add a missing subject, topic, or subtopic"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Add Missing</span>
            </button>

            <button
              type="button"
              onClick={() => refreshTopicContent(true)}
              disabled={isLoading || isRefreshing}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                isLoading || isRefreshing
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
              }`}
              title="Generate or reload high-yield content (MCQs, Notes, Flashcards, Tutor) for selected topic"
            >
              {isLoading || isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Resolving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>SHOW</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals for Add Subject, Add Topic, Add Subtopic */}
      {/* 1. Add Subject Modal */}
      <AnimatePresence>
        {isAddSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#6D5BFF]/10 text-[#6D5BFF]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base">Add Subject</h3>
                    <p className="text-xs text-slate-400">Under {activeExam?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubjectOpen(false);
                    setModalError(null);
                    setModalSuccess(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddSubjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Subject Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="e.g. Pharmacology, Pathology, Biochemistry"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSubjectOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newSubjectName.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-[#6D5BFF]/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Save Subject</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Topic Modal */}
      <AnimatePresence>
        {isAddTopicOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#A855F7]/10 text-[#A855F7]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base">Add Topic</h3>
                    <p className="text-xs text-slate-400">Under {activeSubject?.name || 'Subject'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTopicOpen(false);
                    setModalError(null);
                    setModalSuccess(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddTopicSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="e.g. Antimicrobial Agents, Valvular Heart Diseases"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddTopicOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTopicName.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-[#A855F7] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-[#A855F7]/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Save Topic</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Add Subtopic Modal */}
      <AnimatePresence>
        {isAddSubtopicOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base">Add Subtopic</h3>
                    <p className="text-xs text-slate-400">Under {activeTopic?.name || 'Topic'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubtopicOpen(false);
                    setModalError(null);
                    setModalSuccess(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddSubtopicSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Subtopic Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubtopicName}
                    onChange={(e) => setNewSubtopicName(e.target.value)}
                    placeholder="e.g. Beta-Lactam Antibiotics, Mechanism of Action"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddSubtopicOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newSubtopicName.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>Save Subtopic</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exam Switch Modal */}
      {isExamSwitchModalOpen && (
        <ExamSwitchModal
          isOpen={isExamSwitchModalOpen}
          onClose={() => setIsExamSwitchModalOpen(false)}
          currentExam={activeExam}
          switchCount={examSwitchCount}
        />
      )}
    </>
  );
}
