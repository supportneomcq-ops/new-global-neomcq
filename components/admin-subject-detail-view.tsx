'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ArrowLeft,
  Save,
  Plus,
  Layers,
  ExternalLink,
  RefreshCw,
  Loader2,
  Trash2,
  Tags,
} from 'lucide-react'

export function AdminSubjectDetailView({ subjectId }: { subjectId: string }) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'aliases'>('overview')

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    weight_percentage: '10',
  })

  // New Topic State
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)

  // New Alias State
  const [newAlias, setNewAlias] = useState('')
  const [addingAlias, setAddingAlias] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/subjects/${subjectId}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        setEditForm({
          name: json.subject?.name || '',
          description: json.subject?.description || '',
          weight_percentage: String(json.subject?.weight_percentage || 10),
        })
      }
    } catch (err) {
      console.error('Failed to fetch subject detail:', err)
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          ...editForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchDetail()
        alert('Subject updated successfully!')
      } else {
        alert(json.error || 'Failed to update subject')
      }
    } catch (err: any) {
      alert(err.message || 'Server error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTopicName.trim()) return
    setAddingTopic(true)
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
          name: newTopicName.trim(),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewTopicName('')
        fetchDetail()
      } else {
        alert(json.error || 'Failed to create topic')
      }
    } catch (err: any) {
      alert(err.message || 'Server error')
    } finally {
      setAddingTopic(false)
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
          entity_type: 'subject',
          entity_id: subjectId,
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

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D5BFF]" />
        <span className="text-xs font-semibold">Loading subject details...</span>
      </div>
    )
  }

  if (!data || !data.subject) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-bold text-xs">Subject not found.</p>
        <Link href="/admin/subjects" className="px-4 py-2 bg-slate-200 dark:bg-gray-800 rounded-xl text-xs font-bold">
          &larr; Back to Subjects
        </Link>
      </div>
    )
  }

  const { subject, topics, aliases, analytics } = data

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/subjects"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>

          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              {subject.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Parent Exam: <strong className="text-slate-700 dark:text-gray-300">{subject.exams?.name}</strong> • Slug: /{subject.slug}
            </p>
          </div>
        </div>

        <button onClick={fetchDetail} className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-gray-800 text-xs font-bold gap-6">
        {(['overview', 'topics', 'aliases'] as const).map((tab) => (
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

      {activeTab === 'overview' && (
        <form onSubmit={handleSaveSubject} className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Subject Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
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

          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Weight Percentage (%)</label>
            <input
              type="number"
              step="0.1"
              value={editForm.weight_percentage}
              onChange={(e) => setEditForm({ ...editForm, weight_percentage: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-[#6D5BFF] text-white font-extrabold flex items-center gap-2 hover:bg-[#5b4aee] cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'topics' && (
        <div className="space-y-4">
          <form onSubmit={handleAddTopic} className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex items-center gap-3">
            <input
              type="text"
              placeholder="Add new topic under this subject..."
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
            />
            <button
              type="submit"
              disabled={addingTopic || !newTopicName.trim()}
              className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {addingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Topic</span>
            </button>
          </form>

          <div className="bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {topics.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                No topics configured under this subject yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-gray-800 text-xs">
                {topics.map((top: any) => (
                  <div key={top.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
                    <div>
                      <Link href={`/admin/topics/${top.id}`} className="font-extrabold text-slate-900 dark:text-white hover:text-[#6D5BFF]">
                        {top.name}
                      </Link>
                      <div className="text-[10px] text-slate-400 font-mono">
                        /{top.slug} • Target Weight: {top.target_weight}%
                      </div>
                    </div>

                    <Link href={`/admin/topics/${top.id}`} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
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
              placeholder="Add search alias (e.g. biochem, biochemistry)..."
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
                  <span key={al.id} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white font-mono text-xs font-bold flex items-center gap-2">
                    <Tags className="w-3 h-3 text-[#6D5BFF]" />
                    <span>"{al.alias}"</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
