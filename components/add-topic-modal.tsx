'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  BookOpen,
  Plus,
  Search,
  Lock,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { useSelection, SelectedItem } from '@/lib/context/selection-context'

interface AddTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onTopicSelected?: (subject: SelectedItem, topic: SelectedItem) => void
}

export function AddTopicModal({ isOpen, onClose, onTopicSelected }: AddTopicModalProps) {
  const {
    selection,
    availableSubjects,
    availableTopics,
    setSubject,
    setTopic,
    refreshHierarchy,
    isExamLocked,
  } = useSelection()

  const activeExam = selection.exam

  // Local Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('')
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('')

  // Topic List with Metadata
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [subjectTopics, setSubjectTopics] = useState<any[]>([])

  // Custom Topic Creation State
  const [showCreateCustom, setShowCreateCustom] = useState(false)
  const [customTopicName, setCustomTopicName] = useState('')
  const [customTopicDesc, setCustomTopicDesc] = useState('')
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null)

  // Sync initial subject
  useEffect(() => {
    if (selection.subject?.id) {
      setSelectedSubjectId(selection.subject.id)
    } else if (availableSubjects.length > 0) {
      setSelectedSubjectId(availableSubjects[0].id)
    }
  }, [selection.subject, availableSubjects])

  // Fetch topics and metadata when subject changes
  useEffect(() => {
    if (!activeExam?.id || !selectedSubjectId) return

    let isMounted = true
    setLoadingTopics(true)

    fetch(`/api/topics/search?examId=${activeExam.id}&subjectId=${selectedSubjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && Array.isArray(data.topics)) {
            setSubjectTopics(data.topics)
          } else {
            setSubjectTopics([])
          }
          setLoadingTopics(false)
        }
      })
      .catch((err) => {
        console.error('Error fetching subject topics:', err)
        if (isMounted) setLoadingTopics(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeExam?.id, selectedSubjectId])

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return availableSubjects
    return availableSubjects.filter((s) =>
      s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase())
    )
  }, [availableSubjects, subjectSearchQuery])

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    if (!topicSearchQuery.trim()) return subjectTopics
    return subjectTopics.filter((t) =>
      t.name.toLowerCase().includes(topicSearchQuery.toLowerCase())
    )
  }, [subjectTopics, topicSearchQuery])

  // Selected subject item
  const currentSubjectItem = availableSubjects.find((s) => s.id === selectedSubjectId)

  // Handle selecting an existing topic
  const handleSelectExistingTopic = (t: any) => {
    if (!currentSubjectItem) return

    const subjItem: SelectedItem = {
      id: currentSubjectItem.id,
      name: currentSubjectItem.name,
      slug: currentSubjectItem.slug,
    }

    const topicItem: SelectedItem = {
      id: t.id,
      name: t.name,
      slug: t.slug || t.id,
      description: t.description,
    }

    setSubject(subjItem)
    setTopic(topicItem)

    if (onTopicSelected) {
      onTopicSelected(subjItem, topicItem)
    }

    onClose()
  }

  // Handle Creating / Requesting a New Topic
  const handleCreateNewTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTopicName.trim() || !selectedSubjectId || !activeExam?.id) return

    setCreatingTopic(true)
    setCreateError(null)
    setCreateSuccessMessage(null)

    try {
      const res = await fetch('/api/topics/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam.id,
          subjectId: selectedSubjectId,
          topicName: customTopicName.trim(),
          description: customTopicDesc.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (data.success && data.topic) {
        setCreateSuccessMessage(data.message || 'Topic created successfully!')
        await refreshHierarchy()

        if (currentSubjectItem) {
          const subjItem: SelectedItem = {
            id: currentSubjectItem.id,
            name: currentSubjectItem.name,
            slug: currentSubjectItem.slug,
          }
          const newTopicItem: SelectedItem = {
            id: data.topic.id,
            name: data.topic.name,
            slug: data.topic.slug || data.topic.id,
            description: data.topic.description,
          }

          setSubject(subjItem)
          setTopic(newTopicItem)

          setTimeout(() => {
            if (onTopicSelected) {
              onTopicSelected(subjItem, newTopicItem)
            }
            onClose()
          }, 800)
        }
      } else {
        setCreateError(data.error || 'Failed to create topic')
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error creating topic')
    } finally {
      setCreatingTopic(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Add / Study Exam Topic
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Select a topic in your active exam to practice MCQs, flashcards, and notes.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Exam Lock Banner */}
          <div className="px-6 py-3 bg-gradient-to-r from-[#6D5BFF]/10 via-[#00D4FF]/5 to-transparent border-b border-slate-200 dark:border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-gray-400">Your Exam:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#141A33] border border-[#6D5BFF]/30 text-xs font-black text-[#6D5BFF] dark:text-[#00D4FF]">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                {activeExam?.name || 'Active Exam'}
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              15-Day Auto-Refresh Active
            </span>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                1. Select Subject in {activeExam?.name}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredSubjects.map((s) => {
                  const isSelected = s.id === selectedSubjectId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubjectId(s.id)
                        setShowCreateCustom(false)
                        setCreateError(null)
                      }}
                      className={`p-2.5 rounded-2xl text-left border transition-all text-xs font-bold truncate cursor-pointer ${
                        isSelected
                          ? 'bg-[#6D5BFF] text-white border-[#6D5BFF] shadow-md'
                          : 'bg-slate-50 dark:bg-gray-900/60 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-[#6D5BFF]/40'
                      }`}
                    >
                      <span className="block truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Topic Selection / Search */}
            {!showCreateCustom ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                    2. Select Topic under {currentSubjectItem?.name || 'Subject'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustom(true)
                      setCustomTopicName(topicSearchQuery)
                    }}
                    className="text-xs font-extrabold text-[#6D5BFF] dark:text-[#00D4FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Request / Add New Topic
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={topicSearchQuery}
                    onChange={(e) => setTopicSearchQuery(e.target.value)}
                    placeholder={`Search topics in ${currentSubjectItem?.name || 'this subject'}...`}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                {/* Topic Cards List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {loadingTopics ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
                      <span>Loading high-yield topics...</span>
                    </div>
                  ) : filteredTopics.length > 0 ? (
                    filteredTopics.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectExistingTopic(t)}
                        className="group p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 hover:border-[#6D5BFF] hover:bg-slate-100/80 dark:hover:bg-[#141A33] transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-heading font-extrabold text-slate-900 dark:text-white group-hover:text-[#6D5BFF] dark:group-hover:text-[#00D4FF] transition-colors">
                              {t.name}
                            </span>
                            {t.isRecentlyRefreshed && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> +5 NEW MCQs
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-gray-400">
                            <span className="flex items-center gap-1 font-semibold">
                              <FileText className="w-3 h-3 text-[#6D5BFF]" /> {t.totalMcqs || 5} Questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {t.isRecentlyRefreshed ? 'Auto-Refreshed' : '15-Day Auto-Sync'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 group-hover:bg-[#6D5BFF] text-slate-700 dark:text-gray-200 group-hover:text-white text-xs font-bold border border-slate-200 dark:border-gray-700 transition-all flex items-center gap-1 shadow-sm"
                        >
                          <span>Study</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-3 bg-slate-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-gray-800">
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        No matching topics found for "{topicSearchQuery}".
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateCustom(true)
                          setCustomTopicName(topicSearchQuery)
                        }}
                        className="px-4 py-2 rounded-xl bg-[#6D5BFF] hover:bg-[#5B4AEB] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create "{topicSearchQuery}" Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Create / Request Topic Form */
              <form onSubmit={handleCreateNewTopic} className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300">
                    Create / Request New Study Topic
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustom(false)
                      setCreateError(null)
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    ← Back to Topic List
                  </button>
                </div>

                {createError && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {createSuccessMessage && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{createSuccessMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                    Topic Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customTopicName}
                    onChange={(e) => setCustomTopicName(e.target.value)}
                    placeholder="e.g. Coronary Artery Anomalies, CRISPR Therapeutics, Insolvency Code"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6D5BFF]"
                  />
                  <p className="text-[11px] text-slate-400">
                    Scoped to {activeExam?.name} &gt; {currentSubjectItem?.name}.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                    Description or Key Focus Areas (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customTopicDesc}
                    onChange={(e) => setCustomTopicDesc(e.target.value)}
                    placeholder="e.g. Focus on high-yield ECG interpretations, surgical landmarks, and first-line drugs..."
                    className="w-full px-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustom(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTopic || !customTopicName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] hover:opacity-90 disabled:opacity-50 text-white text-xs font-heading font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    {creatingTopic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating &amp; Initializing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Create &amp; Start Studying</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
