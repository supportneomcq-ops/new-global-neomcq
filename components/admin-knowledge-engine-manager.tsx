'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  RefreshCw,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BookOpen,
  Layers,
  ArrowRight,
  Database,
  Search,
} from 'lucide-react'

export function AdminKnowledgeEngineManager() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Merge modal state
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeSuccess, setMergeSuccess] = useState<any | null>(null)
  const [mergeError, setMergeError] = useState('')

  const [mergeForm, setMergeForm] = useState({
    entity_type: 'exam',
    source_id: '',
    target_id: '',
  })

  const fetchKnowledgeData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge')
      const json = await res.json()
      if (json.success) {
        setData(json)
        if (json.exams?.length >= 2) {
          setMergeForm({
            entity_type: 'exam',
            source_id: json.exams[1].id,
            target_id: json.exams[0].id,
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch knowledge engine stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKnowledgeData()
  }, [fetchKnowledgeData])

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mergeForm.source_id === mergeForm.target_id) {
      setMergeError('Source and Target entity cannot be identical.')
      return
    }

    setMerging(true)
    setMergeError('')
    setMergeSuccess(null)

    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge_entities',
          ...mergeForm,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setMergeError(json.error || 'Failed to merge entities')
        return
      }

      setMergeSuccess(json)
      fetchKnowledgeData()
    } catch (err: any) {
      setMergeError(err.message || 'Server error')
    } finally {
      setMerging(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D5BFF]" />
        <span className="text-xs font-semibold">Loading Knowledge Engine AI status...</span>
      </div>
    )
  }

  const { stats, duplicates, exams } = data || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#6D5BFF]" />
            <span>Knowledge Engine & Entity Resolution</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Smart matching, duplicate entity detection, and zero-data-loss canonical merging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchKnowledgeData}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>

          <button
            onClick={() => {
              setMergeSuccess(null)
              setMergeError('')
              setIsMergeOpen(true)
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <GitMerge className="w-4 h-4" />
            <span>Launch Merge Tool</span>
          </button>
        </div>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Canonical Exams</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats?.examsCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Canonical Subjects</div>
          <div className="text-2xl font-black text-[#6D5BFF] mt-1">
            {stats?.subjectsCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Canonical Topics</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {stats?.topicsCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Recognized Synonyms</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {stats?.aliasesCount || 0}
          </div>
        </div>
      </div>

      {/* Duplicate Candidates Panel */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-heading font-extrabold text-slate-900 dark:text-white">
              AI Duplicate Candidates Flagged
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {duplicates?.length || 0} Similarity Pairs
          </span>
        </div>

        {duplicates?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <span>Canonical taxonomy clean! No duplicate exam entities detected.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {duplicates?.map((dup: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white">{dup.exam1.name}</span>
                    <span className="text-slate-400 font-mono text-[10px] block">/{dup.exam1.slug}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white">{dup.exam2.name}</span>
                    <span className="text-slate-400 font-mono text-[10px] block">/{dup.exam2.slug}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 font-bold font-mono">
                    {dup.similarity}% Similarity
                  </span>
                  <button
                    onClick={() => {
                      setMergeForm({
                        entity_type: 'exam',
                        source_id: dup.exam2.id,
                        target_id: dup.exam1.id,
                      })
                      setIsMergeOpen(true)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#6D5BFF] text-white font-extrabold text-[11px] flex items-center gap-1 hover:bg-[#5b4aee]"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merge Modal */}
      <AnimatePresence>
        {isMergeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Merge Entity Resolution
                  </h2>
                </div>
                <button
                  onClick={() => setIsMergeOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400"
                >
                  &times;
                </button>
              </div>

              {mergeError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{mergeError}</span>
                </div>
              )}

              {mergeSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Entities Merged Successfully!</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Migrated {mergeSuccess.migratedSubjects || 0} subjects and {mergeSuccess.migratedEnrollments || 0} user enrollments to target entity. Source entity archived.
                  </p>
                  <button
                    onClick={() => setIsMergeOpen(false)}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-white font-extrabold w-full"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMerge} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Source Duplicate Exam (Will be merged and archived) *
                    </label>
                    <select
                      required
                      value={mergeForm.source_id}
                      onChange={(e) => setMergeForm({ ...mergeForm, source_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    >
                      {exams?.map((ex: any) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} (/{ex.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-center text-slate-400">
                    <ArrowRight className="w-5 h-5 rotate-90" />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Target Canonical Exam (Will retain all data) *
                    </label>
                    <select
                      required
                      value={mergeForm.target_id}
                      onChange={(e) => setMergeForm({ ...mergeForm, target_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    >
                      {exams?.map((ex: any) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} (/{ex.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-gray-900 text-slate-500 text-[11px] font-semibold space-y-1">
                    <div className="font-bold text-slate-700 dark:text-gray-300">Safety Guarantee:</div>
                    <p>All enrolled learners, subjects, and study sessions will be safely transferred to the target canonical entity.</p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMergeOpen(false)}
                      className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-extrabold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={merging}
                      className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold flex items-center gap-2 hover:bg-[#5b4aee] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {merging && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Execute Merge</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
