'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ArrowLeft,
  Edit,
  Save,
  Trash2,
  Plus,
  Users,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  BarChart2,
  Tags,
} from 'lucide-react'

export function AdminExamDetailView({ examId }: { examId: string }) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'aliases' | 'users' | 'analytics'>('overview')

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    difficulty: 'Adaptive',
    question_count: '100',
    time_limit_mins: '120',
    official_website: '',
    status: 'active',
  })

  // New Alias State
  const [newAlias, setNewAlias] = useState('')
  const [addingAlias, setAddingAlias] = useState(false)

  // New Subject State
  const [newSubjectName, setNewSubjectName] = useState('')
  const [addingSubject, setAddingSubject] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/exams/${examId}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        setEditForm({
          name: json.exam?.name || '',
          description: json.exam?.description || '',
          difficulty: json.exam?.difficulty || 'Adaptive',
          question_count: String(json.exam?.question_count || 100),
          time_limit_mins: String(json.exam?.time_limit_mins || 120),
          official_website: json.exam?.official_website || '',
          status: json.exam?.status || 'active',
        })
      }
    } catch (err) {
      console.error('Failed to fetch exam detail:', err)
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          ...editForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchDetail()
        alert('Exam updated successfully!')
      } else {
        alert(json.error || 'Failed to update exam')
      }
    } catch (err: any) {
      alert(err.message || 'Server error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlias.trim()) return
    setAddingAlias(true)
    try {
      const res = await fetch('/api/admin/aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: 'exam',
          entity_id: examId,
          alias: newAlias.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewAlias('')
        fetchDetail()
      } else {
        alert(json.error || 'Failed to add alias')
      }
    } catch (err: any) {
      alert(err.message || 'Server error')
    } finally {
      setAddingAlias(false)
    }
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return
    setAddingSubject(true)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          name: newSubjectName.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewSubjectName('')
        fetchDetail()
      } else {
        alert(json.error || 'Failed to create subject')
      }
    } catch (err: any) {
      alert(err.message || 'Server error')
    } finally {
      setAddingSubject(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D5BFF]" />
        <span className="text-xs font-semibold">Loading exam details...</span>
      </div>
    )
  }

  if (!data || !data.exam) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-bold text-sm">Exam not found or unavailable.</p>
        <Link href="/admin/exams" className="px-4 py-2 bg-slate-200 dark:bg-gray-800 rounded-xl text-xs font-bold">
          &larr; Back to Exams
        </Link>
      </div>
    )
  }

  const { exam, subjects, aliases, enrolledUsers, analytics } = data

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                {exam.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                exam.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
              }`}>
                {exam.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Canonical Slug: /{exam.slug} • ID: {exam.id}
            </p>
          </div>
        </div>

        <button
          onClick={fetchDetail}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors w-fit"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Learners</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {analytics?.enrolledCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Subjects / Topics</div>
          <div className="text-2xl font-black text-[#6D5BFF] mt-1">
            {subjects?.length || 0} / {subjects?.reduce((acc: number, s: any) => acc + (s.exam_topics?.length || 0), 0) || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Questions Solved</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            {analytics?.questionsSolved || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Learner Accuracy</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {analytics?.accuracy || 0}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-gray-800 text-xs font-bold gap-6">
        {(['overview', 'subjects', 'aliases', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors cursor-pointer border-b-2 ${
              activeTab === tab
                ? 'border-[#6D5BFF] text-[#6D5BFF]'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <form onSubmit={handleSaveExam} className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Exam Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Target Questions</label>
              <input
                type="number"
                value={editForm.question_count}
                onChange={(e) => setEditForm({ ...editForm, question_count: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Time Limit (mins)</label>
              <input
                type="number"
                value={editForm.time_limit_mins}
                onChange={(e) => setEditForm({ ...editForm, time_limit_mins: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Official Website</label>
              <input
                type="text"
                value={editForm.official_website}
                onChange={(e) => setEditForm({ ...editForm, official_website: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold flex items-center gap-2 hover:bg-[#5b4aee] transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <form onSubmit={handleAddSubject} className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex items-center gap-3">
            <input
              type="text"
              placeholder="Add new subject under this exam..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
            <button
              type="submit"
              disabled={addingSubject || !newSubjectName.trim()}
              className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {addingSubject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Subject</span>
            </button>
          </form>

          <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {subjects.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No subjects configured under this exam yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
                {subjects.map((sub: any) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                    <div>
                      <Link href={`/admin/subjects/${sub.id}`} className="font-extrabold text-slate-900 dark:text-white hover:text-[#6D5BFF]">
                        {sub.name}
                      </Link>
                      <div className="text-[10px] text-slate-400 font-mono">
                        /{sub.slug} • Weight: {sub.weight_percentage}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-[11px]">
                        {sub.exam_topics?.length || 0} Topics
                      </span>
                      <Link href={`/admin/subjects/${sub.id}`} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'aliases' && (
        <div className="space-y-4">
          <form onSubmit={handleAddAlias} className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex items-center gap-3">
            <input
              type="text"
              placeholder="Add search alias (e.g. step1, step 1, usmle step 1)..."
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
            <button
              type="submit"
              disabled={addingAlias || !newAlias.trim()}
              className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {addingAlias ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Alias</span>
            </button>
          </form>

          <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase">Configured Recognition Aliases</div>
            <div className="flex flex-wrap gap-2">
              {aliases.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No search aliases configured yet.</span>
              ) : (
                aliases.map((al: any) => (
                  <span key={al.id} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white font-mono text-xs font-bold flex items-center gap-2">
                    <Tags className="w-3 h-3 text-[#6D5BFF]" />
                    <span>"{al.alias}"</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {enrolledUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              No learners enrolled in this exam yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
              {enrolledUsers.map((ue: any) => (
                <div key={ue.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] flex items-center justify-center font-bold">
                      {ue.profiles?.first_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {ue.profiles?.first_name || 'User'} {ue.profiles?.last_name || ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{ue.profiles?.email || ue.user_id}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Enrolled {new Date(ue.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
