'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import {
  Sparkles,
  Search,
  Database,
  Layers,
  Zap,
  Tag,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Brain,
  Globe,
  SlidersHorizontal,
  FileText,
} from 'lucide-react'

export function AdminKnowledgeManager() {
  const [stats, setStats] = useState({
    totalCachedAssets: 0,
    totalExamAliases: 0,
    totalSubjectAliases: 0,
    totalTopicAliases: 0,
  })
  const [examAliases, setExamAliases] = useState<any[]>([])
  const [subjectAliases, setSubjectAliases] = useState<any[]>([])
  const [topicAliases, setTopicAliases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Real-time Tester State
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<any | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  // Add Alias Form State
  const [newAlias, setNewAlias] = useState('')
  const [entityType, setEntityType] = useState<'exam' | 'subject' | 'topic'>('exam')
  const [entityId, setEntityId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchKnowledgeData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/knowledge')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats || {})
        setExamAliases(data.examAliases || [])
        setSubjectAliases(data.subjectAliases || [])
        setTopicAliases(data.topicAliases || [])
      }
    } catch (err) {
      console.error('Failed to load knowledge admin data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        await fetchKnowledgeData()
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [fetchKnowledgeData])

  const handleTestMatch = async () => {
    if (!testQuery.trim()) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/exams/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examQuery: testQuery }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err: any) {
      setTestResult({ error: err.message || 'Matching test failed' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeleteAlias = async (aliasId: string, aliasType: 'exam' | 'subject' | 'topic') => {
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_alias', aliasId, aliasType }),
      })
      const data = await res.json()
      if (data.success) {
        fetchKnowledgeData()
      }
    } catch (err) {
      console.error('Failed to delete alias:', err)
    }
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlias.trim() || !entityId.trim()) return
    setIsAdding(true)
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_alias',
          entityType,
          entityId: entityId.trim(),
          alias: newAlias.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setNewAlias('')
        setEntityId('')
        fetchKnowledgeData()
      }
    } catch (err) {
      console.error('Failed to add alias:', err)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#6D5BFF]" />
            <span>Cached Asset Packs</span>
          </div>
          <div className="text-2xl font-heading font-black text-slate-900 dark:text-white mt-1">
            {stats.totalCachedAssets}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-[#00D4FF]/30">
          <div className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Exam Aliases</span>
          </div>
          <div className="text-2xl font-heading font-black text-[#00D4FF] mt-1">
            {stats.totalExamAliases}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-emerald-500/30">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Subject Aliases</span>
          </div>
          <div className="text-2xl font-heading font-black text-emerald-500 mt-1">
            {stats.totalSubjectAliases}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-amber-500/30">
          <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            <span>Topic Aliases</span>
          </div>
          <div className="text-2xl font-heading font-black text-amber-500 mt-1">
            {stats.totalTopicAliases}
          </div>
        </div>
      </div>

      {/* Real-time Match & Resolution Tester */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#6D5BFF]" />
            <h3 className="text-sm font-heading font-extrabold text-slate-900 dark:text-white">
              Smart Matching & Normalizer Tester
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF]">
            Real-time Resolution
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Type any raw input (e.g., FMGES, Cardio, USMLE Step One)..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
          />
          <button
            onClick={handleTestMatch}
            disabled={isTesting || !testQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white text-xs font-bold shadow hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Test Match</span>
          </button>
        </div>

        {testResult && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-900 dark:text-white">
                {testResult.reused ? 'Reused Existing Structure' : 'Generated New Structure'}
              </span>
              <span className="text-[#00D4FF]">
                Exam: {testResult.exam?.name || 'N/A'}
              </span>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-[11px]">
              {testResult.message || JSON.stringify(testResult)}
            </p>
          </div>
        )}
      </div>

      {/* Alias Database Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#00D4FF]" />
              <span>Auto-Expanded Alias Index</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Aliases recorded automatically from user queries to ensure instant 0ms matching.
            </p>
          </div>

          <button
            onClick={fetchKnowledgeData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-gray-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
            <span className="text-xs">Loading Aliases Index...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-3">Alias Term</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Canonical Target Entity</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {examAliases.map((ea) => (
                  <tr key={ea.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{ea.alias}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#00D4FF]/10 text-[#00D4FF]">
                        Exam
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-gray-300">
                      {ea.exams?.name || 'Unknown Exam'}
                    </td>
                    <td className="p-3 text-slate-400 text-[10px]">
                      {new Date(ea.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteAlias(ea.id, 'exam')}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="Delete alias"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
