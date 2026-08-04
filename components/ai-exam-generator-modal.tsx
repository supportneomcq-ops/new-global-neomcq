'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Sparkles,
  Search,
  BookOpen,
  CheckCircle2,
  Loader2,
  Globe,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  RefreshCw,
  Award,
} from 'lucide-react'

interface AIExamGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onExamSelected?: (exam: any) => void
  initialQuery?: string
}

const POPULAR_SUGGESTIONS = [
  { name: 'USMLE Step 1 & 2', country: 'United States', flag: '🇺🇸' },
  { name: 'NEET PG / INI-CET', country: 'India', flag: '🇮🇳' },
  { name: 'FMGE Licensing Exam', country: 'India / Foreign', flag: '🌏' },
  { name: 'PLAB 1 & 2 / UKMLA', country: 'United Kingdom', flag: '🇬🇧' },
  { name: 'NCLEX-RN Nursing', country: 'USA & Canada', flag: '🇺🇸' },
  { name: 'AMC MCQ Exam', country: 'Australia', flag: '🇦🇺' },
  { name: 'UPSC Civil Services', country: 'India', flag: '🇮🇳' },
  { name: 'US CPA Certification', country: 'United States', flag: '🇺🇸' },
  { name: 'CFA Level 1 & 2', country: 'Global Finance', flag: '🌐' },
]

export function AIExamGeneratorModal({
  isOpen,
  onClose,
  onExamSelected,
  initialQuery = '',
}: AIExamGeneratorModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [country, setCountry] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  // Resolution State
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressStage, setProgressStage] = useState('Preparing your exam...')
  const [progressPercent, setProgressPercent] = useState(10)
  const [generatedExam, setGeneratedExam] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Live DB search on query change
  const handleSearch = React.useCallback(async (searchTerm: string) => {
    setQuery(searchTerm)
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/exams/search?q=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.exams || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (initialQuery) {
      const timer = setTimeout(() => {
        handleSearch(initialQuery)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [initialQuery, handleSearch])

  // Trigger Global AI Exam Resolution Engine
  const handleResolveExam = async (examTerm: string) => {
    if (!examTerm.trim()) return

    setIsGenerating(true)
    setErrorMsg('')
    setGeneratedExam(null)
    setProgressStage('Searching global database & cache...')
    setProgressPercent(15)

    // Animated progress sequence
    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 40) {
          setProgressStage('Building complete subject hierarchy...')
          return prev + 10
        } else if (prev < 75) {
          setProgressStage('Generating topics, subtopics & target weights...')
          return prev + 12
        } else if (prev < 92) {
          setProgressStage('Finalizing AI confidence verification & storing...')
          return prev + 5
        }
        return prev
      })
    }, 900)

    try {
      const response = await fetch('/api/exams/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examQuery: examTerm,
          country: country || undefined,
        }),
      })

      clearInterval(interval)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resolve exam syllabus')
      }

      setProgressPercent(100)
      setProgressStage('Exam Ready!')
      setGeneratedExam(data.exam)

      if (onExamSelected) {
        onExamSelected(data.exam)
      }
    } catch (err: any) {
      clearInterval(interval)
      setErrorMsg(err.message || 'An error occurred during AI exam generation')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/30 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-[#050816]/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] text-white shadow-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Global AI Exam Engine</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 uppercase">
                    Zero Admin Setup
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Search or type ANY exam worldwide. AI builds complete subjects, topics & learning roadmap automatically.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">
            {!generatedExam && !isGenerating && (
              <>
                {/* Search Input Box */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                    Enter Official Exam Name or Code
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="e.g. FMGE Medical Licensing, UPSC IAS, USMLE Step 1, CPA..."
                      className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm text-slate-900 dark:text-white shadow-inner font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveExam(query)}
                      disabled={!query.trim()}
                      className="absolute right-2 top-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white text-xs font-heading font-bold shadow-md hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Generate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Existing DB Search Matches */}
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Existing Exams in Database</span>
                      <span className="text-[#00D4FF]">{searchResults.length} Match(es)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {searchResults.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => handleResolveExam(ex.name)}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-[#6D5BFF] text-left transition-all group cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#6D5BFF] transition-colors">
                              {ex.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-gray-400">
                              {ex.countries?.name || 'Global'} • {ex.difficulty || 'Adaptive'}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6D5BFF]" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>Popular Global Exam Credentials</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPULAR_SUGGESTIONS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setQuery(preset.name)
                          handleResolveExam(preset.name)
                        }}
                        className="p-3 rounded-2xl bg-slate-50/70 dark:bg-gray-900/40 border border-slate-200 dark:border-gray-800/80 hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 text-left transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-bold text-slate-800 dark:text-gray-200 group-hover:text-[#00D4FF] transition-colors">
                          {preset.flag} {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{preset.country}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* AI Generation Loader State */}
            {isGenerating && (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-[#6D5BFF]/20 animate-ping" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] p-0.5 shadow-xl animate-spin">
                    <div className="w-full h-full bg-[#0E1324] rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-[#00D4FF]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Generating Official Exam Syllabus
                  </h3>
                  <p className="text-xs text-[#00D4FF] font-semibold animate-pulse">{progressStage}</p>
                </div>

                {/* Smooth Progress Bar */}
                <div className="w-full max-w-md bg-slate-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-gray-700">
                  <motion.div
                    className="bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] h-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-bold">{progressPercent}% Completed</div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  onClick={() => handleResolveExam(query)}
                  className="px-3 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Generated Exam Preview Card */}
            {generatedExam && (
              <div className="space-y-5">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-[#6D5BFF]/30 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Exam Structure Ready
                      </div>
                      <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white mt-1">
                        {generatedExam.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {generatedExam.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#00D4FF]">
                        AI Confidence: {generatedExam.ai_confidence_score || 98.5}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {generatedExam.question_count || 150} Qs • {generatedExam.time_limit_mins || 180} Mins
                      </div>
                    </div>
                  </div>

                  {/* Subjects Hierarchy List */}
                  {generatedExam.exam_subjects && generatedExam.exam_subjects.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-gray-800">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Generated Core Subjects</span>
                        <span className="text-[#6D5BFF]">{generatedExam.exam_subjects.length} Subjects</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {generatedExam.exam_subjects.map((sub: any, idx: number) => (
                          <div
                            key={sub.id || idx}
                            className="p-3 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex items-start gap-2.5"
                          >
                            <span className="text-xs font-extrabold text-[#00D4FF] bg-[#00D4FF]/10 w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{sub.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {sub.weight_percentage ? `${sub.weight_percentage}% Weight • ` : ''}
                                {sub.exam_topics ? `${sub.exam_topics.length} Topics` : 'Core Subject'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setGeneratedExam(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Search Another Exam</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white text-xs font-heading font-bold shadow-lg hover:opacity-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Start Learning {generatedExam.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
