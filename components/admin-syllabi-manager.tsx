'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react'

export function AdminSyllabiManager() {
  const [syllabi, setSyllabi] = useState<any[]>([])
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
    title: '',
    version_year: '2026',
    document_url: '',
    description: '',
    is_active: true,
  })

  const fetchSyllabi = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (searchQuery) queryParams.set('search', searchQuery)
      if (selectedExamId !== 'all') queryParams.set('examId', selectedExamId)

      const res = await fetch(`/api/admin/syllabi?${queryParams.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSyllabi(data.syllabi || [])
        setExams(data.exams || [])
        if (!formData.exam_id && data.exams?.length > 0) {
          setFormData((prev) => ({ ...prev, exam_id: data.exams[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch syllabi:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedExamId])

  useEffect(() => {
    fetchSyllabi()
  }, [fetchSyllabi])

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')

    try {
      const res = await fetch('/api/admin/syllabi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create syllabus')
        return
      }

      setIsCreateOpen(false)
      setFormData({
        exam_id: exams[0]?.id || '',
        title: '',
        version_year: '2026',
        document_url: '',
        description: '',
        is_active: true,
      })
      fetchSyllabi()
    } catch (err: any) {
      setFormError(err.message || 'Server error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSyllabus = async (id: string) => {
    if (!confirm('Are you sure you want to delete this syllabus document?')) return
    try {
      const res = await fetch(`/api/admin/syllabi?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchSyllabi()
      }
    } catch (err) {
      console.error('Delete syllabus error:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#6D5BFF]" />
            <span>Exam Syllabi & Content Outlines</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage official syllabus documents, year versions, and curriculum guidelines across board exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSyllabi}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Syllabus Document</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search syllabi by title..."
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
            <span className="text-xs font-semibold">Loading official syllabi...</span>
          </div>
        ) : syllabi.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No official syllabus outlines created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Syllabus Title</th>
                  <th className="px-4 py-3.5">Parent Exam</th>
                  <th className="px-4 py-3.5">Version Year</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60 font-medium">
                {syllabi.map((syl) => (
                  <tr key={syl.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {syl.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {syl.description || 'No description provided'}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-bold text-slate-800 dark:text-gray-200">
                      {syl.exams?.name || 'Canonical Exam'}
                    </td>

                    <td className="px-4 py-4 font-extrabold text-[#6D5BFF]">
                      {syl.version_year}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        syl.is_active
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {syl.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {syl.document_url && (
                          <a
                            href={syl.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl text-[#6D5BFF] hover:bg-[#6D5BFF]/10 transition-colors"
                            title="Open Official Syllabus Document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteSyllabus(syl.id)}
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
                  <FileText className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Add Syllabus Document
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

              <form onSubmit={handleCreateSyllabus} className="space-y-4 text-xs">
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
                    Syllabus Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. USMLE Content Outline 2026 Edition"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Version Year
                    </label>
                    <input
                      type="text"
                      value={formData.version_year}
                      onChange={(e) => setFormData({ ...formData, version_year: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Document / PDF URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://usmle.org/outline.pdf"
                      value={formData.document_url}
                      onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Description & Scope
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Official curriculum changes, high-yield organ systems covered..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    <span>Add Syllabus</span>
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
