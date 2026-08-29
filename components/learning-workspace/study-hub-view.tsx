'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Printer,
  Bookmark,
  BookmarkCheck,
  RotateCw,
  CheckCircle2,
  XCircle,
  Shuffle,
  Pin,
  PinOff,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  List,
} from 'lucide-react';
import { StudySubTab, FlashcardItem, StickyNoteItem } from './types';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { OnboardingData } from '@/components/onboarding-flow';

interface StudyHubViewProps {
  user?: OnboardingData;
  initialSubTab?: StudySubTab;
}

const DEFAULT_FLASHCARDS: FlashcardItem[] = [
  {
    id: 'fc1',
    front: 'What is the most common electrocardiographic finding in acute pulmonary embolism?',
    back: 'Sinus tachycardia (most common overall). The classic S1Q3T3 pattern (prominent S wave in lead I, Q wave in lead III, inverted T wave in lead III) is specific but only present in <20% of patients.',
    category: 'Cardiopulmonary',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc2',
    front: 'Which cardiac enzyme rises first in acute myocardial infarction, and which remains elevated longest?',
    back: 'Myoglobin / Troponin I rises first (2-4 hours). Troponin I remains elevated longest (7-10 days). CK-MB returns to baseline in 48-72 hours, making it ideal to diagnose reinfarction.',
    category: 'Pathology',
    difficulty: 'Board Classic',
    status: 'unseen',
  },
  {
    id: 'fc3',
    front: 'What is Beck’s Triad, and what condition does it indicate?',
    back: '1. Hypotension\n2. Distended neck veins (elevated JVP)\n3. Muffled heart sounds\n\nIndicates Cardiac Tamponade. Pulsus paradoxus (>10 mmHg drop in SBP during inspiration) is also hallmark.',
    category: 'Clinical Triads',
    difficulty: 'High Yield',
    status: 'unseen',
  },
  {
    id: 'fc4',
    front: 'What is the first-line medication for rate control in atrial fibrillation with rapid ventricular response in patients with preserved ejection fraction?',
    back: 'Non-dihydropyridine Calcium Channel Blockers (Diltiazem, Verapamil) or Beta-blockers (Metoprolol). Note: Avoid in pre-excited AF (Wolff-Parkinson-White).',
    category: 'Pharmacology',
    difficulty: 'Core High Yield',
    status: 'unseen',
  },
];

const DEFAULT_STICKY_NOTES: StickyNoteItem[] = [
  {
    id: 'sn1',
    text: '💡 High Yield Rule: Inferior STEMI (II, III, aVF) -> RCA. Check V4R before nitrates!',
    color: 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100',
    pinned: true,
  },
  {
    id: 'sn2',
    text: '⚡ Cardiac Enzymes: CK-MB for re-infarction (48-72h normalizes), Troponin stays for 10 days.',
    color: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100',
    pinned: true,
  },
  {
    id: 'sn3',
    text: '🎯 Beck Triad: Hypotension + JVD + Muffled heart sounds -> Tamponade.',
    color: 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100',
    pinned: false,
  },
];

const DEFAULT_REVISION_ITEMS = [
  {
    id: 'rev1',
    title: 'Acute Coronary Syndromes Triad',
    concept: 'STEMI requires immediate PCI within 90 minutes of door-to-balloon time. Thrombolysis is indicated if PCI is unavailable within 120 minutes.',
    blanks: ['90 minutes', 'Thrombolysis', '120 minutes'],
    pearl: 'Antiplatelet dual therapy (Aspirin + P2Y12 inhibitor) + Heparin is standard of care.',
  },
  {
    id: 'rev2',
    title: 'Heart Failure Diagnostic Biomarkers',
    concept: 'Elevated BNP and NT-proBNP reflect ventricular wall stress and distinguish cardiac dyspnea from pulmonary causes.',
    blanks: ['BNP', 'NT-proBNP', 'ventricular wall stress'],
    pearl: 'Neprilysin inhibitors (Sacubitril) increase BNP; use NT-proBNP for monitoring when patient is on ARNI.',
  },
  {
    id: 'rev3',
    title: 'Infective Endocarditis Duke Criteria',
    concept: 'Major criteria include bacteremia with typical organisms in 2 separate blood cultures and echocardiographic evidence of endocardial involvement (vegetation/abscess).',
    blanks: ['bacteremia', 'blood cultures', 'echocardiographic evidence', 'vegetation'],
    pearl: 'Staph aureus is most common acute cause; Strep viridans is most common subacute cause on damaged native valves.',
  },
];

export function StudyHubView({ user, initialSubTab = 'notes' }: StudyHubViewProps) {
  const { selection } = useSelection();
  const { content } = useTopicContent();

  // Sub-tab: 'notes' | 'flashcards' | 'sticky' | 'revision'
  const [activeSubTab, setActiveSubTab] = useState<StudySubTab>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // A4 Notes State
  const [notesSearch, setNotesSearch] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(DEFAULT_FLASHCARDS);
  const [fcIndex, setFcIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fcFilter, setFcFilter] = useState<'all' | 'revision' | 'mastered'>('all');

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>(DEFAULT_STICKY_NOTES);
  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState('amber');

  // Revision Sheets State (Active recall fill-in-the-blanks)
  const [activeRecallMode, setActiveRecallMode] = useState(true);
  const [revealedBlanks, setRevealedBlanks] = useState<Record<string, boolean>>({});

  // Synchronize when topic content changes
  React.useEffect(() => {
    if (content?.flashcards && content.flashcards.length > 0) {
      setFlashcards(
        content.flashcards.map((f, idx) => ({
          id: f.id || `fc_${idx}`,
          front: f.front,
          back: f.back,
          category: f.category || selection.subject?.name || 'Cardiology',
          difficulty: f.difficulty || 'High Yield',
          status: 'unseen',
        }))
      );
      setFcIndex(0);
      setIsFlipped(false);
    }

    if (content?.sticky_notes && content.sticky_notes.length > 0) {
      setStickyNotes(
        content.sticky_notes.map((s, idx) => {
          let colorStyle = 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100';
          if (s.color === 'emerald') {
            colorStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
          } else if (s.color === 'indigo') {
            colorStyle = 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100';
          } else if (s.color === 'rose') {
            colorStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100';
          }
          return {
            id: s.id || `sn_${idx}`,
            text: s.text,
            color: colorStyle,
            pinned: !!s.pinned,
          };
        })
      );
    }
  }, [content, selection.subject?.name]);

  const filteredCards = flashcards.filter((card) => {
    if (fcFilter === 'mastered') return card.status === 'mastered';
    if (fcFilter === 'revision') return card.status === 'revision';
    return true;
  });

  const currentCard = filteredCards[fcIndex] || filteredCards[0];

  const handleRateCard = (status: 'mastered' | 'revision') => {
    if (!currentCard) return;
    setFlashcards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? { ...c, status } : c))
    );
    setIsFlipped(false);
    if (fcIndex < filteredCards.length - 1) {
      setFcIndex((prev) => prev + 1);
    } else {
      setFcIndex(0);
    }
  };

  const handleShuffleCards = () => {
    setFlashcards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setFcIndex(0);
    setIsFlipped(false);
  };

  // Sticky Notes handlers
  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;

    let colorStyle = 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100';
    if (newStickyColor === 'emerald') {
      colorStyle = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
    } else if (newStickyColor === 'indigo') {
      colorStyle = 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100';
    } else if (newStickyColor === 'rose') {
      colorStyle = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100';
    }

    const note: StickyNoteItem = {
      id: `sn_${Date.now()}`,
      text: newStickyText.trim(),
      color: colorStyle,
      pinned: false,
    };

    setStickyNotes((prev) => [note, ...prev]);
    setNewStickyText('');
  };

  const handleTogglePin = (id: string) => {
    setStickyNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleDeleteSticky = (id: string) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleToggleBlank = (key: string) => {
    setRevealedBlanks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Study Hub Header & Sub-nav Pills */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Study Suite & Active Recall</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {selection.topic?.name || 'Coronary Artery Disease'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured high-yield notes, physical flashcards, active recall sheets & sticky notes.
          </p>
        </div>

        {/* 4 Tool Sub-Navigation Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700">
          {[
            { id: 'notes' as StudySubTab, label: '📄 A4 Notes' },
            { id: 'flashcards' as StudySubTab, label: '🃏 Flashcards' },
            { id: 'sticky' as StudySubTab, label: '📌 Sticky Board' },
            { id: 'revision' as StudySubTab, label: '⚡ 60s Recall' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. A4 STRUCTURED NOTES VIEW */}
      {activeSubTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents (1 Col) */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-indigo-500" /> Table of Contents
              </h3>
              <nav className="space-y-1 text-xs">
                {[
                  { title: '1. Pathophysiology & Mechanisms', href: '#section-1' },
                  { title: '2. Clinical Presentation & Triads', href: '#section-2' },
                  { title: '3. Diagnostic Algorithms & ECG', href: '#section-3' },
                  { title: '4. Evidence-Based Therapeutics', href: '#section-4' },
                  { title: '5. High-Yield Board Traps', href: '#section-5' },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium transition-colors"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Quick Actions Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / Export Note
              </button>

              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-amber-500" /> Bookmarked
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" /> Bookmark Topic Note
                  </>
                )}
              </button>
            </div>
          </div>

          {/* A4 Structured Document (3 Cols) */}
          <div className="lg:col-span-3">
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 max-w-3xl mx-auto">
              {/* Document Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  <span>{selection.subject?.name || 'Cardiovascular Medicine'}</span>
                  <span>•</span>
                  <span>Core Board Review</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {selection.topic?.name || 'Coronary Artery Disease & Acute Coronary Syndromes'}
                </h1>
                <p className="text-xs text-slate-500">
                  Comprehensive high-yield notes calibrated to official examination standards.
                </p>
              </div>

              {/* Section 1 */}
              <section id="section-1" className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> 1. Pathophysiology & Mechanisms
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  Coronary artery disease is primarily initiated by endothelial injury followed by subendothelial lipid accumulation, macrophage migration, foam cell formation, and fibrous plaque growth.
                </p>
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  <strong>High-Yield Core:</strong> Acute coronary syndrome (ACS) occurs upon plaque rupture with overlying thrombosis. Plaque vulnerability depends on a thin fibrous cap and large necrotic lipid core, rather than degree of luminal stenosis alone.
                </div>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> 2. Clinical Presentation & Triads
                </h2>
                <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <li><strong>Typical Angina:</strong> Substernal pressure/heaviness, provoked by exertion/emotional stress, relieved by rest or sublingual nitroglycerin within 5 minutes.</li>
                  <li><strong>Atypical Angina:</strong> Meets 2 of the 3 typical characteristics. Frequently seen in females, elderly, and diabetic patients (e.g. dyspnea, nausea, fatigue).</li>
                  <li><strong>Non-anginal Chest Pain:</strong> Meets 1 or none of the typical characteristics.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600" /> 3. Diagnostic Algorithms & ECG Localization
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      <tr>
                        <th className="p-2.5">Infarct Location</th>
                        <th className="p-2.5">ECG Leads</th>
                        <th className="p-2.5">Culprit Artery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">Anterior / Septal</td>
                        <td className="p-2.5">V1, V2, V3, V4</td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">LAD</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">Inferior</td>
                        <td className="p-2.5">II, III, aVF</td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">RCA (85-90%)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">Lateral</td>
                        <td className="p-2.5">I, aVL, V5, V6</td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">LCx or Diagonal LAD</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">Posterior</td>
                        <td className="p-2.5">Tall R waves & ST depression in V1-V2</td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">PDA / LCx</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> 4. Evidence-Based Therapeutics
                </h2>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white">Mortality-Reducing Medications in Post-MI:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Dual Antiplatelet Therapy (DAPT):</strong> Aspirin + Clopidogrel / Ticagrelor for ≥12 months.</li>
                    <li><strong>High-Intensity Statin:</strong> Atorvastatin 80 mg or Rosuvastatin 40 mg regardless of baseline LDL.</li>
                    <li><strong>Beta-Blocker:</strong> Metoprolol succinate or Carvedilol (reduces arrhythmic risk and cardiac remodeling).</li>
                    <li><strong>ACE-Inhibitor / ARB:</strong> Especially indicated if LVEF &lt; 40%, anterior MI, diabetes, or CKD.</li>
                  </ul>
                </div>
              </section>

              {/* Section 5: Board Traps */}
              <section id="section-5" className="space-y-3">
                <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600" /> 5. High-Yield Board Exam Traps
                </h2>
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1.5 leading-relaxed">
                  <div><strong>Trap 1:</strong> Administering nitrates in inferior STEMI without verifying right ventricular involvement (V4R). Right ventricular infarcts are preload-dependent; nitrates cause refractory shock.</div>
                  <div><strong>Trap 2:</strong> Measuring Troponin at 1 hour after chest pain onset. Troponin takes 2-4 hours to rise; a single negative early troponin does NOT rule out MI.</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 2. 3D PHYSICAL FLASHCARDS VIEW */}
      {activeSubTab === 'flashcards' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Deck Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setFcFilter('all');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({flashcards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFcFilter('revision');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'revision' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Repeat ({flashcards.filter((c) => c.status === 'revision').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFcFilter('mastered');
                  setFcIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  fcFilter === 'mastered' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mastered ({flashcards.filter((c) => c.status === 'mastered').length})
              </button>
            </div>

            {/* Shuffle & Progress */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleShuffleCards}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" /> Shuffle
              </button>

              <span className="font-bold text-slate-700 dark:text-slate-300">
                Card {fcIndex + 1} of {Math.max(1, filteredCards.length)}
              </span>
            </div>
          </div>

          {/* The Physical Card Container with 3D Flip */}
          {currentCard ? (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[300px] sm:min-h-[340px] rounded-3xl p-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between select-none"
            >
              {/* Card Top Pill */}
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                  {currentCard.category || 'High-Yield Concept'}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                  <RotateCw className="w-3.5 h-3.5" /> Click to {isFlipped ? 'Show Question' : 'Reveal Answer'}
                </span>
              </div>

              {/* Card Body */}
              <div className="py-6 my-auto text-center space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {isFlipped ? 'Answer & High Yield Mnemonic' : 'Active Recall Prompt'}
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed max-w-lg mx-auto whitespace-pre-line">
                  {isFlipped ? currentCard.back : currentCard.front}
                </div>
              </div>

              {/* Card Footer Indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="font-semibold">{currentCard.difficulty || 'High Yield'}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {isFlipped ? 'Back Side' : 'Front Side'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
              No flashcards in this filter category.
            </div>
          )}

          {/* Leitner Spaced Repetition Rating Buttons */}
          {currentCard && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRateCard('revision')}
                className="py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-amber-500" /> Hard / Needs Revision (Repeat)
              </button>

              <button
                type="button"
                onClick={() => handleRateCard('mastered')}
                className="py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Good / Mastered Concept
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. STICKY NOTES CORKBOARD VIEW */}
      {activeSubTab === 'sticky' && (
        <div className="space-y-6">
          {/* Add New Sticky Note Input Form */}
          <form
            onSubmit={handleAddSticky}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
          >
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Pin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Add Sticky Note for this Topic
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newStickyText}
                onChange={(e) => setNewStickyText(e.target.value)}
                placeholder="Type your personal mnemonic, high-yield pearl, or study reminder..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-600"
              />

              <div className="flex items-center gap-2 shrink-0">
                {/* Color Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                  {['amber', 'emerald', 'indigo', 'rose'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStickyColor(c)}
                      className={`w-6 h-6 rounded-lg cursor-pointer transition-transform ${
                        c === 'amber'
                          ? 'bg-amber-400'
                          : c === 'emerald'
                          ? 'bg-emerald-400'
                          : c === 'indigo'
                          ? 'bg-indigo-400'
                          : 'bg-rose-400'
                      } ${newStickyColor === c ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : ''}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Note
                </button>
              </div>
            </div>
          </form>

          {/* Sticky Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stickyNotes.map((note) => (
              <div
                key={note.id}
                className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 min-h-[140px] transition-all relative ${note.color}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{note.text}</p>
                  <button
                    type="button"
                    onClick={() => handleTogglePin(note.id)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    title={note.pinned ? 'Unpin' : 'Pin to top'}
                  >
                    {note.pinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5 opacity-60" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10 text-[10px]">
                  <span className="font-bold opacity-75">Personal Note</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSticky(note.id)}
                    className="text-rose-600 hover:opacity-100 opacity-60 transition-opacity cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 60-SECOND REVISION & ACTIVE RECALL VIEW */}
      {activeSubTab === 'revision' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Active Recall Fill-in-the-Blanks
                </h3>
                <p className="text-xs text-slate-500">
                  Test your memory retention on key high-yield terms before checking the answers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveRecallMode(!activeRecallMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeRecallMode
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {activeRecallMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{activeRecallMode ? 'Active Recall Mode ON' : 'Reveal All Mode'}</span>
              </button>
            </div>

            <div className="space-y-4 pt-2">
              {((content?.fill_in_the_blanks && content.fill_in_the_blanks.length > 0)
                ? content.fill_in_the_blanks.map((fib, idx) => ({
                    id: fib.id || `fib_${idx}`,
                    title: `${fib.concept} Rapid Recall`,
                    concept: fib.sentence,
                    blanks: [fib.blank],
                    pearl: fib.explanation,
                  }))
                : DEFAULT_REVISION_ITEMS
              ).map((item, idx) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {idx + 1}. {item.title}
                    </span>
                  </div>

                  {/* Concept paragraph with blanks */}
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {item.concept.split(' ').map((word, wIdx) => {
                      const cleanWord = word.replace(/[.,]/g, '');
                      const isBlankTarget = item.blanks.some((b) => b.toLowerCase().includes(cleanWord.toLowerCase()));
                      const key = `${item.id}_${wIdx}`;
                      const isRevealed = revealedBlanks[key] || !activeRecallMode;

                      if (isBlankTarget && activeRecallMode) {
                        return (
                          <span
                            key={wIdx}
                            onClick={() => handleToggleBlank(key)}
                            className={`inline-block px-1.5 py-0.5 mx-0.5 rounded font-bold cursor-pointer transition-all ${
                              isRevealed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 underline'
                                : 'bg-slate-300 dark:bg-slate-700 text-transparent select-none'
                            }`}
                            title="Click to reveal"
                          >
                            {word}{' '}
                          </span>
                        );
                      }

                      return <span key={wIdx}>{word} </span>;
                    })}
                  </div>

                  {/* Clinical Pearl footer */}
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                    💡 <strong>Takeaway:</strong> {item.pearl}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
