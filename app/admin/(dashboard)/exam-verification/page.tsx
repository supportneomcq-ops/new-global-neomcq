'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  XCircle,
} from 'lucide-react'

type Bundle = {
  exam: any
  country: any
  category: any
  authority: any
  versions: any[]
  currentVersion: any
  evidence: any[]
  audit: any
}

const SOURCE_TYPES = [
  ['official_bulletin', 'Official examination bulletin'],
  ['official_notification', 'Official notification'],
  ['official_syllabus', 'Official syllabus'],
  ['official_exam_pattern', 'Official exam pattern'],
  ['official_guideline', 'Official guideline'],
] as const

function statusClass(status: string) {
  if (status === 'verified') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (status === 'ready_for_review') return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  if (status === 'rejected') return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
  return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
}

export default function ExamVerificationPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [counts, setCounts] = useState({ total: 0, readyForReview: 0, needsReview: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [activeSourceExamId, setActiveSourceExamId] = useState<string | null>(null)
  const [sourceForm, setSourceForm] = useState({
    source_type: 'official_bulletin',
    source_url: '',
    source_reference: '',
    source_version_date: '',
    extracted_data: '{}',
  })
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/exam-verification', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load exam verification queue.')
      setBundles(data.exams || [])
      setCounts(data.counts || { total: 0, readyForReview: 0, needsReview: 0 })
    } catch (err: any) {
      setError(err.message || 'Exam verification queue failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const runAction = async (examId: string, action: string, extra: Record<string, any> = {}) => {
    const key = `${examId}:${action}`
    setBusyKey(key)
    setError('')
    try {
      const response = await fetch('/api/admin/exam-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          action,
          review_notes: reviewNotes[examId] || '',
          ...extra,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Verification action failed.')
      await fetchQueue()
      if (action === 'add_source') {
        setActiveSourceExamId(null)
        setSourceForm({
          source_type: 'official_bulletin',
          source_url: '',
          source_reference: '',
          source_version_date: '',
          extracted_data: '{}',
        })
      }
      return data
    } catch (err: any) {
      setError(err.message || 'Verification action failed.')
      return null
    } finally {
      setBusyKey('')
    }
  }

  const submitSource = async (examId: string) => {
    let extractedData: any
    try {
      extractedData = JSON.parse(sourceForm.extracted_data || '{}')
      if (!extractedData || Array.isArray(extractedData) || typeof extractedData !== 'object') {
        throw new Error('Extracted data must be a JSON object.')
      }
    } catch {
      setError('Extracted data must be valid JSON object syntax.')
      return
    }
    await runAction(examId, 'add_source', {
      ...sourceForm,
      extracted_data: extractedData,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#6D5BFF]" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Official Exam Verification</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 max-w-3xl">
            Verify jurisdiction, authority, current version, official source documents and every required exam-pattern field before releasing curriculum generation.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-bold hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh queue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] p-4">
          <div className="text-xs text-slate-500">Awaiting review</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{counts.total}</div>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-xs text-blue-600 dark:text-blue-300">Ready for admin approval</div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-200">{counts.readyForReview}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="text-xs text-amber-700 dark:text-amber-300">Missing fields / source issues</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-200">{counts.needsReview}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading official verification records…
        </div>
      ) : bundles.length === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
          <div className="font-bold text-slate-900 dark:text-white">No exams are waiting for verification.</div>
          <p className="text-sm text-slate-500 mt-1">New or changed exam records will appear here until their official metadata is approved.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {bundles.map((bundle) => {
            const exam = bundle.exam
            const audit = bundle.audit
            const auditStatus = audit?.status || 'needs_review'
            const fieldResults = audit?.field_results || {}
            const missing = audit?.missing_fields || []
            const conflicts = audit?.conflicting_fields || []
            const isBusy = busyKey.startsWith(`${exam.id}:`)
            const authorityVerified = bundle.authority?.verification_status === 'verified'
            const canApprove = auditStatus === 'ready_for_review' && missing.length === 0 && conflicts.length === 0

            return (
              <section key={exam.id} className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0E1324] overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-gray-800 flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">{exam.name}</h2>
                      <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${statusClass(auditStatus)}`}>{auditStatus.replaceAll('_', ' ')}</span>
                      <span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-gray-700 text-[10px] font-bold text-slate-500">{exam.verification_status || 'pending_review'}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Country: <strong className="text-slate-700 dark:text-gray-300">{bundle.country?.name || 'Missing'}</strong></span>
                      <span>Category: <strong className="text-slate-700 dark:text-gray-300">{bundle.category?.name || 'Missing'}</strong></span>
                      <span>Authority: <strong className="text-slate-700 dark:text-gray-300">{bundle.authority?.name || exam.authority || 'Missing'}</strong></span>
                      <span>Level: <strong className="text-slate-700 dark:text-gray-300">{exam.level || 'Missing'}</strong></span>
                      <span>Version: <strong className="text-slate-700 dark:text-gray-300">{exam.current_version || 'Missing'} ({exam.version_year || '—'})</strong></span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={`/admin/exams/${exam.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#6D5BFF] hover:underline">
                        Edit exam record <ExternalLink className="w-3 h-3" />
                      </Link>
                      {bundle.currentVersion?.source_url && (
                        <a href={bundle.currentVersion.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#6D5BFF]">
                          Current version source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => runAction(exam.id, 'verify_authority')}
                      disabled={isBusy || authorityVerified}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold disabled:opacity-40"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                      {authorityVerified ? 'Authority verified' : 'Verify authority'}
                    </button>
                    <button
                      onClick={() => runAction(exam.id, 'run_audit')}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40"
                    >
                      <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                      Run audit
                    </button>
                    <button
                      onClick={() => runAction(exam.id, 'approve_exam')}
                      disabled={isBusy || !canApprove}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      Approve & queue curriculum
                    </button>
                    <button
                      onClick={() => {
                        const notes = window.prompt('Reason for rejecting this exam verification?')
                        if (notes !== null) {
                          setReviewNotes((prev) => ({ ...prev, [exam.id]: notes }))
                          void runAction(exam.id, 'reject_exam', { review_notes: notes })
                        }
                      }}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-xl border border-rose-500/30 text-rose-600 text-xs font-bold disabled:opacity-40"
                    >
                      <XCircle className="w-3.5 h-3.5 inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Field-level audit</h3>
                        <span className="text-[10px] text-slate-400">{Object.keys(fieldResults).length} fields checked</span>
                      </div>
                      {Object.keys(fieldResults).length === 0 ? (
                        <div className="text-xs text-slate-500 rounded-xl bg-slate-50 dark:bg-gray-900 p-3">No audit has been run yet.</div>
                      ) : (
                        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100 dark:border-gray-800 divide-y divide-slate-100 dark:divide-gray-800">
                          {Object.entries(fieldResults).map(([field, result]: [string, any]) => (
                            <div key={field} className="p-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-gray-200">{field.replaceAll('_', ' ')}</div>
                                <div className="text-[11px] text-slate-500 mt-1 break-words">{result?.reason || 'No reason recorded'}</div>
                                {result?.value !== null && result?.value !== undefined && (
                                  <div className="text-[11px] text-slate-700 dark:text-gray-300 mt-1 break-words">
                                    Value: {typeof result.value === 'object' ? JSON.stringify(result.value) : String(result.value)}
                                  </div>
                                )}
                                {(result?.source_urls || []).map((url: string) => (
                                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-[10px] text-[#6D5BFF] mt-1 break-all">{url}</a>
                                ))}
                              </div>
                              <span className={`shrink-0 px-2 py-1 rounded-md border text-[9px] font-black uppercase ${statusClass(result?.status || 'needs_review')}`}>
                                {String(result?.status || 'needs_review').replaceAll('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {missing.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-300 mb-2">
                          <AlertCircle className="w-4 h-4" /> Missing / unverified fields
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {missing.map((field: string) => <span key={field} className="px-2 py-1 rounded-md bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">{field}</span>)}
                        </div>
                      </div>
                    )}

                    {conflicts.length > 0 && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-rose-700 dark:text-rose-300 mb-2">
                          <AlertTriangle className="w-4 h-4" /> Conflicting pattern fields
                        </div>
                        <div className="space-y-2">
                          {conflicts.map((conflict: any, index: number) => (
                            <div key={index} className="text-[11px] text-rose-700 dark:text-rose-300">
                              <strong>{conflict.field || 'Conflict'}:</strong> {conflict.reason || JSON.stringify(conflict)}
                              {conflict.stored_value !== undefined && <div>Stored: {String(conflict.stored_value)}{conflict.structure_total !== undefined ? ` / Structure total: ${conflict.structure_total}` : ''}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-100 dark:border-gray-800 p-3">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">Authority record</div>
                      <div className="text-xs text-slate-600 dark:text-gray-300">{bundle.authority?.name || 'No authority record linked'}</div>
                      {bundle.authority?.official_website && (
                        <a href={bundle.authority.official_website} target="_blank" rel="noreferrer" className="text-[11px] text-[#6D5BFF] break-all">{bundle.authority.official_website}</a>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1">Status: {bundle.authority?.verification_status || 'missing'}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Official source evidence</h3>
                      <button
                        onClick={() => setActiveSourceExamId(activeSourceExamId === exam.id ? null : exam.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D5BFF]"
                      >
                        <FilePlus2 className="w-4 h-4" /> Add source
                      </button>
                    </div>

                    {activeSourceExamId === exam.id && (
                      <div className="rounded-xl border border-[#6D5BFF]/20 bg-[#6D5BFF]/5 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={sourceForm.source_type}
                            onChange={(e) => setSourceForm({ ...sourceForm, source_type: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                          >
                            {SOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <input
                            type="date"
                            value={sourceForm.source_version_date}
                            onChange={(e) => setSourceForm({ ...sourceForm, source_version_date: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                            aria-label="Source version date"
                          />
                        </div>
                        <input
                          value={sourceForm.source_url}
                          onChange={(e) => setSourceForm({ ...sourceForm, source_url: e.target.value })}
                          placeholder="Official HTTPS source URL"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        />
                        <input
                          value={sourceForm.source_reference}
                          onChange={(e) => setSourceForm({ ...sourceForm, source_reference: e.target.value })}
                          placeholder="Document title / notification number"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                        />
                        <textarea
                          rows={5}
                          value={sourceForm.extracted_data}
                          onChange={(e) => setSourceForm({ ...sourceForm, extracted_data: e.target.value })}
                          placeholder='JSON object with official fields, e.g. {"question_count":300,"duration_minutes":300}'
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[11px] font-mono"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setActiveSourceExamId(null)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 text-xs font-bold">Cancel</button>
                          <button
                            onClick={() => submitSource(exam.id)}
                            disabled={isBusy || !sourceForm.source_url}
                            className="px-3 py-2 rounded-lg bg-[#6D5BFF] text-white text-xs font-bold disabled:opacity-40"
                          >
                            Save pending source
                          </button>
                        </div>
                      </div>
                    )}

                    {bundle.evidence.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 dark:bg-gray-900 p-4 text-xs text-slate-500">No official source evidence has been recorded.</div>
                    ) : (
                      <div className="space-y-2">
                        {bundle.evidence.map((source: any) => (
                          <div key={source.id} className="rounded-xl border border-slate-100 dark:border-gray-800 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-gray-200">{source.source_reference || source.source_type}</div>
                                <div className="text-[10px] text-slate-500 mt-1">{source.source_type} · Source date: {source.source_version_date || 'Not recorded'}</div>
                                {source.source_url && <a href={source.source_url} target="_blank" rel="noreferrer" className="block text-[10px] text-[#6D5BFF] break-all mt-1">{source.source_url}</a>}
                                {source.review_notes && <div className="text-[10px] text-slate-500 mt-1">Review: {source.review_notes}</div>}
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase ${statusClass(source.verification_status)}`}>{source.verification_status}</span>
                                {source.verification_status !== 'verified' && (
                                  <button
                                    onClick={() => runAction(exam.id, 'verify_source', { evidenceId: source.id })}
                                    disabled={isBusy}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold disabled:opacity-40"
                                  >
                                    Verify source
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-100 dark:border-gray-800 p-3">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white mb-1">Current exam version</div>
                      {bundle.currentVersion ? (
                        <>
                          <div className="text-xs text-slate-700 dark:text-gray-300">{bundle.currentVersion.version_label || bundle.currentVersion.version_year} · {bundle.currentVersion.verification_status}</div>
                          <div className="text-[10px] text-slate-500 mt-1">Version year: {bundle.currentVersion.version_year} · Verified at: {bundle.currentVersion.verified_at || 'Not verified'}</div>
                        </>
                      ) : (
                        <div className="text-xs text-amber-600">No current version record. Add version information through Edit exam record.</div>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      value={reviewNotes[exam.id] || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [exam.id]: e.target.value })}
                      placeholder="Admin review notes (required for a meaningful audit trail)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                    />
                  </div>
                </div>

                {isBusy && (
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-gray-800 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving verification action…
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
