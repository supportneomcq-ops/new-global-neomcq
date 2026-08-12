'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Layers,
  ArrowLeft,
  Save,
  Plus,
  RefreshCw,
  Loader2,
  Tags,
  Database,
} from 'lucide-react'

export function AdminTopicDetailView({ topicId }: { topicId: string }) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'aliases' | 'content'>('overview')

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    target_weight: '5',
  })

  const [newAlias, setNewAlias] = useState('')
  const [addingAlias, setAddingAlias] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        setEditForm({
          name: json.topic?.name || '',
          description: json.topic?.description || '',
          target_weight: String(json.topic?.target_weight || 5),
        })
      }
    } catch (err) {
      console.error('Failed to fetch topic detail:', err)
    } finally {
      setLoading(false)
    }
  }, [topicId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          ...editForm,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchDetail()
        alert('Topic updated successfully!')
      } else {
        alert(json.error || 'Failed to update topic')
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
          entity_type: 'topic',
          entity_id: topicId,
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
        <span className="text-xs font-semibold">Loading topic details...</span>
      </div>
    )
  }

  if (!data || !data.topic) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-bold text-xs">Topic not found.</p>
        <Link href="/admin/topics" className="px-4 py-2 bg-slate-200 dark:bg-gray-800 rounded-xl text-xs font-bold">
          &larr; Back to Topics
        </Link>
      </div>
    )
  }

  const { topic, aliases, contentCache } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/topics"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>

          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
              {topic.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Parent Subject: <strong className="text-slate-700 dark:text-gray-300">{topic.exam_subjects?.name}</strong> • Exam: <strong className="text-slate-700 dark:text-gray-300">{topic.exam_subjects?.exams?.name}</strong>
            </p>
          </div>
        </div>

        <button onClick={fetchDetail} className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex border-b border-slate-200 dark:border-gray-800 text-xs font-bold gap-6">
        {(['overview', 'aliases', 'content'] as const).map((tab) => (
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
        <form onSubmit={handleSaveTopic} className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Topic Name</label>
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
            <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Target Weight (%)</label>
            <input
              type="number"
              step="0.1"
              value={editForm.target_weight}
              onChange={(e) => setEditForm({ ...editForm, target_weight: e.target.value })}
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

      {activeTab === 'aliases' && (
        <div className="space-y-4">
          <form onSubmit={handleAddAlias} className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 flex items-center gap-3">
            <input
              type="text"
              placeholder="Add search alias (e.g. MI, heart attack, STEMI)..."
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

      {activeTab === 'content' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Database className="w-4 h-4 text-[#6D5BFF]" />
            <span>Cached Learning Content Assets</span>
          </div>

          {contentCache.length === 0 ? (
            <p className="text-slate-400 italic">No learning content cached for this topic yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-gray-800">
              {contentCache.map((cc: any) => (
                <div key={cc.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-gray-200 capitalize">{cc.content_type}</span>
                    <span className="text-slate-400 ml-2">({cc.difficulty} • {cc.language})</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                    Confidence {cc.ai_confidence_score}%
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
