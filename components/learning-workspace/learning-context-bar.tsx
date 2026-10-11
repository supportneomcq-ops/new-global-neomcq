'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { AddMissingCurriculumModal, AddMissingMode } from '@/components/learning-workspace/add-missing-curriculum-modal';

interface LearningContextBarProps {
  onShowClick?: () => void;
}

export function LearningContextBar({ onShowClick }: LearningContextBarProps = {}) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    availableSubtopics,
    setSubject,
    setTopic,
    setSubtopic,
    isExamLocked,
    examSwitchCount,
  } = useSelection();

  const { orchestrateTopic, refreshTopicContent, isOrchestrating, isLoading, isRefreshing } = useTopicContent();

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

  // Unified Add Missing Curriculum Modal
  const [isAddMissingOpen, setIsAddMissingOpen] = useState(false);
  const [addMissingMode, setAddMissingMode] = useState<AddMissingMode>('topic');

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

  return (
    <>
      <section aria-label="Learning path selector" className="neo-dashboard-enter w-full px-2.5 sm:px-5 py-2.5 sm:py-4 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white dark:border-indigo-400/15 dark:bg-gradient-to-br dark:from-[#0B1020] dark:via-[#10152A] dark:to-[#17112B] shadow-md shadow-slate-900/5">
        <div className="max-w-7xl mx-auto space-y-2.5 sm:space-y-4">
          <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Personalized learning path</p>
                <h2 className="mt-0.5 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Choose exactly what you want to master</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Change the subject, topic or subtopic. Learning tools follow your selection.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-bold">
              <span className="rounded-full border border-indigo-200 bg-white/80 px-2.5 py-1 text-indigo-700 dark:border-indigo-400/20 dark:bg-white/5 dark:text-indigo-200">01 Subject</span>
              <ChevronDown className="h-3 w-3 -rotate-90 text-slate-400" />
              <span className="rounded-full border border-violet-200 bg-white/80 px-2.5 py-1 text-violet-700 dark:border-violet-400/20 dark:bg-white/5 dark:text-violet-200">02 Topic</span>
              <ChevronDown className="h-3 w-3 -rotate-90 text-slate-400" />
              <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-emerald-700 dark:border-emerald-400/20 dark:bg-white/5 dark:text-emerald-200">03 Subtopic</span>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
            {/* Hierarchy Nav Controls */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
            {/* 1. Exam (Locked / Selector) */}
            <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center justify-between sm:justify-start gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 font-bold text-slate-800 dark:text-slate-100">
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
            <div className="relative min-w-0" ref={subjectRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSubjectOpen(!isSubjectOpen);
                  setIsTopicOpen(false);
                  setIsSubtopicOpen(false);
                }}
                className={`w-full min-w-0 justify-between flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-3 sm:py-2.5 font-bold text-xs transition-all duration-200 border shadow-sm hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${
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
                    className="absolute left-0 mt-2 w-[min(19rem,calc(100vw-2rem))] bg-white/95 dark:bg-[#0E1324]/95 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-950/15 z-50 p-2.5 text-xs backdrop-blur-xl"
                  >
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search subjects..."
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
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
                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 hover:translate-x-0.5 ${
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
                          setAddMissingMode('subject');
                          setIsAddMissingOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5"
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
            <div className="relative min-w-0" ref={topicRef}>
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
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
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
                          setAddMissingMode('topic');
                          setIsAddMissingOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5"
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
            <div className="relative min-w-0" ref={subtopicRef}>
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
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
                          setAddMissingMode('subtopic');
                          setIsAddMissingOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5"
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
          <div className="flex items-center gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setAddMissingMode('topic');
                setIsAddMissingOpen(true);
              }}
              className="flex-1 sm:flex-none justify-center px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
              title="Add a missing subject, topic, or subtopic"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Add Missing</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await orchestrateTopic(false);
                if (onShowClick) {
                  onShowClick();
                }
              }}
              disabled={isOrchestrating || isLoading || isRefreshing}
              className={`flex-1 sm:flex-none justify-center px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                isOrchestrating || isLoading || isRefreshing
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/25 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60'
              }`}
              title="Initialize topic workspace and check content library cards"
            >
              {isOrchestrating || isLoading || isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
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
      </section>

      {/* Unified Add Missing Curriculum Modal */}
      <AddMissingCurriculumModal
        isOpen={isAddMissingOpen}
        onClose={() => setIsAddMissingOpen(false)}
        initialMode={addMissingMode}
      />

      {/* Exam Switch Modal */}
      {isExamSwitchModalOpen && (
        <ExamSwitchModal
          isOpen={isExamSwitchModalOpen}
          onClose={() => setIsExamSwitchModalOpen(false)}
          currentExam={activeExam}
        />
      )}
    </>
  );
}
