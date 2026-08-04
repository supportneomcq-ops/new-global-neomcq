'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  Sparkles,
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
} from 'lucide-react'

export function AdminExamsManager() {
  const [exams, setExams] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalExams: 0,
    aiGeneratedCount: 0,
    pendingReviewCount: 0,
    autoApprovedCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'auto_approved' | 'pending_review' | 'approved' | 'archived'>('all')
  const [selectedExam, setSelectedExam] = useState<any | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchExams = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/exams')
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
  }, [])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        await fetchExams()
      }
    }
    load()
    return () => { isMounted = false }
  }, [fetchExams])

  const handleUpdateStatus = async (examId: string, approval_status: string) => {
    setUpdatingId(examId)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, approval_status }),
      })
      const data = await res.json()
      if (data.success) {
        fetchExams()
      }
    } catch (err) {
      console.error('Update status error:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || e.approval_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Managed Exams</div>
          <div className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">
            {stats.totalExams}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-[#00D4FF]/30 shadow-sm">
          <div className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Generated
          </div>
          <div className="text-2xl font-heading font-black text-[#00D4FF] mt-1">
            {stats.aiGeneratedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-emerald-500/30 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto Approved
          </div>
          <div className="text-2xl font-heading font-black text-emerald-500 mt-1">
            {stats.autoApprovedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-amber-500/30 shadow-sm">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </div>
          <div className="text-2xl font-heading font-black text-amber-500 mt-1">
            {stats.pendingReviewCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam syllabus..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'auto_approved', 'pending_review', 'approved', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#6D5BFF] text-white shadow'
                  : 'bg-white dark:bg-[#0E1324] text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}

          <button
            onClick={fetchExams}
            className="p-2 rounded-xl bg-white dark:bg-[#0E1324] text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-gray-800 shrink-0 cursor-pointer"
            title="Refresh exams list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Exams Data Table */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
          <span className="text-xs font-semibold">Loading Global AI Exams...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-white dark:bg-[#0E1324] rounded-2xl border border-slate-200 dark:border-gray-800">
          <AlertCircle className="w-8 h-8 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
          <div className="text-sm font-bold">No exams found matching your filter</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0E1324] rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Exam Name & Code</th>
                  <th className="p-4">Origin / Country</th>
                  <th className="p-4">AI Score</th>
                  <th className="p-4">Subjects</th>
                  <th className="p-4">Approval Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{exam.name}</span>
                        {exam.created_by_ai && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#00D4FF]/10 text-[#00D4FF]">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{exam.slug}</div>
                    </td>

                    <td className="p-4 text-slate-600 dark:text-gray-300 font-medium">
                      {exam.countries?.flag_emoji} {exam.countries?.name || 'Global'}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-[#6D5BFF] dark:text-[#00D4FF]">
                        {exam.ai_confidence_score || 98.5}%
                      </span>
                    </td>

                    <td className="p-4 font-semibold text-slate-700 dark:text-gray-300">
                      {exam.exam_subjects?.length || 0} Subjects
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                          exam.approval_status === 'approved' || exam.approval_status === 'auto_approved'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : exam.approval_status === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {exam.approval_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exam.approval_status === 'pending_review' && (
                          <button
                            onClick={() => handleUpdateStatus(exam.id, 'approved')}
                            disabled={updatingId === exam.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:opacity-90 cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedExam(exam)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          View Syllabus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Exam Hierarchy Drawer / Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                  {selectedExam.name}
                </h3>
                <p className="text-xs text-slate-400">{selectedExam.description}</p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-gray-800 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase">
                Generated Subjects ({selectedExam.exam_subjects?.length || 0})
              </div>

              <div className="space-y-2">
                {selectedExam.exam_subjects?.map((sub: any) => (
                  <div key={sub.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{sub.name}</span>
                      <span className="text-[#00D4FF]">{sub.weight_percentage}%</span>
                    </div>
                    {sub.exam_topics && sub.exam_topics.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-gray-400 flex flex-wrap gap-1">
                        {sub.exam_topics.map((t: any) => (
                          <span key={t.id} className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
