'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tags,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react'

export function AdminAliasesManager() {
  const [aliases, setAliases] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    examAliasesCount: 0,
    subjectAliasesCount: 0,
    topicAliasesCount: 0,
  })
  const [exams, setExams] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    entity_type: 'exam',
    entity_id: '',
    alias: '',
    source: 'Manual Admin',
    status: 'approved',
  })

  const fetchAliases = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (typeFilter !== 'all') queryParams.set('type', typeFilter)
      if (statusFilter !== 'all') queryParams.set('status', statusFilter)
      if (searchQuery) queryParams.set('search', searchQuery)

      const res = await fetch(`/api/admin/aliases?${queryParams.toString()}`)
      const data = await res.json()
      if (data.success) {
        setAliases(data.aliases || [])
        setStats(data.stats || {})
        setExams(data.exams || [])
        setSubjects(data.subjects || [])
        setTopics(data.topics || [])

        if (!formData.entity_id) {
          if (formData.entity_type === 'exam' && data.exams?.length > 0) {
            setFormData((prev) => ({ ...prev, entity_id: data.exams[0].id }))
          } else if (formData.entity_type === 'subject' && data.subjects?.length > 0) {
            setFormData((prev) => ({ ...prev, entity_id: data.subjects[0].id }))
          } else if (formData.entity_type === 'topic' && data.topics?.length > 0) {
            setFormData((prev) => ({ ...prev, entity_id: data.topics[0].id }))
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch aliases:', err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchAliases()
  }, [fetchAliases])

  const handleTypeChange = (type: string) => {
    let defaultId = ''
    if (type === 'exam' && exams.length > 0) defaultId = exams[0].id
    if (type === 'subject' && subjects.length > 0) defaultId = subjects[0].id
    if (type === 'topic' && topics.length > 0) defaultId = topics[0].id
    setFormData({ ...formData, entity_type: type, entity_id: defaultId })
  }

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError('')

    try {
      const res = await fetch('/api/admin/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Failed to create alias')
        return
      }

      setIsCreateOpen(false)
      setFormData({
        entity_type: 'exam',
        entity_id: exams[0]?.id || '',
        alias: '',
        source: 'Manual Admin',
        status: 'approved',
      })
      fetchAliases()
    } catch (err: any) {
      setFormError(err.message || 'Server error')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStatus = async (aliasId: string, entity_type: string, status: string) => {
    try {
      const res = await fetch('/api/admin/aliases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, entity_type, status }),
      })
      const data = await res.json()
      if (data.success) {
        fetchAliases()
      }
    } catch (err) {
      console.error('Update status error:', err)
    }
  }

  const handleDeleteAlias = async (aliasId: string, entity_type: string) => {
    if (!confirm('Are you sure you want to delete this alias mapping?')) return
    try {
      const res = await fetch(`/api/admin/aliases?id=${aliasId}&type=${entity_type}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchAliases()
      }
    } catch (err) {
      console.error('Delete alias error:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tags className="w-6 h-6 text-[#6D5BFF]" />
            <span>Search Aliases & Entity Synonyms</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Map informal queries and regional abbreviations (e.g. "Step 1", "FMGE", "Biochem") to canonical board entities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAliases}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 hover:opacity-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Alias Mapping</span>
          </button>
        </div>
      </div>

      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Aliases</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Exam Aliases</div>
          <div className="text-2xl font-black text-[#6D5BFF] mt-1">
            {stats.examAliasesCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Subject Aliases</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {stats.subjectAliasesCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Topic Aliases</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {stats.topicAliasesCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search alias strings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Entity Types</option>
            <option value="exam">Exams</option>
            <option value="subject">Subjects</option>
            <option value="topic">Topics</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
            <span className="text-xs font-semibold">Loading search aliases...</span>
          </div>
        ) : aliases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No search alias mappings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Alias String</th>
                  <th className="px-4 py-3.5">Entity Type</th>
                  <th className="px-4 py-3.5">Canonical Target Entity</th>
                  <th className="px-4 py-3.5">Source & Confidence</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/60 font-medium">
                {aliases.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white text-sm">
                      "{al.alias}"
                    </td>

                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        al.entity_type === 'exam'
                          ? 'bg-purple-500/10 text-purple-500'
                          : al.entity_type === 'subject'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {al.entity_type}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-extrabold text-slate-800 dark:text-gray-200">
                      {al.canonical_name}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-slate-700 dark:text-gray-300 font-bold">{al.source || 'Manual'}</div>
                      <div className="text-[10px] text-emerald-500 font-mono">{al.confidence || 100}% confidence</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        al.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : al.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {al.status || 'Approved'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {al.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(al.id, al.entity_type, 'approved')}
                            className="p-1.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="Approve Alias"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {al.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(al.id, al.entity_type, 'disabled')}
                            className="p-1.5 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Disable Alias"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAlias(al.id, al.entity_type)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete Alias"
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
                  <Tags className="w-5 h-5 text-[#6D5BFF]" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                    Add Search Alias Mapping
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

              <form onSubmit={handleCreateAlias} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  >
                    <option value="exam">Exam Alias</option>
                    <option value="subject">Subject Alias</option>
                    <option value="topic">Topic Alias</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Select Target Canonical Entity *
                  </label>
                  <select
                    required
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
                  >
                    {formData.entity_type === 'exam' &&
                      exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    {formData.entity_type === 'subject' &&
                      subjects.map((su) => (
                        <option key={su.id} value={su.id}>
                          {su.name} ({su.exams?.name})
                        </option>
                      ))}
                    {formData.entity_type === 'topic' &&
                      topics.map((to) => (
                        <option key={to.id} value={to.id}>
                          {to.name} ({to.exam_subjects?.name})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Alias String *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. step 1, fmge, biochem, heart attack"
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
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
                    <span>Add Alias</span>
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
