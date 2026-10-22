'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Plus,
  Sparkles,
  Maximize2,
  Copy,
  Check,
  AlertTriangle,
  Bookmark,
  Stethoscope,
  Pill,
  Activity,
  Search,
  Syringe,
  Calculator,
  User,
  X,
  Loader2,
  RotateCw,
  Tag,
  BookOpen,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';
import { getSupabaseClient } from '@/lib/supabase';

export interface StickyNote {
  id: string;
  user_id: string;
  exam_id?: string | null;
  subject_id?: string | null;
  topic_id: string;
  subtopic_id?: string | null;
  title?: string | null;
  text: string;
  category: string;
  color: string;
  pinned: boolean;
  size: 'sm' | 'md' | 'lg';
  rotation_deg: number;
  is_ai_generated: boolean;
  created_at: string;
  updated_at?: string;
}

const NOTE_COLORS = [
  { id: 'yellow', name: 'Yellow', bgLight: 'bg-[#FEF08A]', textLight: 'text-[#422006]', borderLight: 'border-[#FDE047]', bgDark: 'dark:bg-[#3D300F]', textDark: 'dark:text-[#FEF08A]', borderDark: 'dark:border-[#854D0E]' },
  { id: 'amber', name: 'Peach', bgLight: 'bg-[#FFEDD5]', textLight: 'text-[#431407]', borderLight: 'border-[#FDBA74]', bgDark: 'dark:bg-[#3E1B10]', textDark: 'dark:text-[#FFEDD5]', borderDark: 'dark:border-[#9A3412]' },
  { id: 'pink', name: 'Blush', bgLight: 'bg-[#FBCFE8]', textLight: 'text-[#500724]', borderLight: 'border-[#F472B6]', bgDark: 'dark:bg-[#421326]', textDark: 'dark:text-[#FBCFE8]', borderDark: 'dark:border-[#9D174D]' },
  { id: 'violet', name: 'Lavender', bgLight: 'bg-[#DDD6FE]', textLight: 'text-[#2E1065]', borderLight: 'border-[#A78BFA]', bgDark: 'dark:bg-[#281745]', textDark: 'dark:text-[#DDD6FE]', borderDark: 'dark:border-[#6D28D9]' },
  { id: 'green', name: 'Mint', bgLight: 'bg-[#D1FAE5]', textLight: 'text-[#064E3B]', borderLight: 'border-[#6EE7B7]', bgDark: 'dark:bg-[#103726]', textDark: 'dark:text-[#D1FAE5]', borderDark: 'dark:border-[#047857]' },
  { id: 'blue', name: 'Sky', bgLight: 'bg-[#E0F2FE]', textLight: 'text-[#0C4A6E]', borderLight: 'border-[#7DD3FC]', bgDark: 'dark:bg-[#103043]', textDark: 'dark:text-[#E0F2FE]', borderDark: 'dark:border-[#0369A1]' },
  { id: 'orange', name: 'Tangerine', bgLight: 'bg-[#FFE4E6]', textLight: 'text-[#4C0519]', borderLight: 'border-[#FDA4AF]', bgDark: 'dark:bg-[#43121E]', textDark: 'dark:text-[#FFE4E6]', borderDark: 'dark:border-[#E11D48]' },
];

const CATEGORIES = [
  { id: 'high_yield', name: 'High-Yield Pearl', icon: Sparkles, color: 'text-amber-600 dark:text-amber-400' },
  { id: 'board_trap', name: 'Exam Trap', icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400' },
  { id: 'formula', name: 'Formula & Rule', icon: Calculator, color: 'text-orange-600 dark:text-orange-400' },
  { id: 'remember', name: 'Mnemonic / Rule of Thumb', icon: Bookmark, color: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'application', name: 'Core Application & Case', icon: Activity, color: 'text-blue-600 dark:text-blue-400' },
  { id: 'clinical', name: 'Clinical / Practical Pearl', icon: Stethoscope, color: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'definition', name: 'Key Definition', icon: Search, color: 'text-purple-600 dark:text-purple-400' },
  { id: 'treatment', name: 'Methodology / Protocol', icon: Check, color: 'text-teal-600 dark:text-teal-400' },
  { id: 'pharmacology', name: 'Component / Drug', icon: Pill, color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'personal', name: 'Personal Note', icon: User, color: 'text-slate-600 dark:text-slate-400' },
];

function getCategoryConfig(catId: string) {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
}

function getColorConfig(colorId: string) {
  return NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0];
}

export function StickyBoardWorkspaceView({ user }: { user?: any }) {
  const { selection } = useSelection();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Composer State
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('high_yield');
  const [color, setColor] = useState('yellow');
  const [isPinned, setIsPinned] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState('high_yield');
  const [editColor, setEditColor] = useState('yellow');
  const [editPinned, setEditPinned] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Expanded View Modal State
  const [expandedNote, setExpandedNote] = useState<StickyNote | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // 1. Fetch sticky notes for currently selected hierarchy
  const fetchNotes = useCallback(async () => {
    if (!selection.topic?.id) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userIdParam = authUser?.id || user?.id || '';

      const params = new URLSearchParams();
      params.append('topicId', selection.topic.id);
      if (selection.subtopic?.id) params.append('subtopicId', selection.subtopic.id);
      if (selection.exam?.id) params.append('examId', selection.exam.id);
      if (selection.subject?.id) params.append('subjectId', selection.subject.id);
      if (userIdParam) params.append('userId', userIdParam);

      const res = await fetch(`/api/user/sticky-notes?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sticky notes');
      }

      setNotes(data.stickyNotes || []);
    } catch (err: any) {
      console.error('Error loading sticky notes:', err);
      setIsError(true);
      setErrorMessage(err.message || 'Could not load your study board notes.');
    } finally {
      setIsLoading(false);
    }
  }, [selection.topic?.id, selection.subtopic?.id, selection.exam?.id, selection.subject?.id, user?.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Realtime database listener for live board updates
  useEffect(() => {
    if (!selection.topic?.id) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`sticky_notes_${selection.topic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sticky_notes',
          filter: `topic_id=eq.${selection.topic.id}`,
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selection.topic?.id, fetchNotes]);

  // 2. Add Personal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selection.topic?.id) return;

    setIsAdding(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id || user?.id;

      const rotations = [-2.2, 1.6, -1.4, 2.5, -3.1, 1.8];
      const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];

      const res = await fetch('/api/user/sticky-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examId: selection.exam?.id,
          subjectId: selection.subject?.id,
          topicId: selection.topic.id,
          subtopicId: selection.subtopic?.id,
          title: title.trim(),
          text: text.trim(),
          category,
          color,
          pinned: isPinned,
          rotationDeg: randomRotation,
          isAiGenerated: false,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save note.');
      }

      // Prepend to notes
      setNotes((prev) => [data.stickyNote, ...prev]);
      setTitle('');
      setText('');
      setIsPinned(false);
    } catch (err: any) {
      alert(`Error creating note: ${err.message || 'Please try again.'}`);
    } finally {
      setIsAdding(false);
    }
  };

  // 3. Toggle Pin
  const handleTogglePin = async (note: StickyNote) => {
    const newPinned = !note.pinned;
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: newPinned } : n))
    );

    try {
      const res = await fetch('/api/user/sticky-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          pinned: newPinned,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n))
        );
      }
    } catch (err) {
      console.error('Failed to update pin state:', err);
    }
  };

  // 4. Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sticky note?')) return;

    // Optimistic remove
    const prevNotes = [...notes];
    setNotes((prev) => prev.filter((n) => n.id !== id));

    try {
      const res = await fetch(`/api/user/sticky-notes?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        setNotes(prevNotes);
        alert('Failed to delete note. Please try again.');
      }
    } catch (err) {
      setNotes(prevNotes);
      alert('Failed to delete note. Please check your network connection.');
    }
  };

  // 5. AI Sticky Note Generation with step progress
  const handleGenerateAINotes = async () => {
    if (!selection.topic?.id) return;

    setIsGenerating(true);
    setGenStep(1);

    const stepTimer1 = setTimeout(() => setGenStep(2), 1200);
    const stepTimer2 = setTimeout(() => setGenStep(3), 2500);
    const stepTimer3 = setTimeout(() => setGenStep(4), 4000);

    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id || user?.id;

      const res = await fetch('/api/user/sticky-notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam: selection.exam,
          subject: selection.subject,
          topic: selection.topic,
          subtopic: selection.subtopic,
          userId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI sticky notes');
      }

      await fetchNotes();
    } catch (err: any) {
      alert(`AI Generation Error: ${err.message || 'Please try again later.'}`);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsGenerating(false);
      setGenStep(0);
    }
  };

  // Auto-generate high-yield sticky board just-in-time if none exists for this topic
  const autoGeneratedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    const scopeKey = `${selection.topic?.id || ''}_${selection.subtopic?.id || 'main'}`;
    if (
      !isLoading &&
      notes.length === 0 &&
      !isGenerating &&
      !isError &&
      selection.topic?.id &&
      autoGeneratedTopicRef.current !== scopeKey
    ) {
      autoGeneratedTopicRef.current = scopeKey;
      handleGenerateAINotes();
    }
  }, [isLoading, notes.length, isGenerating, isError, selection.topic?.id, selection.subtopic?.id]);

  // 6. Open Edit Modal
  const handleOpenEdit = (note: StickyNote) => {
    setEditingNote(note);
    setEditTitle(note.title || '');
    setEditText(note.text || '');
    setEditCategory(note.category || 'high_yield');
    setEditColor(note.color || 'yellow');
    setEditPinned(note.pinned || false);
  };

  // Save Note Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editText.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/user/sticky-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          title: editTitle.trim(),
          text: editText.trim(),
          category: editCategory,
          color: editColor,
          pinned: editPinned,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote.id ? data.stickyNote : n))
      );
      setEditingNote(null);
    } catch (err: any) {
      alert(`Save Error: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Copy expanded note text
  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Sort notes: pinned first, then created_at desc
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notes]);

  return (
    <div className="w-full space-y-6 pb-28">
      {/* 1. STICKY NOTES HEADER & BREADCRUMB BADGES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selection.exam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                <BookOpen className="w-3 h-3" /> {selection.exam.name}
              </span>
            )}
            {selection.subject && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Layers className="w-3 h-3" /> {selection.subject.name}
                </span>
              </>
            )}
            {selection.topic && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                  <Tag className="w-3 h-3" /> {selection.topic.name}
                </span>
              </>
            )}
            {selection.subtopic && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                  {selection.subtopic.name}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            📌 Sticky Study Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Your personal visual memory wall for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selection.topic?.name || 'the active topic'}</span>. Pin high-yield pearls, diagnostic traps, and mnemonics.
          </p>
        </div>

        {/* AI Generator Button */}
        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateAINotes}
            disabled={isGenerating || !selection.topic?.id}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>AI Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>✨ Generate High-Yield AI Notes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI GENERATION PROGRESS OVERLAY BAR */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-500/40 text-white shadow-xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/50 animate-pulse">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  AI Board Architect Active
                </p>
                <p className="text-sm font-semibold text-white">
                  {genStep === 1 && '1/4 Analyzing exam blueprint context...'}
                  {genStep === 2 && '2/4 Selecting high-yield concepts & formulas...'}
                  {genStep === 3 && '3/4 Creating board traps & memory pearls...'}
                  {genStep === 4 && '4/4 Organizing study board notes...'}
                </p>
              </div>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-amber-300 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. COMPOSER FOR PERSONAL STICKY NOTES */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Add Sticky Note for This Topic
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPinned
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
              <span>{isPinned ? 'Pinned to Top' : 'Pin Note'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleAddNote} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional, e.g. Diagnostic Triad)"
              className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            required
            placeholder="Type your personal mnemonic, high-yield pearl, or study reminder..."
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-medium"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Color Palette Picker */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Note Color:
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => setColor(c.id)}
                    className={`w-6 h-6 rounded-lg cursor-pointer transition-transform ${c.bgLight} border border-black/10 ${
                      color === c.id ? 'ring-2 ring-indigo-600 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isAdding || !text.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Post Sticky Note</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. VISUAL STUDY STICKY BOARD CANVAS */}
      <div className="p-4 sm:p-8 rounded-3xl bg-study-board-light dark:bg-study-board-dark border border-slate-300 dark:border-slate-800 shadow-inner min-h-[500px] relative transition-all">

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-48 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse border border-slate-300 dark:border-slate-700 p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 w-1/3 bg-slate-300 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-full bg-slate-300 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-4/5 bg-slate-300 dark:bg-slate-700 rounded-md" />
                </div>
                <div className="h-3 w-1/4 bg-slate-300 dark:bg-slate-700 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && isError && (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load sticky notes</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">{errorMessage}</p>
            <button
              type="button"
              onClick={fetchNotes}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 mx-auto cursor-pointer"
            >
              <RotateCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !isError && sortedNotes.length === 0 && (
          <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-sm border border-amber-300 dark:border-amber-800">
              <Pin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Your study board is empty</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Create your first high-yield reminder for{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {selection.topic?.name || 'this topic'}
              </span>
              , or click below to let AI generate exam pearls for you!
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  if (textarea) textarea.focus();
                }}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                + Add Sticky Note
              </button>
              <button
                type="button"
                onClick={handleGenerateAINotes}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Generate High-Yield Notes with AI</span>
              </button>
            </div>
          </div>
        )}

        {/* ORGANIC STICKY BOARD GRID */}
        {!isLoading && !isError && sortedNotes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {sortedNotes.map((note) => {
              const catCfg = getCategoryConfig(note.category);
              const colorCfg = getColorConfig(note.color);
              const CategoryIcon = catCfg.icon;

              // Content-aware height determination
              const textLength = note.text.length;
              let heightClass = 'min-h-[170px]';
              if (textLength > 180) heightClass = 'min-h-[240px]';
              if (textLength > 300) heightClass = 'min-h-[300px]';

              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, rotate: note.rotation_deg || 0 }}
                  animate={{ opacity: 1, scale: 1, rotate: note.rotation_deg || 0 }}
                  whileHover={{
                    scale: 1.02,
                    rotate: 0,
                    y: -6,
                    transition: { duration: 0.2 },
                  }}
                  style={{ transformOrigin: 'center center' }}
                  className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between transition-all relative group ${colorCfg.bgLight} ${colorCfg.textLight} ${colorCfg.borderLight} ${colorCfg.bgDark} ${colorCfg.textDark} ${colorCfg.borderDark} ${heightClass}`}
                >
                  {/* Pinned Pushpin Visual Accent */}
                  {note.pinned && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 p-1.5 rounded-full bg-amber-500 text-white shadow-md border-2 border-white dark:border-slate-900">
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}

                  {/* Top Note Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider opacity-90">
                        <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{catCfg.name}</span>
                      </span>

                      {/* Action icons */}
                      <div className="flex items-center gap-1 opacity-90">
                        {note.is_ai_generated && (
                          <span
                            title="Generated by AI Studio"
                            className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[9px] font-extrabold uppercase tracking-wide mr-1"
                          >
                            AI
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note)}
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title={note.pinned ? 'Unpin Note' : 'Pin Note'}
                        >
                          {note.pinned ? (
                            <Pin className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <PinOff className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(note)}
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title="Edit Note"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedNote(note)}
                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title="Expand Note"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Title if present */}
                    {note.title && (
                      <h4 className="text-sm font-bold tracking-tight line-clamp-2">
                        {note.title}
                      </h4>
                    )}

                    {/* Note Content Text - Handwritten Aesthetic */}
                    <div className="font-patrick text-base sm:text-lg leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[220px] pr-1">
                      {note.text}
                    </div>
                  </div>

                  {/* Note Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/10 dark:border-white/10 text-[10px] font-medium opacity-80">
                    <span>
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-rose-700 dark:text-rose-400 hover:opacity-100 opacity-60 transition-opacity cursor-pointer font-bold flex items-center gap-1"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. EDIT NOTE MODAL */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Edit Sticky Note
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Color Palette
                    </label>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setEditColor(c.id)}
                          className={`w-5 h-5 rounded-md cursor-pointer ${c.bgLight} border border-black/10 ${
                            editColor === c.id ? 'ring-2 ring-indigo-600 scale-110' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Content Text
                  </label>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={5}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPinned}
                      onChange={(e) => setEditPinned(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Pin to top of board</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNote(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit || !editText.trim()}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. EXPANDED READABLE NOTE MODAL */}
      <AnimatePresence>
        {expandedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 space-y-6 ${
                getColorConfig(expandedNote.color).bgLight
              } ${getColorConfig(expandedNote.color).textLight} ${
                getColorConfig(expandedNote.color).borderLight
              } ${getColorConfig(expandedNote.color).bgDark} ${
                getColorConfig(expandedNote.color).textDark
              } ${getColorConfig(expandedNote.color).borderDark}`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg bg-black/10 dark:bg-white/10">
                    {getCategoryConfig(expandedNote.category).name}
                  </span>
                  {expandedNote.pinned && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-1">
                      <Pin className="w-3 h-3 fill-current" /> Pinned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(expandedNote.text)}
                    className="px-3 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedNote(null)}
                    className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {expandedNote.title && (
                <h2 className="text-xl font-extrabold tracking-tight">
                  {expandedNote.title}
                </h2>
              )}

              <div className="font-patrick text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto pr-2">
                {expandedNote.text}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/10 dark:border-white/10 text-xs opacity-80 font-medium">
                <span>
                  Created:{' '}
                  {new Date(expandedNote.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const n = expandedNote;
                      setExpandedNote(null);
                      handleOpenEdit(n);
                    }}
                    className="font-bold underline cursor-pointer"
                  >
                    Edit Note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = expandedNote.id;
                      setExpandedNote(null);
                      handleDeleteNote(id);
                    }}
                    className="text-rose-700 dark:text-rose-400 font-bold underline cursor-pointer"
                  >
                    Delete Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
