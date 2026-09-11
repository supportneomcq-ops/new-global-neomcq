'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Check, Loader2 } from 'lucide-react';

interface SelectionTarget {
  selectedText: string;
  pageNumber: number;
  sectionId: string;
  position: { top: number; left: number };
}

interface A4SelectionToolbarProps {
  target: SelectionTarget | null;
  onClose: () => void;
  onAddHighlight: (color: 'yellow' | 'green' | 'blue' | 'pink') => Promise<void>;
  onAddAnnotation: (noteText: string) => Promise<void>;
}

export function A4SelectionToolbar({
  target,
  onClose,
  onAddHighlight,
  onAddAnnotation,
}: A4SelectionToolbarProps) {
  const [isNoteMode, setIsNoteMode] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!target) return null;

  const handleColorClick = async (color: 'yellow' | 'green' | 'blue' | 'pink') => {
    try {
      setIsSaving(true);
      await onAddHighlight(color);
      onClose();
    } catch (err) {
      console.error('Failed to add highlight:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      setIsSaving(true);
      await onAddAnnotation(noteText.trim());
      setNoteText('');
      setIsNoteMode(false);
      onClose();
    } catch (err) {
      console.error('Failed to add annotation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-2 sm:p-3 transition-all animate-in fade-in zoom-in-95 max-w-[90vw] sm:max-w-md"
      style={{
        top: `${Math.max(16, target.position.top - 64)}px`,
        left: `${Math.min(window.innerWidth - 120, Math.max(120, target.position.left))}px`,
      }}
    >
      {isNoteMode ? (
        <div className="space-y-2.5 p-1 w-64 sm:w-72">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Add Personal Note</span>
            <button
              type="button"
              onClick={() => setIsNoteMode(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your personal note or reminder..."
            className="w-full h-20 bg-slate-800 text-white text-xs rounded-xl p-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNoteMode(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isSaving || !noteText.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Note</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* Highlight Color Pills */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/80">
            <button
              type="button"
              onClick={() => handleColorClick('yellow')}
              disabled={isSaving}
              className="w-6 h-6 rounded-full bg-amber-400 hover:scale-110 transition-transform shadow-xs cursor-pointer border border-amber-300"
              title="Highlight Yellow"
            />
            <button
              type="button"
              onClick={() => handleColorClick('green')}
              disabled={isSaving}
              className="w-6 h-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform shadow-xs cursor-pointer border border-emerald-300"
              title="Highlight Green"
            />
            <button
              type="button"
              onClick={() => handleColorClick('blue')}
              disabled={isSaving}
              className="w-6 h-6 rounded-full bg-sky-400 hover:scale-110 transition-transform shadow-xs cursor-pointer border border-sky-300"
              title="Highlight Blue"
            />
            <button
              type="button"
              onClick={() => handleColorClick('pink')}
              disabled={isSaving}
              className="w-6 h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform shadow-xs cursor-pointer border border-pink-300"
              title="Highlight Pink"
            />
          </div>

          {/* Add Personal Note Button */}
          <button
            type="button"
            onClick={() => setIsNoteMode(true)}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Add Note</span>
          </button>

          {/* Close Selection Toolbar */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
