'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Plus,
  ShieldCheck,
  Globe,
  Award,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  Users,
  BookOpen,
  Layers,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

export function AdminExamsManager() {
  const [exams, setExams] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    archivedExams: 0,
    pendingReviewCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Create Exam Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [duplicateMatch, setDuplicateMatch] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty: 'Adaptive',
    question_count: '100',
    time_limit_mins: '120',
    official_website: '',
    is_featured: false,
    aliases: '',
  })

  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchQuery) queryParams.set('search', searchQuery)
      if (statusFilter !== 'all') queryParams.set('status', statusFilter)

      const res = await fetch(`/api/admin/exams?${queryParams.toString()}`)
      const data = await res.json()
      if (data.success) {
        setExams(data.exams || [])
        setStats(data.stats || {})
      }
    } catch (err) {
      console.error('Failed to load admin exams:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')
    setDuplicateMatch(null)

    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create exam')
        if (data.duplicate) {
          setDuplicateMatch(data.duplicate)
        }
        return
      }

      // Success
      setIsCreateOpen(false)
      setFormData({
        name: '',
        description: '',
        difficulty: 'Adaptive',
        question_count: '100',
        time_limit_mins: '120',
        official_website: '',
        is_featured: false,
        aliases: '',
      })
      fetchExams()
    } catch (err: any) {
      setFormError(err.message || 'Server error')
    } finally {
      setCreating(false)
    }
  }

  const handleArchiveExam = async (examId: string) => {
    if (!confirm('Are you sure you want to archive this exam?')) return
    setUpdatingId(examId)
    try {
      const res = await fetch(`/api/admin/exams?id=${examId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchExams()
      }
    } catch (err) {
      console.error('Archive error:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#6D5BFF]" />
            <span>Exam Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage canonical exams, global regions, structure mappings, and study asset pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExams}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md shadow-[#6D5BFF]/20 flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {/* Top Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Canonical Exams</div>
          <div className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">
            {stats.totalExams}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Exams</div>
          <div className="text-2xl font-heading font-black text-emerald-500 mt-1">
            {stats.activeExams}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</div>
          <div className="text-2xl font-heading font-black text-amber-500 mt-1">
            {stats.pendingReviewCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archived</div>
          <div className="text-2xl font-heading font-black text-slate-400 mt-1">
            {stats.archivedExams}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search exams by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Exams Data Table */}
      <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
            <span className="text-xs font-semibold">Loading canonical exams...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No exams found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Exam Name & Slug</th>
                  <th className="px-4 py-3.5">Country / Category</th>
                  <th className="px-4 py-3.5">Taxonomy Breakdown</th>
                  <th className="px-4 py-3.5">Learners</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60 font-medium">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                        <Link href={`/admin/exams/${exam.id}`} className="hover:text-[#6D5BFF] transition-colors flex items-center gap-1.5">
                          <span>{exam.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        {exam.is_featured && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        /{exam.slug}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span>{exam.countries?.flag_emoji || '🌐'}</span>
                        <span className="font-semibold text-slate-700 dark:text-gray-300">
                          {exam.countries?.name || 'Global'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {exam.exam_categories?.name || 'Medical Board'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-[11px] font-bold">
                          <BookOpen className="w-3 h-3 text-[#6D5BFF]" />
                          <span>{exam.subject_count || 0} Subjects</span>
                        </span>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-[11px] font-bold">
                          <Layers className="w-3 h-3 text-emerald-500" />
                          <span>{exam.topic_count || 0} Topics</span>
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-gray-200">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>{exam.user_count || 0} Enrolled</span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {exam.verification_status === 'verified' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        ) : exam.verification_status === 'outdated' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Clock className="w-3 h-3" />
                            Outdated
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            Needs Verification
                          </span>
                        )}

                        {exam.status === 'archived' || exam.status === 'inactive' ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            Inactive
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Manage
                        </Link>

                        {exam.status !== 'archived' && (
                          <button
                            onClick={() => handleArchiveExam(exam.id)}
                            disabled={updatingId === exam.id}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Archive Exam"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Create Canonical Exam
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{formError}</span>
                  </div>
                  {duplicateMatch && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/5 text-[11px] text-red-400">
                      Existing Canonical Entity: <strong>{duplicateMatch.name}</strong> ({duplicateMatch.slug})
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Canonical Exam Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. USMLE Step 1 & 2 CK"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief summary of exam scope and target medical audience..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Target Questions
                    </label>
                    <input
                      type="number"
                      value={formData.question_count}
                      onChange={(e) => setFormData({ ...formData, question_count: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.time_limit_mins}
                      onChange={(e) => setFormData({ ...formData, time_limit_mins: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Search Aliases (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. step1, step 1, usmle step 1, step2, step 2 ck"
                    value={formData.aliases}
                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-extrabold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold flex items-center gap-2 hover:bg-[#5b4aee] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Create Exam</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
