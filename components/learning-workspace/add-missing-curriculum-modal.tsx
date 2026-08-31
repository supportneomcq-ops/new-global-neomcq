'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Plus,
  Layers,
  FileText,
  Bookmark,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useSelection, SelectedItem } from '@/lib/context/selection-context';

export type AddMissingMode = 'subject' | 'topic' | 'subtopic';

interface AddMissingCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AddMissingMode;
}

export function AddMissingCurriculumModal({
  isOpen,
  onClose,
  initialMode = 'topic',
}: AddMissingCurriculumModalProps) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    addSubject,
    addTopic,
    addSubtopic,
  } = useSelection();

  const [mode, setMode] = useState<AddMissingMode>(initialMode);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(selection.subject?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(selection.topic?.id || '');
  const [inputName, setInputName] = useState<string>('');
  const [inputDescription, setInputDescription] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);

  // Sync mode and selections when opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedSubjectId(selection.subject?.id || (availableSubjects[0]?.id || ''));
      setSelectedTopicId(selection.topic?.id || (availableTopics[0]?.id || ''));
      setInputName('');
      setInputDescription('');
      setStatusMessage(null);
    }
  }, [isOpen, initialMode, selection.subject?.id, selection.topic?.id, availableSubjects, availableTopics]);

  // Update selected topic if selected subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      // Find matching topics
      const subTopics = availableTopics.filter((t: any) => !t.subject_id || t.subject_id === selectedSubjectId);
      if (subTopics.length > 0 && !subTopics.some((t) => t.id === selectedTopicId)) {
        setSelectedTopicId(subTopics[0].id);
      }
    }
  }, [selectedSubjectId, availableTopics, selectedTopicId]);

  if (!isOpen) return null;

  const activeExamName = selection.exam?.name || 'Target Examination';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (mode === 'subject') {
        const created = await addSubject(inputName.trim(), inputDescription.trim() || undefined);
        setStatusMessage({
          type: 'success',
          text: `Subject "${created.name}" validated and added to ${activeExamName}.`,
          details: 'Canonical record saved. Updated dashboard selection instantly.',
        });
      } else if (mode === 'topic') {
        if (!selectedSubjectId) {
          throw new Error('Please select a parent subject.');
        }
        const created = await addTopic(inputName.trim(), selectedSubjectId, inputDescription.trim() || undefined);
        setStatusMessage({
          type: 'success',
          text: `Topic "${created.name}" validated and added under selected subject.`,
          details: 'Canonical hierarchy verified and persisted. Dashboard updated.',
        });
      } else if (mode === 'subtopic') {
        if (!selectedTopicId) {
          throw new Error('Please select a parent topic.');
        }
        const created = await addSubtopic(inputName.trim(), selectedTopicId, inputDescription.trim() || undefined);
        setStatusMessage({
          type: 'success',
          text: `Subtopic "${created.name}" validated and added under selected topic.`,
          details: 'Canonical granularity registered. Dashboard updated.',
        });
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Validation failed. Please check syllabus requirements.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-900 dark:text-white relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                  Add Missing Curriculum
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Exam locked: <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeExamName}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Operation Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('subject');
                setStatusMessage(null);
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'subject'
                  ? 'bg-white dark:bg-[#1A2238] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>A. Subject</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('topic');
                setStatusMessage(null);
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'topic'
                  ? 'bg-white dark:bg-[#1A2238] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>B. Topic</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('subtopic');
                setStatusMessage(null);
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'subtopic'
                  ? 'bg-white dark:bg-[#1A2238] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>C. Subtopic</span>
            </button>
          </div>

          {/* Status Banners */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-2xl mb-4 text-xs font-semibold flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p>{statusMessage.text}</p>
                {statusMessage.details && (
                  <p className="text-[11px] opacity-80 mt-0.5">{statusMessage.details}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Exam (Strictly Locked) */}
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Target Exam (Locked)
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between font-medium">
                <span className="truncate">{activeExamName}</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </div>
            </div>

            {/* 2. Parent Selectors depending on Mode */}
            {mode === 'topic' && (
              <div>
                <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Parent Subject
                </label>
                <div className="relative">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {mode === 'subtopic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium appearance-none focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Parent Topic
                  </label>
                  <div className="relative">
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium appearance-none focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      {availableTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Name Input */}
            <div>
              <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {mode === 'subject'
                  ? 'Subject Name'
                  : mode === 'topic'
                  ? 'Topic Name'
                  : 'Subtopic Name'}
              </label>
              <input
                type="text"
                required
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder={
                  mode === 'subject'
                    ? 'e.g., Forensic Medicine, Medical Microbiology, Pharmacology'
                    : mode === 'topic'
                    ? 'e.g., Infective Endocarditis, Nephrotic Syndrome, Glaucoma'
                    : 'e.g., Duke Criteria & Diagnostic Algorithm, Drug-Induced Agranulocytosis'
                }
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 text-xs"
              />
            </div>

            {/* AI Policy Notice */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                AI Accreditation engine checks clinical syllabus relevance, aliases, and duplicate equivalence. Only genuine curriculum nodes are created; existing canonical nodes are reused seamlessly.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !inputName.trim()}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Checking & Adding...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AI CHECK & ADD</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
