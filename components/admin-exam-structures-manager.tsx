'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SlidersHorizontal,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Clock,
  Layers,
  Award,
} from 'lucide-react'

export function AdminExamStructuresManager() {
  const [structures, setStructures] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExamId, setSelectedExamId] = useState<string>('all')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    exam_id: '',
    title: 'Standard Board Blueprint',
    total_blocks: '7',
    questions_per_block: '40',
    time_per_block_mins: '60',
    passing_score: '196',
    scoring_method: 'Scaled Score (1-300)',
    is_active: true,
  })

  const fetchStructures = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchQuery) queryParams.set('search', searchQuery)
      if (selectedExamId !== 'all') queryParams.set('examId', selectedExamId)

      const res = await fetch(`/api/admin/exam-structures?${queryParams.toString()}`)
      const data = await res.json()
      if (data.success) {
        setStructures(data.structures || [])
        setExams(data.exams || [])
        if (!formData.exam_id && data.exams?.length > 0) {
          setFormData((prev) => ({ ...prev, exam_id: data.exams[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch exam structures:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedExamId])

  useEffect(() => {
    fetchStructures()
  }, [fetchStructures])

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')

    try {
      const res = await fetch('/api/admin/exam-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create exam structure')
        return
      }

      setIsCreateOpen(false)
      setFormData({
        exam_id: exams[0]?.id || '',
        title: 'Standard Board Blueprint',
        total_blocks: '7',
        questions_per_block: '40',
        time_per_block_mins: '60',
        passing_score: '196',
        scoring_method: 'Scaled Score (1-300)',
        is_active: true,
      })
      fetchStructures()
    } catch (err: any) {
      setFormError(err.message || 'Server error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this structure blueprint?')) return
    try {
      const res = await fetch(`/api/admin/exam-structures?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchStructures()
      }
    } catch (err) {
      console.error('Delete structure error:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-[#6D5BFF]" />
            <span>Exam Structures & Blueprints</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Define block counts, time limits per block, question distribution, and passing cutoffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStructures}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Blueprint</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search structure blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none max-w-[220px]"
          >
            <option value="all">All Board Exams</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
            <span className="text-xs font-semibold">Loading exam blueprints...</span>
          </div>
        ) : structures.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No exam structures configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Blueprint Title</th>
                  <th className="px-4 py-3.5">Exam</th>
                  <th className="px-4 py-3.5">Blocks & Items</th>
                  <th className="px-4 py-3.5">Timing per Block</th>
                  <th className="px-4 py-3.5">Passing Score</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60 font-medium">
                {structures.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {st.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {st.scoring_method}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-800 dark:text-gray-200">
                      {st.exams?.name || 'Exam Blueprint'}
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 font-bold text-slate-700 dark:text-gray-300">
                        {st.total_blocks} Blocks ({st.questions_per_block} Qs/block)
                      </span>
                    </td>

                    <td className="px-4 py-4 font-bold text-[#6D5BFF] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{st.time_per_block_mins} mins</span>
                    </td>

                    <td className="px-4 py-4 font-extrabold text-emerald-500">
                      {st.passing_score}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteStructure(st.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Create Exam Structure Blueprint
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
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateStructure} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Select Exam *
                  </label>
                  <select
                    required
                    value={formData.exam_id}
                    onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Blueprint Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Total Blocks
                    </label>
                    <input
                      type="number"
                      value={formData.total_blocks}
                      onChange={(e) => setFormData({ ...formData, total_blocks: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Questions / Block
                    </label>
                    <input
                      type="number"
                      value={formData.questions_per_block}
                      onChange={(e) => setFormData({ ...formData, questions_per_block: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Mins / Block
                    </label>
                    <input
                      type="number"
                      value={formData.time_per_block_mins}
                      onChange={(e) => setFormData({ ...formData, time_per_block_mins: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Passing Score Cutoff
                    </label>
                    <input
                      type="text"
                      value={formData.passing_score}
                      onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Scoring Method
                    </label>
                    <input
                      type="text"
                      value={formData.scoring_method}
                      onChange={(e) => setFormData({ ...formData, scoring_method: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 font-extrabold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold flex items-center gap-2 hover:bg-[#5b4aee] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Create Blueprint</span>
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
