'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Layers,
  ExternalLink,
  Trash2,
  Edit2,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  X,
  Tags,
} from 'lucide-react'

export function AdminSubjectsManager() {
  const [subjects, setSubjects] = useState<any[]>([])
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
    name: '',
    description: '',
    weight_percentage: '10',
    aliases: '',
  })

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchQuery) queryParams.set('search', searchQuery)
      if (selectedExamId !== 'all') queryParams.set('examId', selectedExamId)

      const res = await fetch(`/api/admin/subjects?${queryParams.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSubjects(data.subjects || [])
        setExams(data.exams || [])
        if (!formData.exam_id && data.exams?.length > 0) {
          setFormData((prev) => ({ ...prev, exam_id: data.exams[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedExamId])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')

    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create subject')
        return
      }

      setIsCreateOpen(false)
      setFormData({
        exam_id: exams[0]?.id || '',
        name: '',
        description: '',
        weight_percentage: '10',
        aliases: '',
      })
      fetchSubjects()
    } catch (err: any) {
      setFormError(err.message || 'Server error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return
    try {
      const res = await fetch(`/api/admin/subjects?id=${subjectId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchSubjects()
      } else {
        alert(data.error || 'Failed to delete subject')
      }
    } catch (err) {
      console.error('Delete subject error:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#6D5BFF]" />
            <span>Subjects Taxonomy</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Canonical subject mapping across board exams (e.g. Pathology, Biochemistry, Cardiology).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubjects}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Subject</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search subjects by name or slug..."
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
            <option value="all">All Canonical Exams</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
            <span className="text-xs font-semibold">Loading canonical subjects...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No subjects found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Subject Name & Slug</th>
                  <th className="px-4 py-3.5">Parent Canonical Exam</th>
                  <th className="px-4 py-3.5">Weight %</th>
                  <th className="px-4 py-3.5">Topics Count</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60 font-medium">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/subjects/${sub.id}`} className="font-extrabold text-slate-900 dark:text-white text-sm hover:text-[#6D5BFF] flex items-center gap-1.5">
                        <span>{sub.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        /{sub.slug}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-700 dark:text-gray-300">
                      {sub.exam_name}
                    </td>

                    <td className="px-4 py-4 font-extrabold text-[#6D5BFF]">
                      {sub.weight_percentage}%
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 font-bold text-slate-700 dark:text-gray-300">
                        {sub.topic_count} Topics
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/subjects/${sub.id}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Subject Modal */}
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
                  <BookOpen className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Create Subject Entity
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

              <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Select Parent Canonical Exam *
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
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biochemistry & Medical Genetics"
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
                    rows={2}
                    placeholder="Scope of medical/clinical topics covered..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Syllabus Weight %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight_percentage}
                    onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Search Aliases (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. biochem, biochemistry, medical genetics"
                    value={formData.aliases}
                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
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
                    <span>Create Subject</span>
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
