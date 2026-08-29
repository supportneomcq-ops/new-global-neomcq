'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSelection } from '@/lib/context/selection-context';
import { MCQQuestion } from '@/components/learning-workspace/types';

export interface StickyNoteItem {
  id: string;
  text: string;
  color: 'amber' | 'emerald' | 'indigo' | 'rose' | string;
  category?: string;
  pinned?: boolean;
}

export interface FillInBlankItem {
  id: string;
  sentence: string;
  blank: string;
  concept: string;
  explanation: string;
}

export interface WhiteboardPhaseItem {
  phase: number;
  title: string;
  diagram: string;
  description: string;
  badge: string;
  narration?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
}

export interface TopicContentData {
  mcqs: MCQQuestion[];
  quiz_a: MCQQuestion[];
  quiz_b: MCQQuestion[];
  notes: string;
  flashcards: FlashcardItem[];
  sticky_notes: StickyNoteItem[];
  fill_in_the_blanks: FillInBlankItem[];
  whiteboard_phases: WhiteboardPhaseItem[];
  tutor_explanation?: string;
  revision_sheet?: string;
  quality_score?: number;
}

export type PreparationStage =
  | 'identifying_exam'
  | 'identifying_subject'
  | 'identifying_topic'
  | 'checking_knowledge'
  | 'creating_structure'
  | 'creating_mcqs'
  | 'creating_quizzes'
  | 'creating_flashcards'
  | 'creating_notes'
  | 'creating_sticky'
  | 'creating_recall'
  | 'preparing_tutor'
  | 'validating'
  | 'saving'
  | 'ready';

export interface PreparationStep {
  id: PreparationStage;
  label: string;
  detail: string;
}

export const PREPARATION_STEPS: PreparationStep[] = [
  { id: 'identifying_exam', label: 'Exam Identified', detail: 'Verifying official syllabus & exam blueprint...' },
  { id: 'identifying_subject', label: 'Subject Resolved', detail: 'Mapping clinical domain & subject taxonomy...' },
  { id: 'identifying_topic', label: 'Topic Scoped', detail: 'Strict canonical entity resolution...' },
  { id: 'checking_knowledge', label: 'Checking Knowledge Repository', detail: '30-day freshness verification...' },
  { id: 'creating_structure', label: 'Structuring Learning Hierarchy', detail: 'Constructing high-yield syllabus modules...' },
  { id: 'creating_mcqs', label: 'Synthesizing 40 High-Yield MCQs', detail: 'Deduplicated clinical vignettes with rationales...' },
  { id: 'creating_quizzes', label: 'Assembling Quiz A & Quiz B', detail: 'Partitioning non-overlapping 20-question sprints...' },
  { id: 'creating_flashcards', label: 'Building Spaced Flashcards', detail: 'Extracting key clinical associations...' },
  { id: 'creating_notes', label: 'Generating Structured A4 Notes', detail: 'Formatting pathophysiology, triads & drug tables...' },
  { id: 'creating_sticky', label: 'Curating High-Yield Sticky Board', detail: 'Extracting board traps & clinical pearls...' },
  { id: 'creating_recall', label: 'Preparing 60s Active Recall', detail: 'Generating cloze-deletion revision sheets...' },
  { id: 'preparing_tutor', label: 'Calibrating Synaptic AI Tutor', detail: 'Generating multi-phase visual whiteboard lesson...' },
  { id: 'validating', label: 'Validating Quality Standards', detail: 'Running schema & medical consensus check...' },
  { id: 'saving', label: 'Saving to Learning Library', detail: 'Ready for instant practice...' },
];

interface TopicContentContextType {
  content: TopicContentData | null;
  isLoading: boolean;
  isInitialLoad: boolean;
  isRefreshing: boolean;
  isCached: boolean;
  version: number;
  lastRefreshedAt: string | null;
  error: string | null;
  currentStage: PreparationStage;
  currentStageIndex: number;
  refreshTopicContent: (force?: boolean) => Promise<void>;
  activeQuiz: 'A' | 'B';
  setActiveQuiz: (quiz: 'A' | 'B') => void;
  activeQuestions: MCQQuestion[];
  quizAttempts: Record<string, any[]>;
  recordQuizAttempt: (quizKey: string, attempt: any) => void;
  getAttemptsCount: (quizKey: string) => number;
}

const TopicContentContext = createContext<TopicContentContextType | undefined>(undefined);

// High-Yield Default Content Fallback (Cardiology baseline)
const FALLBACK_DEFAULT_CONTENT: TopicContentData = {
  mcqs: [
    {
      id: 'mcq_cad_1',
      question: 'A 58-year-old male presents with acute substernal crushing chest pain radiating to his left jaw that began 45 minutes ago. ECG demonstrates ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL. Which coronary artery is most likely occluded?',
      options: [
        'Left anterior descending artery (LAD)',
        'Right coronary artery (RCA)',
        'Left circumflex artery (LCx)',
        'Left main coronary artery (LMCA)',
      ],
      correct_index: 1,
      explanation: 'ST elevation in leads II, III, and aVF indicates an acute inferior wall myocardial infarction. The inferior wall of the left ventricle is primarily supplied by the posterior descending artery, which in ~85-90% of individuals originates from the Right Coronary Artery (right-dominant circulation).',
      clinical_pearl: 'Inferior STEMI (II, III, aVF) is caused by RCA occlusion in 85-90% of cases. Always check lead V4R for right ventricular involvement before administering nitrates.',
      high_yield_tag: 'Cardiology • STEMI Localization',
      difficulty: 'High Yield',
    },
    {
      id: 'mcq_cad_2',
      question: 'Which of the following medications is contraindicated in the patient above if right ventricular infarction is suspected on right-sided precordial leads?',
      options: [
        'Aspirin 325 mg chewed',
        'Intravenous Nitroglycerin',
        'Unfractionated heparin bolus',
        'Ticagrelor 180 mg loading dose',
      ],
      correct_index: 1,
      explanation: 'Nitroglycerin reduces cardiac preload through venodilation. In right ventricular infarction, the right ventricle is highly preload-dependent to maintain forward flow to the left ventricle. Administering venodilators like nitroglycerin can precipitate severe refractory hypotension.',
      clinical_pearl: 'Never give nitrates or diuretics in suspected right ventricular infarction; maintain preload with aggressive IV crystalloid boluses.',
      high_yield_tag: 'Pharmacology • STEMI Management',
      difficulty: 'Board Classic',
    },
    {
      id: 'mcq_cad_3',
      question: 'A 65-year-old female presents for routine follow-up. Her blood pressure is 152/94 mmHg on two separate visits. Serum creatinine is 0.9 mg/dL and potassium is 4.2 mEq/L. Urine albumin-to-creatinine ratio is 180 mg/g. Which of the following is the most appropriate first-line antihypertensive agent?',
      options: [
        'Hydrochlorothiazide',
        'Lisinopril',
        'Metoprolol succinate',
        'Amlodipine',
      ],
      correct_index: 1,
      explanation: 'In patients with hypertension and persistent microalbuminuria (urine ACR 30-300 mg/g), ACE inhibitors (such as Lisinopril) or ARBs are the first-line therapy of choice due to their proven renal protective effects and reduction of intraglomerular pressure.',
      clinical_pearl: 'ACE inhibitors and ARBs dilate the efferent arteriole, reducing intraglomerular hydrostatic pressure and slowing renal disease progression.',
      high_yield_tag: 'Nephrology • Hypertension Guidelines',
      difficulty: 'High Yield',
    },
    {
      id: 'mcq_cad_4',
      question: 'A 32-year-old female presents with palpitations, heat intolerance, and unintended weight loss of 6 kg over 2 months. Physical examination reveals mild exophthalmos and a diffusely enlarged, non-tender thyroid with an audible bruit. What is the underlying mechanism of this condition?',
      options: [
        'Autoantibodies against thyroid peroxidase (anti-TPO)',
        'Autoantibodies stimulating the TSH receptor (TSI)',
        'Transient release of preformed colloid thyroid hormones',
        'Autonomously functioning thyroid follicular adenoma',
      ],
      correct_index: 1,
      explanation: 'The patient presents with classic signs of Graves disease (hyperthyroidism, diffuse non-tender goiter with bruit, and exophthalmos). Graves disease is caused by thyroid-stimulating immunoglobulins (TSI) that bind to and activate the TSH receptor on thyroid follicular cells.',
      clinical_pearl: 'Graves disease is characterized by TSH-receptor stimulating autoantibodies. Exophthalmos and pretibial myxedema are pathognomonic for Graves disease and do not occur in toxic multinodular goiter.',
      high_yield_tag: 'Endocrinology • Hyperthyroidism',
      difficulty: 'Core High Yield',
    },
  ],
  quiz_a: [],
  quiz_b: [],
  notes: `# 📚 CORONARY ARTERY DISEASE & ACUTE CORONARY SYNDROMES

## 1. Pathophysiology & Cellular Mechanisms
Coronary artery disease (CAD) develops through chronic endothelial shear stress and subendothelial accumulation of low-density lipoproteins (LDL). Macrophages ingest oxidized LDL to become foam cells, forming the fatty streak. Over time, smooth muscle proliferation and extracellular matrix deposition produce a fibroatheromatous plaque.

* **Stable Angina:** Fixed luminal obstruction (typically >70%) with intact fibrous cap causing ischemia only during increased myocardial oxygen demand.
* **Acute Coronary Syndrome (ACS):** Sudden disruption of a vulnerable plaque (characterized by a thin fibrous cap, rich lipid core, and high macrophage density) followed by overlying thrombosis and luminal occlusion.

## 2. Clinical Presentation & Triads
* **Typical Angina Triad:**
  1. Substernal chest discomfort (crushing, pressure, squeezing)
  2. Provoked by exertion or emotional stress
  3. Relieved by rest or sublingual nitroglycerin within 5 minutes
* **Atypical Angina:** Meets 2 of the 3 criteria (frequently encountered in diabetic, female, and geriatric cohorts).

## 3. Diagnostic Algorithms & ECG Localization
| ECG Lead Changes | Affected Myocardial Wall | Culprit Coronary Artery |
| :--- | :--- | :--- |
| **II, III, aVF** | Inferior Wall | Right Coronary Artery (RCA, 85-90%) |
| **V1 - V2** | Septal Wall | Proximal LAD |
| **V3 - V4** | Anterior Wall | Left Anterior Descending (LAD) |
| **I, aVL, V5 - V6** | Lateral Wall | Left Circumflex (LCx) or Diagonal |
| **ST Depressions V1-V3** | Posterior Wall | Posterior Descending Artery (PDA) / LCx |

## 4. Evidence-Based Therapeutics
1. **Immediate Medical Management:**
   * Aspirin 325 mg chewed + P2Y12 inhibitor (Ticagrelor or Prasugrel)
   * Anticoagulation: Unfractionated heparin or Enoxaparin
   * High-intensity statin: Atorvastatin 80 mg
2. **Reperfusion Strategy:**
   * Primary Percutaneous Coronary Intervention (PCI) within **90 minutes** (door-to-balloon time) if PCI-capable center.
   * Fibrinolytic therapy within **30 minutes** if PCI unavailable within 120 minutes of first medical contact.

## 5. High-Yield Board Traps
* ⚠️ **Right Ventricular Infarct Trap:** Suspect in any inferior STEMI with hypotension and clear lung fields. **DO NOT GIVE NITRATES OR DIURETICS**. Treat with aggressive IV isotonic fluid boluses.
* ⚠️ **Prinzmetal (Vasospastic) Angina:** Transient ST elevation triggered by coronary vasospasm. Treated with Calcium Channel Blockers (Diltiazem/Amlodipine) and Nitrates; Non-selective Beta-blockers are contraindicated due to unopposed alpha-1 vasoconstriction.`,
  flashcards: [
    {
      id: 'fc_1',
      front: 'What is the culprit artery in an inferior wall STEMI with ST elevation in leads II, III, and aVF?',
      back: 'Right Coronary Artery (RCA) in 85-90% of individuals (Posterior Descending Artery branch).',
      category: 'Cardiology',
      difficulty: 'High Yield',
    },
    {
      id: 'fc_2',
      front: 'Why are nitrates contraindicated in suspected right ventricular myocardial infarction?',
      back: 'Nitrates cause venodilation and reduce preload. The stunned RV requires high preload to maintain cardiac output; nitrates cause refractory hypotension.',
      category: 'Pharmacology',
      difficulty: 'Board Classic',
    },
    {
      id: 'fc_3',
      front: 'What is the target door-to-balloon time for primary PCI in STEMI at a PCI-capable facility?',
      back: 'Within 90 minutes of first medical contact.',
      category: 'Emergency Medicine',
      difficulty: 'High Yield',
    },
    {
      id: 'fc_4',
      front: 'Which drug class is contraindicated in Prinzmetal (vasospastic) angina due to unopposed alpha-1 stimulation?',
      back: 'Non-selective Beta-Blockers (e.g., Propranolol). Use Calcium Channel Blockers and Nitrates instead.',
      category: 'Pharmacology',
      difficulty: 'High Yield',
    },
  ],
  sticky_notes: [
    {
      id: 'sn_1',
      text: 'Inferior STEMI (II, III, aVF) -> Always order Lead V4R to check for RV Infarction before administering nitroglycerin!',
      color: 'rose',
      category: 'Exam Pearls',
      pinned: true,
    },
    {
      id: 'sn_2',
      text: 'ACS Door-to-Balloon target = < 90 mins. Door-to-Needle for thrombolytics = < 30 mins if PCI not accessible.',
      color: 'emerald',
      category: 'High Yield Traps',
      pinned: true,
    },
    {
      id: 'sn_3',
      text: 'Mnemonic for Post-MI Complications: "DARTH VADER" (Death, Arrhythmia, Rupture, Tamponade, Heart Failure, Valve dysfunction, Aneurysm, Dressler syndrome, Embolism, Recurrence).',
      color: 'amber',
      category: 'Memory Tricks',
      pinned: false,
    },
    {
      id: 'sn_4',
      text: 'Atypical angina presentation is most common in elderly, female, and diabetic patients (dyspnea alone).',
      color: 'indigo',
      category: 'Clinical Pearls',
      pinned: false,
    },
  ],
  fill_in_the_blanks: [
    {
      id: 'fib_1',
      sentence: 'The culprit artery responsible for inferior STEMI (leads II, III, aVF) in ~90% of patients is the [Right Coronary Artery].',
      blank: 'Right Coronary Artery',
      concept: 'Vessel Localization',
      explanation: 'The RCA gives off the Posterior Descending Artery (PDA) in right-dominant circulation.',
    },
    {
      id: 'fib_2',
      sentence: 'In patients with suspected right ventricular myocardial infarction, medications that reduce preload such as [Nitroglycerin] must be avoided.',
      blank: 'Nitroglycerin',
      concept: 'Preload Management',
      explanation: 'Venodilators precipitate severe hypotension due to RV preload dependency.',
    },
    {
      id: 'fib_3',
      sentence: 'The recommended door-to-balloon time for primary percutaneous coronary intervention (PCI) is within [90 minutes].',
      blank: '90 minutes',
      concept: 'Emergency Guidelines',
      explanation: 'PCI within 90 minutes reduces infarct size and 30-day mortality.',
    },
    {
      id: 'fib_4',
      sentence: 'In patients with vasospastic (Prinzmetal) angina, non-selective [Beta-blockers] are contraindicated because they cause unopposed alpha-1 coronary vasoconstriction.',
      blank: 'Beta-blockers',
      concept: 'Receptor Pharmacology',
      explanation: 'Calcium channel blockers and nitrates are the first-line treatment.',
    },
  ],
  whiteboard_phases: [
    {
      phase: 1,
      title: '1. Mechanism & Cellular Pathophysiology',
      diagram: 'Endothelial Injury → Foam Cell Plaque → Rupture & Luminal Thrombosis',
      description: 'Coronary atherosclerosis begins with chronic endothelial shear stress and subendothelial LDL deposition. Macrophages engulf oxidized LDL to form foam cells. When the fibrous cap undergoes matrix metalloproteinase degradation, the lipid core is exposed to circulating platelets, triggering immediate platelet aggregation (Gp IIb/IIIa activation) and occlusive fibrin thrombus formation.',
      badge: 'Cellular Pathology',
      narration: 'Observe how endothelial shear stress initiates subendothelial lipid entrapment, forming a vulnerable plaque that can acutely rupture.',
    },
    {
      phase: 2,
      title: '2. Clinical Presentation & Hemodynamics',
      diagram: 'Substernal Squeezing + Diaphoresis + S4 Gallop',
      description: 'Acute transmural ischemia causes severe substernal crushing pain that is non-positional and unrelieved by nitroglycerin. Sympathetic activation drives diaphoresis and tachycardia. Decreased left ventricular compliance creates an audible S4 gallop at the apex.',
      badge: 'Clinical Triad',
      narration: 'Classic presentations feature radiation to the left arm or jaw, accompanied by autonomic signs like profuse diaphoresis.',
    },
    {
      phase: 3,
      title: '3. Diagnostic Triad & ECG Localization',
      diagram: 'Leads II, III, aVF ST Elevation + Reciprocal aVL Depression',
      description: 'Transmural ischemia produces an epicardial injury current. Inferior STEMI manifests as >1 mm ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL. The culprit vessel is the Right Coronary Artery (RCA) in 85-90% of patients.',
      badge: 'ECG Localization',
      narration: 'Always check reciprocal leads; ST depression in lead I and aVL confirms inferior wall injury vector.',
    },
    {
      phase: 4,
      title: '4. First-Line Intervention & Board Traps',
      diagram: 'Primary PCI (<90 mins) + Dual Antiplatelet + Avoid Nitrates in RV Infarct',
      description: 'Immediate reperfusion is paramount: Primary Percutaneous Coronary Intervention (PCI) within 90 minutes door-to-balloon time. Medical therapy requires Dual Antiplatelet Therapy (Aspirin + P2Y12 inhibitor) and Heparin. Board Exam Trap: In right ventricular infarction (V4R ST elevation), nitrates cause profound hypotension by dropping preload.',
      badge: 'Board High Yield',
      narration: 'Remember: In right ventricular involvement, fluid resuscitation maintains cardiac output. Never administer preload reducers.',
    },
  ],
  tutor_explanation: 'Coronary artery disease centers on oxygen supply-demand mismatch. In STEMI, complete occlusion occurs; in NSTEMI/unstable angina, subtotal occlusion is present.',
  revision_sheet: '⚡ 60-SECOND RAPID REVISION: Inferior STEMI = RCA (II, III, aVF). Avoid nitrates in RV infarct. Door to balloon = 90 mins.',
  quality_score: 98.0,
};

// Populate default Quiz A and Quiz B from default MCQs
FALLBACK_DEFAULT_CONTENT.quiz_a = FALLBACK_DEFAULT_CONTENT.mcqs.slice(0, 2);
FALLBACK_DEFAULT_CONTENT.quiz_b = FALLBACK_DEFAULT_CONTENT.mcqs.slice(2, 4);

export function TopicContentProvider({ children }: { children: React.ReactNode }) {
  const { selection } = useSelection();

  const [content, setContent] = useState<TopicContentData | null>(FALLBACK_DEFAULT_CONTENT);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(true);
  const [version, setVersion] = useState(1);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stepper state for educational loading animation
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage: PreparationStage = useMemo(() => {
    return PREPARATION_STEPS[Math.min(currentStageIndex, PREPARATION_STEPS.length - 1)].id;
  }, [currentStageIndex]);

  // CBT Quiz Switch: Quiz A vs Quiz B
  const [activeQuiz, setActiveQuiz] = useState<'A' | 'B'>('A');

  // Quiz Attempts Tracking (stored per topic + quiz)
  const [quizAttempts, setQuizAttempts] = useState<Record<string, any[]>>({});

  // Initialize stored quiz attempts from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('neomcq_all_quiz_attempts');
      if (stored) {
        setQuizAttempts(JSON.parse(stored));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const recordQuizAttempt = useCallback((quizKey: string, attempt: any) => {
    setQuizAttempts((prev) => {
      const existing = prev[quizKey] || [];
      const updated = [...existing, attempt];
      const nextMap = { ...prev, [quizKey]: updated };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('neomcq_all_quiz_attempts', JSON.stringify(nextMap));
        } catch {}
      }
      return nextMap;
    });
  }, []);

  const getAttemptsCount = useCallback(
    (quizKey: string) => {
      return (quizAttempts[quizKey] || []).length;
    },
    [quizAttempts]
  );

  // Derive active questions based on current active quiz
  const activeQuestions: MCQQuestion[] = useMemo(() => {
    if (!content) return FALLBACK_DEFAULT_CONTENT.mcqs;
    if (activeQuiz === 'A' && content.quiz_a && content.quiz_a.length > 0) {
      return content.quiz_a;
    }
    if (activeQuiz === 'B' && content.quiz_b && content.quiz_b.length > 0) {
      return content.quiz_b;
    }
    return content.mcqs || FALLBACK_DEFAULT_CONTENT.mcqs;
  }, [content, activeQuiz]);

  // Main Topic Fetcher & Pipeline Orchestrator
  const fetchTopicContent = useCallback(
    async (forceRefresh = false) => {
      const topicName = selection.topic?.name;
      const subjectName = selection.subject?.name;
      const examName = selection.exam?.name;

      if (!topicName) return;

      setIsLoading(true);
      setError(null);
      setCurrentStageIndex(0);

      // Educational Stepper animation timer
      let stepTimer: NodeJS.Timeout | null = null;
      let curStep = 0;
      stepTimer = setInterval(() => {
        curStep += 1;
        if (curStep < PREPARATION_STEPS.length - 1) {
          setCurrentStageIndex(curStep);
        }
      }, 450);

      try {
        const res = await fetch('/api/knowledge/topic-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: selection.topic?.id,
            topicName: topicName,
            subjectId: selection.subject?.id,
            subjectName: subjectName,
            examId: selection.exam?.id,
            examName: examName,
            forceRefresh,
          }),
        });

        const data = await res.json();

        if (stepTimer) clearInterval(stepTimer);
        setCurrentStageIndex(PREPARATION_STEPS.length - 1); // Done / Saved

        if (data.success && data.content) {
          const raw = data.content;

          // Ensure Quiz A and Quiz B exist and have questions
          const allMcqs: MCQQuestion[] = Array.isArray(raw.mcqs) && raw.mcqs.length > 0
            ? raw.mcqs
            : FALLBACK_DEFAULT_CONTENT.mcqs;

          const quizA: MCQQuestion[] = Array.isArray(raw.quiz_a) && raw.quiz_a.length > 0
            ? raw.quiz_a
            : allMcqs.slice(0, Math.min(20, Math.ceil(allMcqs.length / 2)));

          const quizB: MCQQuestion[] = Array.isArray(raw.quiz_b) && raw.quiz_b.length > 0
            ? raw.quiz_b
            : allMcqs.slice(quizA.length, quizA.length + 20).length > 0
              ? allMcqs.slice(quizA.length, quizA.length + 20)
              : quizA;

          const flashcards: FlashcardItem[] = Array.isArray(raw.flashcards) && raw.flashcards.length > 0
            ? raw.flashcards
            : FALLBACK_DEFAULT_CONTENT.flashcards;

          const stickyNotes: StickyNoteItem[] = Array.isArray(raw.sticky_notes) && raw.sticky_notes.length > 0
            ? raw.sticky_notes
            : FALLBACK_DEFAULT_CONTENT.sticky_notes;

          const fillInBlanks: FillInBlankItem[] = Array.isArray(raw.fill_in_the_blanks) && raw.fill_in_the_blanks.length > 0
            ? raw.fill_in_the_blanks
            : FALLBACK_DEFAULT_CONTENT.fill_in_the_blanks;

          const whiteboardPhases: WhiteboardPhaseItem[] = Array.isArray(raw.whiteboard_phases) && raw.whiteboard_phases.length > 0
            ? raw.whiteboard_phases
            : FALLBACK_DEFAULT_CONTENT.whiteboard_phases;

          const parsedContent: TopicContentData = {
            mcqs: allMcqs,
            quiz_a: quizA,
            quiz_b: quizB,
            notes: raw.notes || FALLBACK_DEFAULT_CONTENT.notes,
            flashcards,
            sticky_notes: stickyNotes,
            fill_in_the_blanks: fillInBlanks,
            whiteboard_phases: whiteboardPhases,
            tutor_explanation: raw.tutor_explanation || FALLBACK_DEFAULT_CONTENT.tutor_explanation,
            revision_sheet: raw.revision_sheet || FALLBACK_DEFAULT_CONTENT.revision_sheet,
            quality_score: raw.quality_score || 95.0,
          };

          setContent(parsedContent);
          setIsCached(data.cached ?? true);
          setVersion(data.version || 1);
          setLastRefreshedAt(data.topicState?.last_refreshed_at || new Date().toISOString());
        } else {
          // Graceful fallback to rich structured default content
          console.warn('[TopicContentProvider] API responded with non-success, using high-yield fallback:', data.error);
          setContent(FALLBACK_DEFAULT_CONTENT);
        }
      } catch (err: any) {
        if (stepTimer) clearInterval(stepTimer);
        console.error('[TopicContentProvider] Network fetch failed:', err);
        setError(err.message || 'Failed to load topic learning content.');
        setContent(FALLBACK_DEFAULT_CONTENT);
      } finally {
        // Brief pleasant pause on completion
        setTimeout(() => {
          setIsLoading(false);
          setIsInitialLoad(false);
          setIsRefreshing(false);
        }, 300);
      }
    },
    [selection.topic?.id, selection.topic?.name, selection.subject?.id, selection.subject?.name, selection.exam?.id, selection.exam?.name]
  );

  // Auto-fetch whenever topic selection changes
  useEffect(() => {
    if (selection.topic?.name) {
      fetchTopicContent(false);
    }
  }, [selection.topic?.name, selection.exam?.id, fetchTopicContent]);

  const refreshTopicContent = useCallback(
    async (force = true) => {
      setIsRefreshing(true);
      await fetchTopicContent(force);
    },
    [fetchTopicContent]
  );

  return (
    <TopicContentContext.Provider
      value={{
        content,
        isLoading,
        isInitialLoad,
        isRefreshing,
        isCached,
        version,
        lastRefreshedAt,
        error,
        currentStage,
        currentStageIndex,
        refreshTopicContent,
        activeQuiz,
        setActiveQuiz,
        activeQuestions,
        quizAttempts,
        recordQuizAttempt,
        getAttemptsCount,
      }}
    >
      {children}
    </TopicContentContext.Provider>
  );
}

export function useTopicContent() {
  const ctx = useContext(TopicContentContext);
  if (!ctx) {
    throw new Error('useTopicContent must be used within a TopicContentProvider');
  }
  return ctx;
}
