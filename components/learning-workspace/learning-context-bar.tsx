'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  Plus,
  BookOpen,
  Sparkles,
  Loader2,
  Search,
  Check,
  Layers,
  FileText,
  Bookmark,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { ExamSwitchModal } from '@/components/exam-switch-modal';
import { AddMissingCurriculumModal, AddMissingMode } from '@/components/learning-workspace/add-missing-curriculum-modal';

interface LearningContextBarProps {
  onShowClick?: () => void;
  defaultExpanded?: boolean;
}

export function LearningContextBar({ onShowClick, defaultExpanded = false }: LearningContextBarProps = {}) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    availableSubtopics,
    setSubject,
    setTopic,
    setSubtopic,
    isExamLocked,
  } = useSelection();

  const { orchestrateTopic, isOrchestrating, isLoading, isRefreshing } = useTopicContent();

  const activeExam = selection.exam;
  const activeSubject = selection.subject;
  const activeTopic = selection.topic;
  const activeSubtopic = selection.subtopic;

  // Collapsible Hierarchy State (Collapsed by default)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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

  const isPendingContent = isOrchestrating || isLoading || isRefreshing;

  return (
    <>
      <div className="w-full bg-slate-50/80 dark:bg-[#0B101E]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 transition-colors select-none">
        <div className="max-w-5xl mx-auto space-y-2">
          
          {/* COLLAPSED VIEW (Compact 1-Row Summary) */}
          {!isExpanded ? (
            <div
              onClick={() => setIsExpanded(true)}
              className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#0E1324] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 px-3.5 shadow-2xs hover:border-violet-300 dark:hover:border-violet-800/80 transition-all cursor-pointer group"
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 min-w-0 flex-1">
                {/* Exam Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800/50 font-extrabold text-violet-700 dark:text-violet-300 shrink-0">
                  <span className="text-xs">📖</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    {activeExam?.name || 'Select Exam'}
                  </span>
                  {isExamLocked && (
                    <span className="text-[10px] bg-violet-200/70 dark:bg-violet-900/80 text-violet-800 dark:text-violet-200 px-1 py-0.2 rounded font-bold inline-flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>

                <span className="text-slate-400 font-bold hidden sm:inline">&gt;</span>

                {/* Subject / Topic Path */}
                <div className="flex flex-wrap items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs min-w-0">
                  <span className="inline-flex items-center gap-1 truncate max-w-[110px] sm:max-w-[160px] text-slate-900 dark:text-white font-bold">
                    <span className="text-xs">🥞</span> {activeSubject?.name || 'All Subjects'}
                  </span>
                  {activeTopic && (
                    <>
                      <span className="text-slate-400">&gt;</span>
                      <span className="inline-flex items-center gap-1 truncate max-w-[120px] sm:max-w-[180px] text-slate-700 dark:text-slate-300">
                        <span className="text-xs">📄</span> {activeTopic.name}
                      </span>
                    </>
                  )}
                  {activeSubtopic && (
                    <>
                      <span className="text-slate-400">&gt;</span>
                      <span className="inline-flex items-center gap-1 truncate max-w-[120px] sm:max-w-[200px] text-indigo-600 dark:text-indigo-400 font-bold">
                        <span className="text-xs">🔖</span> {activeSubtopic.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Trigger */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 group-hover:bg-violet-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Change Selection</span>
                  <span className="sm:hidden">Edit</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* EXPANDED VIEW (Stacked Card Hierarchy matching reference layout) */
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-[#0E1324] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3"
            >
              {/* Card 1: Exam Row */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">📖</span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {activeExam?.name || 'Loading Exam...'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsExamSwitchModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-100 dark:bg-violet-950/80 border border-violet-200/60 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-extrabold text-[11px] hover:bg-violet-200/80 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Subject Selector */}
              <div className="relative" ref={subjectRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubjectOpen(!isSubjectOpen);
                    setIsTopicOpen(false);
                    setIsSubtopicOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-blue-200/80 dark:border-blue-900/60 text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-2xs hover:border-blue-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{activeSubject?.name || 'Select Subject'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                </button>

                <AnimatePresence>
                  {isSubjectOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                    >
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search subjects..."
                          value={subjectQuery}
                          onChange={(e) => setSubjectQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
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
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{s.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card 3: Main Topic Selector */}
              <div className="relative" ref={topicRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsTopicOpen(!isTopicOpen);
                    setIsSubjectOpen(false);
                    setIsSubtopicOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-purple-200/80 dark:border-purple-900/60 text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-2xs hover:border-purple-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="truncate">{activeTopic?.name || 'Select Topic'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                </button>

                <AnimatePresence>
                  {isTopicOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                    >
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search topics..."
                          value={topicQuery}
                          onChange={(e) => setTopicQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
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
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{t.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-purple-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card 4: Subtopic Selector */}
              <div className="relative" ref={subtopicRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubtopicOpen(!isSubtopicOpen);
                    setIsSubjectOpen(false);
                    setIsTopicOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-emerald-200/80 dark:border-emerald-900/60 text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-2xs hover:border-emerald-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bookmark className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      {activeSubtopic?.name || (availableSubtopics.length > 0 ? 'Select Subtopic' : 'All Subtopics')}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                </button>

                <AnimatePresence>
                  {isSubtopicOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 text-xs"
                    >
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search subtopics..."
                          value={subtopicQuery}
                          onChange={(e) => setSubtopicQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubtopic(null);
                            setIsSubtopicOpen(false);
                            setSubtopicQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
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
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Action Row: [+] and [✨ SHOW] and [Collapse] */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddMissingMode('topic');
                      setIsAddMissingOpen(true);
                    }}
                    className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center transition-all cursor-pointer"
                    title="Add Missing Subject / Topic"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await orchestrateTopic(false);
                      if (onShowClick) {
                        onShowClick();
                      }
                      setIsExpanded(false);
                    }}
                    disabled={isPendingContent}
                    className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                      isPendingContent
                        ? 'bg-violet-500/20 text-violet-400 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/30 active:scale-95 cursor-pointer'
                    }`}
                  >
                    {isPendingContent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>SHOW</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Done</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Dynamic Breadcrumb Path Line below card */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 pt-0.5">
            <span className="text-slate-700 dark:text-slate-300 font-bold">MCQ Practice</span>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="uppercase text-slate-600 dark:text-slate-300">
              {activeExam?.name || 'EXAM'}
            </span>
            {activeSubject && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">{activeSubject.name}</span>
              </>
            )}
            {activeTopic && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-800 dark:text-slate-100">{activeTopic.name}</span>
              </>
            )}
            {activeSubtopic && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-violet-600 dark:text-violet-400 font-bold">{activeSubtopic.name}</span>
              </>
            )}
          </div>

        </div>
      </div>

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

