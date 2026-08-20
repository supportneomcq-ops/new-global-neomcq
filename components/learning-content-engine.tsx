'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Loader2,
  Search,
  Zap,
  HelpCircle,
  FileText,
  Layers,
  Flame,
  Bookmark,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Edit3,
  Printer,
  ChevronRight,
  Shuffle,
  GraduationCap,
  MessageSquare,
  Highlighter,
  AlertCircle,
  PenTool,
  Tag,
  ArrowRight,
  RefreshCw,
  Clock,
  TrendingUp,
  Award,
  Pin,
  Archive,
  Maximize2,
  Download,
  CheckSquare,
  Share2,
  Sliders,
  ChevronDown,
  Moon,
  Sun,
  Grid,
  MapPin,
  List,
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useSelection } from '@/lib/context/selection-context'

interface LearningContentEngineProps {
  initialExamName?: string
  initialSubjectName?: string
}

export function LearningContentEngine({
  initialExamName = 'USMLE Step 1 & 2 CK',
  initialSubjectName = 'Human Anatomy',
}: LearningContentEngineProps) {
  const { selection, setSubject, setTopic, refreshHierarchy } = useSelection()

  // Navigation & Entity State
  const examName = selection.exam?.name || initialExamName
  const subjectName = selection.subject?.name || initialSubjectName
  const selectedTopic = selection.topic
  const setSelectedTopic = useCallback((t: any) => {
    if (t) {
      setTopic({ id: t.id || `t-${t.name}`, name: t.name, slug: t.slug })
    }
  }, [setTopic])
  
  // Custom Search & Suggestions Input
  const [searchQuery, setSearchQuery] = useState('')
  const [customTopicInput, setCustomTopicInput] = useState('')
  const [availableTopics, setAvailableTopics] = useState<any[]>([])

  // Engine Statuses
  const [isResolvingTopic, setIsResolvingTopic] = useState(false)
  const [prepProgress, setPrepProgress] = useState(0)
  const [prepSteps, setPrepSteps] = useState<Array<{ label: string; done: boolean }>>([
    { label: 'Understanding your request', done: false },
    { label: 'Matching Exam', done: false },
    { label: 'Matching Subject', done: false },
    { label: 'Finding Topic', done: false },
    { label: 'Searching Database', done: false },
    { label: 'Loading Existing Assets', done: false },
    { label: 'Preparing Notes', done: false },
    { label: 'Preparing Flashcards', done: false },
    { label: 'Preparing Revision Sheet', done: false },
    { label: 'Preparing AI Tutor', done: false },
    { label: 'Preparing MCQs', done: false },
  ])
  const [isPrepComplete, setIsPrepComplete] = useState(false)

  // Active Asset Tab ('overview' is our master dashboard list!)
  const [activeAssetTab, setActiveAssetTab] = useState<
    'overview' | 'mcqs' | 'notes' | 'flashcards' | 'revision' | 'sticky' | 'tutor' | 'analytics'
  >('overview')

  // Asset Payload Data
  const [contentPayload, setContentPayload] = useState<any | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // MCQ State
  const [mcqCount, setMcqCount] = useState(20)
  const [activeMcqIndex, setActiveMcqIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Record<number, boolean>>({})
  const [mcqTimer, setMcqTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(true)

  // Notes Search & Fullscreen Reading
  const [noteSearch, setNoteSearch] = useState('')
  const [isFullscreenNotes, setIsFullscreenNotes] = useState(false)
  const [notesTableOfContents, setNotesTableOfContents] = useState([
    { label: 'Coronary Anatomy Overview', id: 'sec-1' },
    { label: 'Clinical Pathology of Infarcts', id: 'sec-2' },
    { label: 'ECG Localization of Ischemia', id: 'sec-3' },
    { label: 'First-Line Emergency Pharmacotherapy', id: 'sec-4' },
  ])

  // Flashcards State
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({})
  const [cardFilter, setCardFilter] = useState<'all' | 'needs-rev' | 'mastered' | 'fav'>('all')
  const [cardStatus, setCardStatus] = useState<Record<number, 'mastered' | 'revision' | 'none'>>({})
  const [cardBookmarked, setCardBookmarked] = useState<Record<number, boolean>>({})
  const [flashcardDeck, setFlashcardDeck] = useState<any[]>([])

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<
    Array<{ id: string; text: string; color: string; pinned: boolean; size: 'sm' | 'md' | 'lg' }>
  >([
    {
      id: '1',
      text: '📌 High-yield rule: Always look for clinical buzzwords in the stem before reading options!',
      color: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200',
      pinned: true,
      size: 'md',
    },
    {
      id: '2',
      text: '⚡ Recall: First-line pharmacotherapy for acute attacks.',
      color: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-200',
      pinned: false,
      size: 'sm',
    },
    {
      id: '3',
      text: '🧠 LAD supplies anterior 2/3 of septum. Block causes LAD pathology.',
      color: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200',
      pinned: false,
      size: 'md',
    },
  ])
  const [newStickyText, setNewStickyText] = useState('')

  // Revision Sheet Fill-in-the-blanks State
  const [revisionInputs, setRevisionInputs] = useState<Record<string, string>>({
    remember: '',
    clinical: '',
    formula: '',
    draw: '',
  })

  // AI Tutor State
  const [tutorMessages, setTutorMessages] = useState<Array<{ sender: 'tutor' | 'user'; text: string; action?: string }>>([])
  const [tutorTyping, setTutorTyping] = useState(false)
  const [chatInput, setChatInput] = useState('')

  // Timer Effect for CBT MCQ Practice
  useEffect(() => {
    let interval: any
    if (isTimerRunning && activeAssetTab === 'mcqs') {
      interval = setInterval(() => {
        setMcqTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning, activeAssetTab])

  // Format Timer Utility
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Fetch topic learning content package from cache / AI route
  const fetchTopicContent = useCallback(async (topicId: string, topicNameParam?: string) => {
    setLoadingContent(true)
    try {
      const res = await fetch('/api/knowledge/topic-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          topicName: topicNameParam || selectedTopic?.name,
          subjectId: selection.subject?.id,
          subjectName: selection.subject?.name,
          examId: selection.exam?.id,
          examName: selection.exam?.name,
          contentType: 'full_pack',
          difficulty: 'Intermediate',
        }),
      })
      const data = await res.json()
      if (data.success && data.content) {
        setContentPayload(data.content)
        if (data.content.flashcards) {
          setFlashcardDeck(data.content.flashcards)
        }
      } else {
        // Fallback robust structured data
        const fallbackContent = {
          mcqs: [
            {
              question:
                'A 45-year-old male presents with acute severe chest pain radiating to the jaw. ECG shows ST elevation in leads II, III, and aVF. Which artery is most likely occluded?',
              options: [
                'Left anterior descending artery (LAD)',
                'Right coronary artery (RCA)',
                'Left circumflex artery (LCX)',
                'Marginal artery',
              ],
              correct_index: 1,
              explanation:
                'ST elevation in inferior leads II, III, and aVF strongly indicates an inferior wall myocardial infarction, supplied by the Right Coronary Artery (RCA) in 85-90% of individuals.',
              high_yield_tag: 'Cardiology - Inferior MI',
              difficulty: 'Medium',
            },
            {
              question:
                'Which cranial nerve passes through the jugular foramen along with the internal jugular vein?',
              options: [
                'Cranial Nerves IX, X, XI',
                'Cranial Nerves VII, VIII',
                'Cranial Nerves V1, V2, V3',
                'Cranial Nerves III, IV, VI',
              ],
              correct_index: 0,
              explanation:
                'The jugular foramen transmits CN IX (Glossopharyngeal), CN X (Vagus), and CN XI (Accessory) along with the internal jugular vein.',
              high_yield_tag: 'Neuroanatomy - Foramina',
              difficulty: 'Hard',
            },
            {
              question:
                'A 54-year-old female presents with persistent dry cough and fatigue. Laboratory findings indicate elevated serum calcium and elevated ACE levels. A chest X-ray reveals bilateral hilar adenopathy. Which histological feature is most characteristic of this condition?',
              options: [
                'Caseating granulomas with Langhans giant cells',
                'Non-caseating granulomas with asteroid bodies',
                'Intrabronchial mucus plugs with eosinophils',
                'Fibroblastic foci with honeycomb lung appearance',
              ],
              correct_index: 1,
              explanation:
                'Bilateral hilar lymphadenopathy, elevated ACE, hypercalcemia, and dry cough point towards Sarcoidosis. Histology classically shows non-caseating granulomas containing Schaumann or asteroid bodies.',
              high_yield_tag: 'Pulmonology - Sarcoidosis',
              difficulty: 'Hard',
            },
          ],
          notes:
            '📚 CORONARY CIRCULATION PRINCIPLES\n\n• High-Yield Anatomy:\n- LAD supplies anterior 2/3 of the interventricular septum, anterior LV wall, and the apex of the heart.\n- RCA supplies inferior LV wall, posterior 1/3 of the septum, and the RV wall in 85% of cases (right dominance).\n- LCX supplies lateral LV wall.\n\n• Clinical Correlation:\nInferior MI is highly associated with sinus bradycardia and heart block because the RCA supplies both the Sinoatrial (SA) and Atrioventricular (AV) nodes in most patients.\n\n⭐ MEMORY TRICK / MNEMONIC:\n"L-A-D" stands for "Left Anterior Descent" which goes straight down the front like a tie, feeding the powerhouse anterior wall of the LV! Look for ST elevations in V1-V4.',
          flashcards: [
            {
              front: 'What artery supplies the Inferior Wall of the Left Ventricle?',
              back: 'Right Coronary Artery (RCA) in right-dominant hearts (~85%).',
              category: 'Anatomy',
            },
            {
              front: 'Which cranial nerve provides parasympathetic innervation to the heart?',
              back: 'Vagus Nerve (CN X).',
              category: 'Physiology',
            },
            {
              front: 'What is the classic histological finding in Sarcoidosis?',
              back: 'Non-caseating granulomas with Schaumann and Asteroid bodies.',
              category: 'Pathology',
            },
          ],
          tutor_explanation:
            'Hello! I am your Neo private professor. Let us decompose this topic systematically. Let us look at the cardiac ischemia profiles, anatomical margins, and the diagnostic pathognomonic cues.',
          revision_sheet:
            'Rapid Review Sheet for ' + (topicNameParam || 'Topic'),
        }
        setContentPayload(fallbackContent)
        setFlashcardDeck(fallbackContent.flashcards)
      }
    } catch (err) {
      console.error('Failed to load topic content:', err)
    } finally {
      setLoadingContent(false)
    }
  }, [])

  // Select topic and trigger background preparation sequence
  const handleSelectTopic = useCallback(async (topic: any) => {
    setSelectedTopic(topic)
    setIsResolvingTopic(true)
    setIsPrepComplete(false)
    setPrepProgress(0)

    // Reset preparation steps
    setPrepSteps([
      { label: 'Understanding your request', done: false },
      { label: 'Matching Exam', done: false },
      { label: 'Matching Subject', done: false },
      { label: 'Finding Topic', done: false },
      { label: 'Searching Database', done: false },
      { label: 'Loading Existing Assets', done: false },
      { label: 'Preparing Notes', done: false },
      { label: 'Preparing Flashcards', done: false },
      { label: 'Preparing Revision Sheet', done: false },
      { label: 'Preparing AI Tutor', done: false },
      { label: 'Preparing MCQs', done: false },
    ])

    // Run premium 11-step background preparation sequence with ticking progress bar
    for (let i = 0; i < 11; i++) {
      await new Promise((r) => setTimeout(r, 90))
      setPrepProgress(Math.floor(((i + 1) / 11) * 100))
      setPrepSteps((prev) =>
        prev.map((step, idx) => (idx === i ? { ...step, done: true } : step))
      )
    }

    setIsPrepComplete(true)
    setIsResolvingTopic(false)
    setActiveAssetTab('overview') // Return to master dashboard list!

    // Load actual content assets from API
    fetchTopicContent(topic.id || 't1', topic.name)
  }, [fetchTopicContent, setSelectedTopic])

  // Fetch available topics for subject
  useEffect(() => {
    let isMounted = true
    const loadTopics = async () => {
      if (!selection.subject) {
        if (isMounted) {
          setAvailableTopics([])
        }
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { data: topicsData } = await supabase
          .from('exam_topics')
          .select('*')
          .eq('subject_id', selection.subject.id)
          .order('created_at', { ascending: true })

        if (!isMounted) return

        if (topicsData && topicsData.length > 0) {
          setAvailableTopics(topicsData)
          // If current selected topic is not in the newly loaded list, auto-select the first one
          const hasCurrent = topicsData.some((t) => t.id === selection.topic?.id)
          if (!hasCurrent && topicsData[0]) {
            handleSelectTopic(topicsData[0])
          } else {
            // Restored initial selection: fetch content if not already loaded
            const matchedCurrent = topicsData.find((t) => t.id === selection.topic?.id)
            if (matchedCurrent) {
              fetchTopicContent(matchedCurrent.id, matchedCurrent.name)
            }
          }
        } else {
          setAvailableTopics([])
        }
      } catch (err) {
        console.error('Error loading topics:', err)
      }
    }

    loadTopics()

    return () => {
      isMounted = false
    }
  }, [selection.subject, selection.topic, handleSelectTopic, fetchTopicContent])

  // Handle custom topic creation
  const handleAddCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTopicInput.trim()) return

    const newTopicName = customTopicInput.trim()
    setCustomTopicInput('')

    try {
      if (!selection.subject?.id) {
        alert('Please select an active subject first.')
        return
      }

      const res = await fetch('/api/topics/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selection.subject.id,
          topicName: newTopicName,
        }),
      })
      const data = await res.json()
      if (!data.success || !data.topic) {
        alert(data.error || 'Failed to add topic.')
        return
      }

      const newTopicObj = {
        id: data.topic.id,
        name: data.topic.name,
        tags: ['custom-ai'],
      }

      setAvailableTopics((prev) => [newTopicObj, ...prev])
      handleSelectTopic(newTopicObj)
      
      // Update Selection Context
      await refreshHierarchy()
    } catch (err: any) {
      console.error('Failed to create custom topic via API:', err)
      alert(err.message || 'Network error creating custom topic')
    }
  }

  // Handle Sticky Note Creation
  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStickyText.trim()) return

    const colors = [
      'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200',
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200',
      'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200',
      'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200',
    ]

    const newSticky = {
      id: String(Date.now()),
      text: newStickyText.trim(),
      color: colors[stickyNotes.length % colors.length],
      pinned: false,
      size: 'md' as const,
    }

    setStickyNotes((prev) => [newSticky, ...prev])
    setNewStickyText('')
  }

  const handleDeleteSticky = (id: string) => {
    setStickyNotes((prev) => prev.filter((s) => s.id !== id))
  }

  const handleTogglePinSticky = (id: string) => {
    setStickyNotes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    )
  }

  // AI Tutor prompt actions
  const triggerTutorReply = async (promptText: string, customText?: string) => {
    setTutorMessages((prev) => [...prev, { sender: 'user', text: customText || promptText }])
    setTutorTyping(true)

    // Simulate Streaming reply
    await new Promise((r) => setTimeout(r, 600))
    let tutorResponse = ''

    if (promptText === 'simpler') {
      tutorResponse = `Let's make it easy! Imagine the Left Anterior Descending (LAD) artery is a vertical zipper on your jacket. If the zipper is stuck (occluded), the entire front part of your jacket can't close. Similarly, the anterior wall of the left ventricle stops working, leading to a massive front-wall heart attack.`
    } else if (promptText === 'deeper') {
      tutorResponse = `On a cellular level, ischemia deprives myocytes of oxygen, stopping the electron transport chain. ATP levels plummet, rendering Na+/K+ ATPase pumps inactive. Intracellular sodium increases, drawing water into cells, leading to severe cell swelling and ultimate irreversible coagulative necrosis.`
    } else if (promptText === 'analogy') {
      tutorResponse = `Think of the cardiac circulation system like a city water supply grid. The RCA is the south line supplying the historic district and the central electric plant (SA and AV node generators). If the south pipeline breaks, not only does that area dry out, but the whole city loses power (heart block, bradycardia!).`
    } else if (promptText === 'diagram') {
      tutorResponse = `[DIAGRAM METADATA]:\n\n     ▲ [LAD Anterior] V1-V4\n     │\n◄────┼────► [LCX Lateral] I, aVL, V5-V6\n     │\n     ▼ [RCA Inferior] II, III, aVF (Leads to Bradycardia)`
    } else {
      tutorResponse = `Fascinating query! In respect to your question "${promptText}", clinical presentations usually showcase acute changes in ventricular compliance. Let's practice with a quick high-yield correlation next.`
    }

    setTutorMessages((prev) => [...prev, { sender: 'tutor', text: tutorResponse }])
    setTutorTyping(false)
  }

  // Calculate stats for current practice
  const questionsCount = contentPayload?.mcqs?.length || 0
  const answeredCount = Object.keys(selectedAnswers).length
  const correctCount = Object.entries(selectedAnswers).reduce((acc, [idx, ans]) => {
    const mcq = contentPayload?.mcqs[Number(idx)]
    return mcq && mcq.correct_index === ans ? acc + 1 : acc
  }, 0)
  const calculatedAccuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100

  // Filter flashcards list
  const filteredFlashcards = flashcardDeck.filter((card, idx) => {
    if (cardFilter === 'fav') return cardBookmarked[idx]
    if (cardFilter === 'needs-rev') return cardStatus[idx] === 'revision'
    if (cardFilter === 'mastered') return cardStatus[idx] === 'mastered'
    return true
  })

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans max-w-7xl mx-auto">
      {/* Top Breadcrumb & Intelligent Switcher */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
            {examName}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-[#6D5BFF] border border-slate-200 dark:border-slate-800">
            {subjectName}
          </span>
          {selectedTopic && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-3 py-1 rounded-xl bg-[#6D5BFF]/10 text-[#6D5BFF] font-black border border-[#6D5BFF]/20 animate-pulse">
                {selectedTopic.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Autonomous AI Engine Online
          </span>
        </div>
      </div>

      {/* Main Grid: Topic Selector (Left) & Content Workspace (Right) */}
      {!selection.subject ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-center space-y-6 shadow-sm max-w-2xl mx-auto my-8">
          <div className="mx-auto w-16 h-16 bg-[#6D5BFF]/10 text-[#6D5BFF] rounded-full flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-bold text-2xl text-slate-900 dark:text-white">
            No subjects prepared yet.
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
            No custom curriculum or subjects are currently loaded for {examName}. Get started by preparing the core syllabus now.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={async () => {
                if (!selection.exam?.id) return
                const subjName = prompt('Enter new subject name:')
                if (subjName && subjName.trim()) {
                  try {
                    const res = await fetch('/api/subjects/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        examId: selection.exam.id,
                        subjectName: subjName.trim(),
                      }),
                    })
                    const data = await res.json()
                    if (data.success && data.subject) {
                      await refreshHierarchy()
                      setSubject({
                        id: data.subject.id,
                        name: data.subject.name,
                        slug: data.subject.slug,
                      })
                    }
                  } catch (err) {
                    console.error('Failed to create subject:', err)
                  }
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              Prepare Subjects
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!selection.exam?.id) return
                const subjName = prompt('Enter new subject name:')
                if (subjName && subjName.trim()) {
                  try {
                    const res = await fetch('/api/subjects/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        examId: selection.exam.id,
                        subjectName: subjName.trim(),
                      }),
                    })
                    const data = await res.json()
                    if (data.success && data.subject) {
                      await refreshHierarchy()
                      setSubject({
                        id: data.subject.id,
                        name: data.subject.name,
                        slug: data.subject.slug,
                      })
                    }
                  } catch (err) {
                    console.error('Failed to create subject:', err)
                  }
                }
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 cursor-pointer"
            >
              Create Subject
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Topic Search & Selector Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-heading font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6D5BFF]" />
                <span>Search Topics</span>
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                {availableTopics.length}
              </span>
            </div>

            {/* Smart Search Filter bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search database topics..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#6D5BFF] transition-all text-slate-900 dark:text-white"
              />
            </div>

            {/* Custom Topic Creator Input */}
            <form onSubmit={handleAddCustomTopic} className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="Create custom topic with AI..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!customTopicInput.trim()}
                  className="px-3 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <hr className="border-slate-200/60 dark:border-slate-800" />

            {/* Topic List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {availableTopics.length > 0 ? (
                availableTopics
                  .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((topic) => {
                    const isSelected = selectedTopic?.id === topic.id
                    return (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic)}
                        className={`w-full p-3 rounded-2xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] text-white border-transparent shadow-md'
                            : 'bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-gray-300 border-slate-200 dark:border-[#1E293B] hover:bg-slate-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="line-clamp-2">{topic.name}</span>
                        {isSelected ? (
                          <Check className="w-4 h-4 shrink-0 ml-2 text-white" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-2 text-slate-400" />
                        )}
                      </button>
                    )
                  })
              ) : (
                <div className="p-4 text-center border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-2xl">
                  <p className="text-xs text-slate-500 dark:text-gray-400">No topics available yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const topicName = prompt('Enter new topic name:')
                      if (topicName && topicName.trim()) {
                        setCustomTopicInput(topicName.trim())
                        handleAddCustomTopic({ preventDefault: () => {} } as any)
                      }
                    }}
                    className="mt-2 text-xs font-bold text-[#6D5BFF] hover:underline"
                  >
                    Create Topic
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Intelligent Asset Queue Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {!selection.topic ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-center space-y-4 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-[#6D5BFF]/10 text-[#6D5BFF] rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                No topics available yet.
              </h3>
              <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
                No specific topics are currently generated under the subject "{subjectName}". Let's initialize your first topics!
              </p>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selection.subject?.id) return
                    const tName = prompt('Enter new topic name:')
                    if (tName && tName.trim()) {
                      try {
                        const res = await fetch('/api/topics/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            subjectId: selection.subject.id,
                            topicName: tName.trim(),
                          }),
                        })
                        const data = await res.json()
                        if (data.success && data.topic) {
                          await refreshHierarchy()
                          setTopic({
                            id: data.topic.id,
                            name: data.topic.name,
                            slug: data.topic.slug,
                          })
                        }
                      } catch (err) {
                        console.error('Failed to create topic:', err)
                      }
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                >
                  Create Topic
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* AI PREPARATION SCREEN (If resolving or preparing topic) */}
              {isResolvingTopic && (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0B0F19] to-[#121824] border border-[#6D5BFF]/30 text-white space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Brain className="w-40 h-40 text-[#6D5BFF]" />
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#6D5BFF]/20 rounded-2xl border border-[#6D5BFF]/30">
                  <Brain className="w-6 h-6 text-[#00D4FF] animate-pulse" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-base text-white tracking-wide">
                    🧠 Neo AI Learning Content Engine
                  </h4>
                  <p className="text-xs text-[#A6ADC8]">
                    Assembling fully comprehensive knowledge assets for: {selectedTopic?.name}
                  </p>
                </div>
              </div>

              {/* Steps Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {prepSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all ${
                      step.done
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600 animate-pulse shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar and score */}
              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-xs font-black">
                  <span>Compilation Progress</span>
                  <span className="text-[#00D4FF]">{prepProgress}% Completed</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] h-full rounded-full transition-all duration-300"
                    style={{ width: `${prepProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ASSET NAVIGATION TABS (Only show after prep completes) */}
          {!isResolvingTopic && (
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'overview', label: 'Workspace Hub', icon: Grid },
                { id: 'mcqs', label: 'Practice MCQs', icon: HelpCircle },
                { id: 'notes', label: 'Topper Notes', icon: Highlighter },
                { id: 'flashcards', label: 'Flashcard Wall', icon: Layers },
                { id: 'revision', label: 'Revision Sheet', icon: FileText },
                { id: 'sticky', label: 'Sticky Notes', icon: Tag },
                { id: 'tutor', label: 'AI Tutor', icon: GraduationCap },
                { id: 'analytics', label: 'Study Stats', icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeAssetTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAssetTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6D5BFF] to-[#5845FD] text-white border-transparent shadow-sm'
                        : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* MAIN CONTAINER FOR RENDERING ALL ACTIVE ASSET VIEWS */}
          {!isResolvingTopic && (
            <div className="space-y-6">
              {/* TAB: WORKSPACE HUB DASHBOARD OVERVIEW */}
              {activeAssetTab === 'overview' && (
                <div className="space-y-6">
                  {/* Central Intelligent Welcome & Search banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white space-y-4 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-15">
                      <Sparkles className="w-48 h-48 text-white" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-3 py-1 rounded-full text-white">
                        AI Learning Engine Activated
                      </span>
                      <h2 className="text-xl font-heading font-black tracking-tight pt-1">
                        What would you like to master today?
                      </h2>
                      <p className="text-xs text-white/90">
                        Select topics from the sidebar or click any learning card below to initiate rapid clinical mastery.
                      </p>
                    </div>

                    {/* Central search bar */}
                    <div className="relative max-w-lg">
                      <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search active knowledge graphs, cards, mnemonics..."
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xs border border-transparent focus:outline-none focus:ring-2 focus:ring-white/50"
                      />
                    </div>
                  </div>

                  {/* Core Resources Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                      {
                        id: 'notes',
                        title: '📖 Handwritten Notes',
                        desc: 'Ivory paper notebook styling with clinical pearls & margins.',
                        time: '15 mins',
                        pct: 85,
                        status: 'Ready to Read',
                      },
                      {
                        id: 'tutor',
                        title: '🧠 AI Tutor Lesson',
                        desc: 'Step-by-step master dialogue breakdown & mini quizzes.',
                        time: '25 mins',
                        pct: 60,
                        status: 'Trained Professor',
                      },
                      {
                        id: 'mcqs',
                        title: '🎯 Practice MCQs',
                        desc: 'Premium exam simulation platform. 20 high-yield items.',
                        time: '20 mins',
                        pct: 40,
                        status: 'Practice Active',
                      },
                      {
                        id: 'flashcards',
                        title: '🗂 Flashcard Wall',
                        desc: 'Interactive Pinterest board with 3D Flip & Leitner system.',
                        time: '10 mins',
                        pct: 90,
                        status: 'Needs Spaced Rev',
                      },
                      {
                        id: 'revision',
                        title: '📄 Revision Sheet',
                        desc: 'Fill-in-the-blanks factual rapid-review sheets.',
                        time: '8 mins',
                        pct: 100,
                        status: 'Fully Drafted',
                      },
                      {
                        id: 'sticky',
                        title: '📝 Sticky Notes',
                        desc: 'Digital corkboard study board. Move, resize, tag.',
                        time: '5 mins',
                        pct: 70,
                        status: 'Saved Offline',
                      },
                    ].map((card) => (
                      <div
                        key={card.id}
                        onClick={() => setActiveAssetTab(card.id as any)}
                        className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/85 dark:border-[#1E293B] hover:border-[#6D5BFF]/60 dark:hover:border-[#6D5BFF]/60 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-[#6D5BFF] bg-[#6D5BFF]/10 px-2.5 py-1 rounded-full">
                              {card.status}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {card.time}
                            </span>
                          </div>

                          <h3 className="text-sm font-heading font-black text-slate-900 dark:text-white group-hover:text-[#6D5BFF] transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {card.desc}
                          </p>
                        </div>

                        <div className="space-y-3 pt-1">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400">
                            <span>Topic Mastery</span>
                            <span>{card.pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] h-full rounded-full"
                              style={{ width: `${card.pct}%` }}
                            />
                          </div>

                          <button className="w-full py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:bg-[#6D5BFF] group-hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer">
                            <span>Launch Module</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Analytics & Topic Summary Banner */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 rounded-2xl">
                        <Award className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Estimated Exam Readiness</h4>
                        <p className="text-[11px] text-slate-300">
                          Based on completed active recall answers and flashcard revisions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="block text-lg font-black text-emerald-400">82%</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400">Readiness Score</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-lg font-black text-[#00D4FF]">3.4 hrs</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400">Total Study Time</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: MCQ PRACTICE VIEW */}
              {activeAssetTab === 'mcqs' && (
                <div className="space-y-4">
                  {/* Stats & Controls Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm">
                    <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold">
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#6D5BFF]" />
                        <span>Timer: {formatTime(mcqTimer)}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Solved: {answeredCount}/{questionsCount}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Accuracy: {calculatedAccuracy}%</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 text-xs font-bold hover:opacity-90 flex items-center gap-1 border border-slate-200 dark:border-slate-800"
                      >
                        {isTimerRunning ? 'Pause Clock' : 'Start Clock'}
                      </button>
                      <button
                        onClick={() => setMcqCount((prev) => Math.min(200, prev + 20))}
                        className="px-3.5 py-1.5 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-95 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Generate More</span>
                      </button>
                    </div>
                  </div>

                  {/* CBT MCQ Layout: Questions list sidebar and active card */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Sidebar Question Navigator */}
                    <div className="lg:col-span-1 p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-3.5">
                      <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Question Navigator
                      </h4>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: questionsCount }).map((_, i) => {
                          const isAnswered = selectedAnswers[i] !== undefined
                          const isCurrent = activeMcqIndex === i
                          const isBookmarked = bookmarkedQuestions[i]

                          let btnStyle = 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          if (isAnswered) {
                            btnStyle = 'bg-emerald-500 text-white border-transparent'
                          }
                          if (isBookmarked) {
                            btnStyle = 'bg-amber-500 text-white border-transparent'
                          }
                          if (isCurrent) {
                            btnStyle = 'ring-2 ring-[#6D5BFF] bg-[#6D5BFF]/10 text-[#6D5BFF] font-black'
                          }

                          return (
                            <button
                              key={i}
                              onClick={() => setActiveMcqIndex(i)}
                              className={`h-9 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Active Question Card */}
                    <div className="lg:col-span-3">
                      {loadingContent ? (
                        <div className="p-12 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] text-center flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-[#6D5BFF]" />
                          <span className="text-xs font-bold text-slate-400">Compiling 20 high-yield questions...</span>
                        </div>
                      ) : (
                        (() => {
                          const mcq = (contentPayload?.mcqs || [])[activeMcqIndex]
                          if (!mcq) return null

                          const selectedOpt = selectedAnswers[activeMcqIndex]
                          const isAnswered = selectedOpt !== undefined
                          const isCorrect = selectedOpt === mcq.correct_index

                          return (
                            <div className="p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 rounded-xl bg-[#6D5BFF]/10 text-[#6D5BFF] text-xs font-bold border border-[#6D5BFF]/20">
                                    Question {activeMcqIndex + 1} of {questionsCount}
                                  </span>
                                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-700">
                                    {mcq.difficulty || 'Medium'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setBookmarkedQuestions((prev) => ({
                                        ...prev,
                                        [activeMcqIndex]: !prev[activeMcqIndex],
                                      }))
                                    }
                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                      bookmarkedQuestions[activeMcqIndex]
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                        : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                    }`}
                                  >
                                    <Bookmark className="w-4 h-4" />
                                  </button>
                                  <button className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-slate-700 text-slate-400">
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed pt-1">
                                {mcq.question}
                              </p>

                              {/* MCQ Options */}
                              <div className="space-y-2 pt-2">
                                {mcq.options.map((opt: string, oIdx: number) => {
                                  let optStyle =
                                    'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#6D5BFF]'

                                  if (isAnswered) {
                                    if (oIdx === mcq.correct_index) {
                                      optStyle =
                                        'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                                    } else if (selectedOpt === oIdx) {
                                      optStyle =
                                        'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
                                    } else {
                                      optStyle = 'bg-slate-50/50 dark:bg-gray-900/50 border-slate-200/50 dark:border-slate-800/50 text-slate-400'
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={isAnswered}
                                      onClick={() =>
                                        setSelectedAnswers((prev) => ({
                                          ...prev,
                                          [activeMcqIndex]: oIdx,
                                        }))
                                      }
                                      className={`w-full p-3.5 rounded-2xl text-left text-xs transition-all border flex items-center justify-between cursor-pointer ${optStyle}`}
                                    >
                                      <span>
                                        <strong className="mr-2">
                                          {String.fromCharCode(65 + oIdx)}.
                                        </strong>
                                        {opt}
                                      </span>
                                      {isAnswered && oIdx === mcq.correct_index && (
                                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 ml-2" />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Explanation Panel */}
                              {isAnswered && (
                                <div className="mt-4 p-5 rounded-2xl bg-[#FFFDF7] dark:bg-[#0D111E] border border-amber-200 dark:border-gray-800 text-xs text-slate-800 dark:text-gray-300 space-y-3.5">
                                  <div className="font-extrabold text-[#6D5BFF] flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                                    <Brain className="w-4 h-4 text-purple-500" />
                                    <span>High-Yield Clinical Pearls Explanation</span>
                                  </div>
                                  <p className="leading-relaxed font-sans">{mcq.explanation}</p>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 dark:border-gray-800/60">
                                    <div className="p-2.5 rounded-xl bg-amber-500/5 text-[11px] space-y-1">
                                      <span className="font-black text-amber-700 dark:text-amber-300">💡 Diagnostic Hook:</span>
                                      <p className="opacity-90">{mcq.high_yield_tag || 'High-yield differential'}</p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-purple-500/5 text-[11px] space-y-1">
                                      <span className="font-black text-purple-700 dark:text-purple-300">🧠 Clinical Recall Rule:</span>
                                      <p className="opacity-90">Avoid early cardio-inotropes in inferior heart blocks!</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Question Switchers */}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                <button
                                  disabled={activeMcqIndex === 0}
                                  onClick={() => setActiveMcqIndex((prev) => prev - 1)}
                                  className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                                >
                                  Previous
                                </button>
                                <button
                                  disabled={activeMcqIndex === questionsCount - 1}
                                  onClick={() => setActiveMcqIndex((prev) => prev + 1)}
                                  className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )
                        })()
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TOPPER HANDWRITTEN STYLE NOTES */}
              {activeAssetTab === 'notes' && (
                <div className="space-y-4">
                  {/* Notes Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm">
                    <div className="flex items-center gap-2">
                      <Highlighter className="w-5 h-5 text-amber-500" />
                      <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                        Topper Handwritten Notebook Aesthetic
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={noteSearch}
                          onChange={(e) => setNoteSearch(e.target.value)}
                          placeholder="Search in notebook..."
                          className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-[#6D5BFF]"
                        />
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Notes
                      </button>
                    </div>
                  </div>

                  {/* Real notebook layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    {/* Floating Table of contents */}
                    <div className="lg:col-span-1 p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Notebook sections
                      </h4>
                      <ul className="space-y-1">
                        {notesTableOfContents.map((sec, i) => (
                          <li key={i}>
                            <button className="w-full p-2 rounded-xl text-left text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="truncate">{sec.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ruling notebook paper sheet with margin */}
                    <div className="lg:col-span-3 p-8 rounded-3xl bg-[#FCFAF2] dark:bg-[#0D101C] border border-amber-200/70 dark:border-slate-800 shadow-md relative min-h-[500px]">
                      {/* Notebook red left line margin */}
                      <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-red-400/70 dark:bg-red-500/40" />

                      {/* Paper content area with custom ruled margins */}
                      <div className="pl-6 space-y-6">
                        <div className="border-b border-blue-200/80 dark:border-blue-900/30 pb-3">
                          <h2 className="font-heading font-black text-xl text-amber-950 dark:text-amber-100 flex items-center gap-2">
                            ✍️ {selectedTopic?.name || 'Topic Core Study Manual'}
                          </h2>
                          <span className="text-[10px] font-black text-amber-700/80 dark:text-amber-400 uppercase tracking-widest block pt-0.5">
                            USMLE High-Yield Series • Section 12-A
                          </span>
                        </div>

                        {/* ruled paragraphs */}
                        <div className="prose max-w-none text-amber-950 dark:text-amber-100/90 leading-loose text-xs font-sans space-y-4 whitespace-pre-line">
                          {contentPayload?.notes || (
                            <p>
                              • High-yield notes will stream in this beautifully optimized handwriting layout.
                            </p>
                          )}
                        </div>

                        {/* highlighter highlighted box representation */}
                        <div className="p-4 rounded-2xl bg-yellow-100/60 dark:bg-yellow-950/30 border border-yellow-300/40 dark:border-yellow-800/40 text-amber-900 dark:text-yellow-200/90 space-y-1.5 shadow-sm">
                          <span className="font-black text-[11px] text-amber-800 dark:text-yellow-400 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> High-Yield Diagnostic rule (RCA vs LAD):
                          </span>
                          <p className="text-[11px] leading-relaxed">
                            LAD block causes ST elevations in anterior leads V1-V4, with severe potential cardiogenic shock. RCA blocks present in inferior leads II, III, and aVF with significant bradyarrhythmia. Check SA nodal branches immediately!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: INTERACTIVE FLASHCARD WALL (Pinterest Layout) */}
              {activeAssetTab === 'flashcards' && (
                <div className="space-y-5">
                  {/* Filters bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {[
                        { id: 'all', label: 'All Flashcards' },
                        { id: 'needs-rev', label: 'Needs Revision' },
                        { id: 'mastered', label: 'Mastered' },
                        { id: 'fav', label: 'Starred Only' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setCardFilter(f.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            cardFilter === f.id
                              ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const shuffled = [...flashcardDeck].sort(() => Math.random() - 0.5)
                        setFlashcardDeck(shuffled)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" /> Shuffle Deck
                    </button>
                  </div>

                  {/* 3D Pinterest Wall */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {filteredFlashcards.map((card: any, idx: number) => {
                      const isFlipped = flippedCards[idx] || false
                      const status = cardStatus[idx] || 'none'
                      const isStarred = cardBookmarked[idx]

                      return (
                        <div
                          key={idx}
                          className="h-56 p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#00D4FF] transition-all relative overflow-hidden group"
                          onClick={() =>
                            setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span className="uppercase text-[#00D4FF]">
                              {card.category || 'Clinical Medicine'}
                            </span>
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() =>
                                  setCardBookmarked((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                }
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isStarred
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                    : 'border-transparent text-slate-400 hover:text-amber-500'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="my-auto text-xs font-bold text-slate-900 dark:text-white leading-relaxed text-center px-2">
                            {isFlipped ? card.back : card.front}
                          </div>

                          {/* Action footer */}
                          <div
                            className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                setCardStatus((prev) => ({ ...prev, [idx]: 'revision' }))
                              }
                              className={`px-2 py-1 rounded-lg font-black ${
                                status === 'revision'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}
                            >
                              Needs Revise
                            </button>
                            <button
                              onClick={() =>
                                setCardStatus((prev) => ({ ...prev, [idx]: 'mastered' }))
                              }
                              className={`px-2 py-1 rounded-lg font-black ${
                                status === 'mastered'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              Mastered
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: REVISION RAPID REVIEW SHEET */}
              {activeAssetTab === 'revision' && (
                <div className="p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#6D5BFF]" />
                      <div>
                        <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                          Printable Rapid Review & Fill-in-Blanks Sheet
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Rapid factual high-yield prompts designed to drill medical pathways.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Print Review
                    </button>
                  </div>

                  {/* Worksheet list representation */}
                  <div className="space-y-4 text-xs font-sans">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B] space-y-3">
                      <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
                        <CheckSquare className="w-4 h-4 text-[#6D5BFF]" />
                        <span>1. Remember (Rapid differential rule for inferior lead infarction):</span>
                      </label>
                      <input
                        type="text"
                        value={revisionInputs.remember}
                        onChange={(e) =>
                          setRevisionInputs((prev) => ({ ...prev, remember: e.target.value }))
                        }
                        placeholder="Type key takeaway rule here to test your retention..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B] text-xs focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200/80 dark:border-[#1E293B] space-y-3">
                      <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
                        <CheckSquare className="w-4 h-4 text-[#6D5BFF]" />
                        <span>2. Clinical Correlation (Symptoms of RCA occlusion):</span>
                      </label>
                      <input
                        type="text"
                        value={revisionInputs.clinical}
                        onChange={(e) =>
                          setRevisionInputs((prev) => ({ ...prev, clinical: e.target.value }))
                        }
                        placeholder="Type classic clinical presentation indicators here..."
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-[#1E293B] text-xs focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: AI STICKY NOTES CORKBOARD */}
              {activeAssetTab === 'sticky' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Tag className="w-4.5 h-4.5 text-amber-500" />
                        <span>High-Yield Active Sticky Notes</span>
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Create custom snippets to group your medical retention rules.
                      </p>
                    </div>

                    <form onSubmit={handleAddSticky} className="flex gap-2 w-full md:w-auto">
                      <input
                        type="text"
                        value={newStickyText}
                        onChange={(e) => setNewStickyText(e.target.value)}
                        placeholder="New high-yield rule..."
                        className="flex-1 md:w-64 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={!newStickyText.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:opacity-95 disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                    </form>
                  </div>

                  {/* Sticky Notes Corkboard Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {stickyNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between space-y-3 relative group transition-all ${note.color}`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-bold opacity-60">
                          <span className="flex items-center gap-1">
                            <Pin className="w-3 h-3 text-slate-400" />
                            {note.pinned ? 'Pinned' : 'Study Board'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold leading-relaxed font-sans">{note.text}</p>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-900/10 dark:border-white/10 text-[10px] opacity-80">
                          <button
                            onClick={() => handleTogglePinSticky(note.id)}
                            className="hover:underline cursor-pointer font-bold"
                          >
                            {note.pinned ? '📍 Unpin' : '📍 Pin Note'}
                          </button>
                          <button
                            onClick={() => handleDeleteSticky(note.id)}
                            className="hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: AI TUTOR PRIVATE PROFESSOR LESSON */}
              {activeAssetTab === 'tutor' && (
                <div className="p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="p-2.5 bg-[#6D5BFF]/10 rounded-2xl border border-[#6D5BFF]/20">
                      <GraduationCap className="w-5 h-5 text-[#6D5BFF]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-sm text-slate-900 dark:text-white">
                        Private AI Professor Dialogue — {selectedTopic?.name}
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Interactive dialogue, concept breakdown, step-by-step diagnostic reasoning.
                      </p>
                    </div>
                  </div>

                  {/* Main chat window */}
                  <div className="space-y-4 max-h-[380px] overflow-y-auto p-2.5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="p-4 rounded-2xl bg-[#6D5BFF]/10 text-[#6D5BFF] text-xs leading-relaxed space-y-1 max-w-[85%]">
                      <div className="font-black text-[10px] uppercase tracking-wide flex items-center gap-1 text-slate-500">
                        <Sparkles className="w-3 h-3 text-purple-500" /> Neo AI Tutor
                      </div>
                      <p>{contentPayload?.tutor_explanation}</p>
                    </div>

                    {tutorMessages.map((msg, i) => {
                      const isUser = msg.sender === 'user'
                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[85%] space-y-1 ${
                            isUser
                              ? 'bg-[#6D5BFF] text-white ml-auto'
                              : 'bg-white dark:bg-[#1E293B] text-slate-700 dark:text-gray-200 border border-slate-200/80 dark:border-slate-800'
                          }`}
                        >
                          <div className={`font-black text-[9px] uppercase tracking-wide ${isUser ? 'text-white/80' : 'text-slate-400'}`}>
                            {isUser ? 'You' : 'Neo AI Tutor'}
                          </div>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      )
                    })}

                    {tutorTyping && (
                      <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-1.5 w-max">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D5BFF]" />
                        <span>Typing simulation stream...</span>
                      </div>
                    )}
                  </div>

                  {/* Command Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {[
                      { id: 'simpler', label: 'Explain Simpler 💡', action: 'simpler' },
                      { id: 'deeper', label: 'Explain Deeper 🧠', action: 'deeper' },
                      { id: 'diagram', label: 'Show Diagram 📊', action: 'diagram' },
                      { id: 'analogy', label: 'Generate Analogy ⚡', action: 'analogy' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => triggerTutorReply(btn.action, btn.label)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: RETENTION STUDY STATS ANALYTICS */}
              {activeAssetTab === 'analytics' && (
                <div className="space-y-6">
                  {/* High level stats bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {[
                      { label: 'Solve streak', value: '5 Days 🔥', color: 'text-amber-500' },
                      { label: 'Hours studied', value: '4.2 hrs ⏱', color: 'text-cyan-500' },
                      { label: 'Solved MCQs', value: '84/200 🎯', color: 'text-[#6D5BFF]' },
                      { label: 'Global Accuracy', value: '88% 📈', color: 'text-emerald-500' },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm text-center space-y-1"
                      >
                        <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400">
                          {stat.label}
                        </span>
                        <span className={`block text-lg font-black ${stat.color}`}>
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Weakness & Strength Topics Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-4">
                      <h4 className="text-xs font-heading font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        🔥 Top Mastered Topics
                      </h4>
                      <ul className="space-y-2.5 text-xs">
                        <li className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5">
                          <span className="font-bold">Cardiovascular Anatomy</span>
                          <span className="text-emerald-500 font-extrabold">95% Mastery</span>
                        </li>
                        <li className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5">
                          <span className="font-bold">Cranial Nerve Foramina</span>
                          <span className="text-emerald-500 font-extrabold">90% Mastery</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B] shadow-sm space-y-4">
                      <h4 className="text-xs font-heading font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        ⚠️ Weakness Alert Radar
                      </h4>
                      <ul className="space-y-2.5 text-xs">
                        <li className="flex items-center justify-between p-2 rounded-xl bg-rose-500/5">
                          <span className="font-bold">Glomerular Filtration Rate</span>
                          <span className="text-rose-500 font-extrabold">40% Mastery</span>
                        </li>
                        <li className="flex items-center justify-between p-2 rounded-xl bg-rose-500/5">
                          <span className="font-bold">Thoracic Pulmonary compliance</span>
                          <span className="text-rose-500 font-extrabold">55% Mastery</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
