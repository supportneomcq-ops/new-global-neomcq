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
  ShieldCheck,
} from 'lucide-react';
import { useSelection, SelectedItem } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';

export function LearningContextBar() {
  const {
    selection,
    availableSubjects,
    availableTopics,
    setSubject,
    setTopic,
    refreshHierarchy,
  } = useSelection();

  const { refreshTopicContent } = useTopicContent();

  const activeExam = selection.exam;
  const activeSubject = selection.subject;
  const activeTopic = selection.topic;

  // Dropdown States
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);

  // Search Filter Queries
  const [subjectSearchFilter, setSubjectSearchFilter] = useState('');
  const [topicSearchFilter, setTopicSearchFilter] = useState('');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);

  // Form Inputs
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');

  // Confirmation Step States for Phase 3A Intelligence
  const [subjectPendingResolution, setSubjectPendingResolution] = useState<any | null>(null);
  const [topicPendingResolution, setTopicPendingResolution] = useState<any | null>(null);

  // Status/Error states for modals
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);

  const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicSuccess, setTopicSuccess] = useState<string | null>(null);

  // Refs for closing on click outside
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSubjectDropdownOpen(false);
      }
      if (
        topicDropdownRef.current &&
        !topicDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTopicDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    if (!subjectSearchFilter.trim()) return availableSubjects;
    return availableSubjects.filter((s) =>
      s.name.toLowerCase().includes(subjectSearchFilter.toLowerCase().trim())
    );
  }, [availableSubjects, subjectSearchFilter]);

  // Filtered Topic List
  const filteredTopics = useMemo(() => {
    if (!topicSearchFilter.trim()) return availableTopics;
    return availableTopics.filter((t) =>
      t.name.toLowerCase().includes(topicSearchFilter.toLowerCase().trim())
    );
  }, [availableTopics, topicSearchFilter]);

  const handleSelectSubject = (subj: SelectedItem) => {
    setSubject(subj);
    setIsSubjectDropdownOpen(false);
    setSubjectSearchFilter('');
  };

  const handleSelectTopic = (top: SelectedItem) => {
    setTopic(top);
    setIsTopicDropdownOpen(false);
    setTopicSearchFilter('');
  };

  // Submit new subject (handles Phase 3A resolution & confirmation)
  const handleCreateSubject = async (e?: React.FormEvent, isConfirming = false) => {
    if (e) e.preventDefault();
    if (!newSubjectName.trim() || !activeExam?.id) return;

    setIsSubmittingSubject(true);
    setSubjectError(null);
    setSubjectSuccess(null);

    try {
      const res = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam.id,
          subjectName: newSubjectName.trim(),
          confirmed: isConfirming,
        }),
      });

      const data = await res.json();

      if (data.requiresConfirmation && data.resolution) {
        // Step 1: Request require confirmation
        setSubjectPendingResolution(data.resolution);
        setIsSubmittingSubject(false);
        return;
      }

      if (data.success && data.subject) {
        setSubjectPendingResolution(null);
        const createdSubj = {
          id: data.subject.id,
          name: data.subject.name,
          slug: data.subject.slug,
        };

        if (data.reused) {
          setSubjectSuccess(`Existing canonical subject '${createdSubj.name}' found. Selecting...`);
        } else {
          setSubjectSuccess(`Successfully created '${createdSubj.name}'!`);
        }

        await refreshHierarchy();
        setSubject(createdSubj);

        setTimeout(() => {
          setIsAddSubjectOpen(false);
          setNewSubjectName('');
          setSubjectSuccess(null);
          setSubjectPendingResolution(null);
        }, 1200);
      } else {
        setSubjectError(data.error || 'Failed to resolve subject.');
      }
    } catch (err: any) {
      setSubjectError(err.message || 'Network error resolving subject.');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  // Submit new topic (handles Phase 3A resolution & confirmation)
  const handleCreateTopic = async (e?: React.FormEvent, isConfirming = false) => {
    if (e) e.preventDefault();
    if (!newTopicName.trim() || !activeSubject?.id) return;

    setIsSubmittingTopic(true);
    setTopicError(null);
    setTopicSuccess(null);

    try {
      const res = await fetch('/api/topics/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: activeSubject.id,
          topicName: newTopicName.trim(),
          confirmed: isConfirming,
        }),
      });

      const data = await res.json();

      if (data.requiresConfirmation && data.resolution) {
        setTopicPendingResolution(data.resolution);
        setIsSubmittingTopic(false);
        return;
      }

      if (data.success && data.topic) {
        setTopicPendingResolution(null);
        const createdTopic = {
          id: data.topic.id,
          name: data.topic.name,
          slug: data.topic.slug,
        };

        if (data.reused) {
          setTopicSuccess(`Existing canonical topic '${createdTopic.name}' found. Selecting...`);
        } else {
          setTopicSuccess(`Successfully added '${createdTopic.name}'!`);
        }

        await refreshHierarchy();
        setTopic(createdTopic);

        setTimeout(() => {
          setIsAddTopicOpen(false);
          setNewTopicName('');
          setTopicSuccess(null);
          setTopicPendingResolution(null);
        }, 1200);
      } else {
        setTopicError(data.error || 'Failed to resolve topic.');
      }
    } catch (err: any) {
      setTopicError(err.message || 'Network error resolving topic.');
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  return (
    <>
      {/* Learning Context Bar Container */}
      <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs select-none">
        
        {/* Left: Interactive drop-down selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
          
          {/* Locked Exam Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-slate-400 dark:text-slate-500 mr-1 font-semibold">Exam:</span>
            <span className="truncate max-w-[120px] sm:max-w-[200px] text-slate-800 dark:text-slate-100 font-bold">{activeExam?.name || 'Loading...'}</span>
          </div>

          {/* Subject Custom Dropdown */}
          <div className="relative" ref={subjectDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsSubjectDropdownOpen(!isSubjectDropdownOpen);
                setIsTopicDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition-colors cursor-pointer min-w-[160px] text-left"
            >
              <div className="truncate flex-1">
                <span className="text-slate-400 dark:text-slate-500 mr-1 font-semibold">Subject:</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold">{activeSubject?.name || 'Select Subject'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu List with Search */}
            <AnimatePresence>
              {isSubjectDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
                >
                  {/* Search Input */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={subjectSearchFilter}
                        onChange={(e) => setSubjectSearchFilter(e.target.value)}
                        placeholder="Search subjects..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Subjects in {activeExam?.name || 'Exam'}</span>
                    <span className="text-[10px] text-slate-400">{filteredSubjects.length} available</span>
                  </div>

                  {/* List items */}
                  <div className="p-1 space-y-0.5 overflow-y-auto max-h-56 flex-1">
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map((subj) => {
                        const isSelected = activeSubject?.id === subj.id;
                        return (
                          <button
                            key={subj.id}
                            type="button"
                            onClick={() => handleSelectSubject(subj)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer font-semibold flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                            }`}
                          >
                            <span className="truncate mr-2">{subj.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No subjects match "{subjectSearchFilter}"
                      </div>
                    )}
                  </div>

                  {/* Bottom Action */}
                  <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubjectDropdownOpen(false);
                        setIsAddSubjectOpen(true);
                        setSubjectPendingResolution(null);
                        setSubjectError(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer text-left"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>+ Add New Subject</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Topic Custom Dropdown */}
          <div className="relative" ref={topicDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsTopicDropdownOpen(!isTopicDropdownOpen);
                setIsSubjectDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition-colors cursor-pointer min-w-[160px] text-left"
            >
              <div className="truncate flex-1">
                <span className="text-slate-400 dark:text-slate-500 mr-1 font-semibold">Topic:</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold">{activeTopic?.name || 'Select Topic'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTopicDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu List with Search */}
            <AnimatePresence>
              {isTopicDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
                >
                  {/* Search Input */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={topicSearchFilter}
                        onChange={(e) => setTopicSearchFilter(e.target.value)}
                        placeholder={`Search topics in ${activeSubject?.name || 'subject'}...`}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Topics in {activeSubject?.name || 'Subject'}</span>
                    <span className="text-[10px] text-slate-400">{filteredTopics.length} available</span>
                  </div>

                  {/* List items */}
                  <div className="p-1 space-y-0.5 overflow-y-auto max-h-56 flex-1">
                    {filteredTopics.length > 0 ? (
                      filteredTopics.map((top) => {
                        const isSelected = activeTopic?.id === top.id;
                        return (
                          <button
                            key={top.id}
                            type="button"
                            onClick={() => handleSelectTopic(top)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer font-semibold flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                            }`}
                          >
                            <span className="truncate mr-2">{top.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No topics match "{topicSearchFilter}"
                      </div>
                    )}
                  </div>

                  {/* Bottom Action */}
                  <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsTopicDropdownOpen(false);
                        setIsAddTopicOpen(true);
                        setTopicPendingResolution(null);
                        setTopicError(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer text-left"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>+ Add New Topic</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Right: Quick sync indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshTopicContent(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 transition-all font-bold text-[11px] flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh current topic assets"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Re-Generate Topic AI</span>
          </button>
        </div>

      </div>

      {/* ============================================== */}
      {/* ADD SUBJECT MODAL WITH PHASE 3A CONFIRMATION */}
      {/* ============================================== */}
      <AnimatePresence>
        {isAddSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {subjectPendingResolution ? 'Confirm New Subject' : 'Add New Subject'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubjectOpen(false);
                    setSubjectPendingResolution(null);
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!subjectPendingResolution ? (
                /* Step 1: Input Form */
                <form onSubmit={(e) => handleCreateSubject(e, false)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Which subject do you want to study under <span className="text-indigo-600 dark:text-indigo-400 font-black">{activeExam?.name}</span>?
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmittingSubject}
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Cardiology, Constitutional Law, Fluid Mechanics"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Our server-side Exam Intelligence Engine validates and normalizes curriculum entities.
                    </p>
                  </div>

                  {/* Submitting Status */}
                  {isSubmittingSubject && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Resolving curriculum intelligence...</span>
                    </div>
                  )}

                  {/* Errors */}
                  {subjectError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2 leading-normal">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{subjectError}</span>
                    </div>
                  )}

                  {/* Success messages */}
                  {subjectSuccess && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-start gap-2 leading-normal">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{subjectSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingSubject}
                      onClick={() => setIsAddSubjectOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSubject || !newSubjectName.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <span>Add Subject</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Phase 3A Intelligence Confirmation Screen */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> New Subject Verified
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                        {subjectPendingResolution.decision}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Subject: <span className="text-indigo-600 dark:text-indigo-400 font-black">"{newSubjectName}"</span>
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {subjectPendingResolution.reason || `Validated as a new curricular subject under ${activeExam?.name}.`}
                    </p>
                  </div>

                  {subjectError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{subjectError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingSubject}
                      onClick={() => setSubjectPendingResolution(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingSubject}
                      onClick={() => handleCreateSubject(undefined, true)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {isSubmittingSubject ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Subject...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm &amp; Add Subject</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* ADD TOPIC MODAL WITH PHASE 3A CONFIRMATION */}
      {/* ============================================== */}
      <AnimatePresence>
        {isAddTopicOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4"
            >
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-heading">
                    {topicPendingResolution ? 'Confirm New Topic' : 'Add New Topic'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTopicOpen(false);
                    setTopicPendingResolution(null);
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!topicPendingResolution ? (
                /* Step 1: Input Form */
                <form onSubmit={(e) => handleCreateTopic(e, false)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Add a topic under <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">"{activeSubject?.name}"</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSubmittingTopic}
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="e.g. Aortic Stenosis, First Amendment, Thermodynamics"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Our server-side Exam Intelligence Engine validates and normalizes curriculum entities.
                    </p>
                  </div>

                  {/* Submitting Status */}
                  {isSubmittingTopic && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Resolving curriculum intelligence...</span>
                    </div>
                  )}

                  {/* Errors */}
                  {topicError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2 leading-normal">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{topicError}</span>
                    </div>
                  )}

                  {/* Success messages */}
                  {topicSuccess && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-start gap-2 leading-normal">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{topicSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingTopic}
                      onClick={() => setIsAddTopicOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTopic || !newTopicName.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <span>Add Topic</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Phase 3A Intelligence Confirmation Screen */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> New Topic Verified
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                        {topicPendingResolution.decision}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Topic: <span className="text-indigo-600 dark:text-indigo-400 font-black">"{newTopicName}"</span>
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {topicPendingResolution.reason || `Validated as a new topic under ${activeSubject?.name}.`}
                    </p>
                  </div>

                  {topicError && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{topicError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSubmittingTopic}
                      onClick={() => setTopicPendingResolution(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingTopic}
                      onClick={() => handleCreateTopic(undefined, true)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {isSubmittingTopic ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating Topic...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm &amp; Add Topic</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
