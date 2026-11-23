'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'

type Exam = { id:string; name:string; verification_status:string; version_year:number | null }
type Job = { id:string; exam_id:string; status:string; progress_stage:string; step_percentage:number; error?:string | null; output_payload?:any; created_at:string }
type Version = { id:string; exam_id:string; version_number:number; status:string; is_current:boolean; source_url:string; source_version_date:string; coverage_percentage:number; reconciliation_report:any; created_at:string }

export default function CurriculumReconciliationPage() {
  const [exams,setExams] = useState<Exam[]>([])
  const [jobs,setJobs] = useState<Job[]>([])
  const [versions,setVersions] = useState<Version[]>([])
  const [examId,setExamId] = useState('')
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState('')
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/curriculum-reconciliation',{cache:'no-store'})
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load reconciliation queue.')
      setExams(data.exams || [])
      setJobs(data.jobs || [])
      setVersions(data.versions || [])
      setExamId((current:string) => current || data.exams?.[0]?.id || '')
    } catch (e:any) {
      setError(e.message || 'Unable to load reconciliation queue.')
    } finally {
      setLoading(false)
    }
  },[])

  useEffect(()=>{ void refresh() },[refresh])

  async function post(body:any, key:string) {
    setBusy(key)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/curriculum-reconciliation',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Action failed.')
      setMessage(body.action === 'queue' ? 'Official syllabus comparison queued.' : 'Curriculum review action completed.')
      await refresh()
    } catch (e:any) {
      setError(e.message || 'Action failed.')
    } finally {
      setBusy('')
    }
  }

  const selectedJobs = jobs.filter((job)=>job.exam_id===examId)
  const selectedVersions = versions.filter((version)=>version.exam_id===examId)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-600"><BookOpenCheck size={18}/> Curriculum intelligence</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Curriculum Reconciliation</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Compare the verified official syllabus with the existing subject → topic → subtopic hierarchy. Missing nodes are only inserted after administrator approval; unmatched historical nodes are retained.</p>
        </div>
        <button onClick={()=>void refresh()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><RefreshCw size={16}/> Refresh</button>
      </div>

      {error && <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-semibold">Exam</label>
        <div className="flex flex-wrap gap-3">
          <select value={examId} onChange={(e)=>setExamId(e.target.value)} className="min-w-[260px] flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm">
            {exams.map((exam)=><option key={exam.id} value={exam.id}>{exam.name} · {exam.verification_status || 'pending review'}</option>)}
          </select>
          <button disabled={!examId || !!busy} onClick={()=>void post({action:'queue',examId},'queue')} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy==='queue' ? <Loader2 className="inline animate-spin" size={16}/> : 'Run official comparison'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">The worker requires Stage 2 approval, a verified current exam version, a verified authority and structured official syllabus evidence dated for that version. No AI or learning-content generation is used.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-bold">Reconciliation jobs</h2>
          {loading ? <Loader2 className="animate-spin text-slate-400"/> : selectedJobs.length ? <div className="space-y-3">
            {selectedJobs.map((job)=><div key={job.id} className="rounded-xl border p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{job.status.replaceAll('_',' ')}</span><span className="text-xs text-slate-500">{job.step_percentage}%</span></div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{job.progress_stage}</p>
              {job.error && <p className="mt-2 text-xs text-rose-600">{job.error}</p>}
              <p className="mt-2 text-[11px] text-slate-400">{new Date(job.created_at).toLocaleString()}</p>
            </div>)}
          </div> : <p className="text-sm text-slate-500">No reconciliation jobs for this exam.</p>}
        </div>
        <div className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-bold">Curriculum versions</h2>
          {loading ? <Loader2 className="animate-spin text-slate-400"/> : selectedVersions.length ? <div className="space-y-3">
            {selectedVersions.map((version)=><div key={version.id} className="rounded-xl border p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">Version {version.version_number}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{version.is_current ? 'Current' : version.status.replaceAll('_',' ')}</span></div>
              <p className="mt-1 text-xs text-slate-500">Source date: {version.source_version_date} · Coverage: {version.coverage_percentage}%</p>
              <a href={version.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-violet-600 underline">Open verified official syllabus source</a>
              <p className="mt-1 text-xs text-slate-500">{version.reconciliation_report?.expected?.subjects || 0} subjects · {version.reconciliation_report?.expected?.topics || 0} topics · {version.reconciliation_report?.expected?.subtopics || 0} subtopics</p>
              {version.status==='pending_review' && !version.is_current && version.reconciliation_report?.canApplyMissing === true && <div className="mt-3 flex gap-2">
                <button disabled={!!busy} onClick={()=>void post({action:'approve',versionId:version.id,reviewNotes:'Approved after administrator review.'},version.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve and apply missing nodes</button>
                <button disabled={!!busy} onClick={()=>void post({action:'reject',versionId:version.id,reviewNotes:'Rejected during administrator review.'},'reject-'+version.id)} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50">Reject</button>
              </div>}
              {version.status==='pending_review' && !version.is_current && version.reconciliation_report?.canApplyMissing !== true && <p className="mt-3 text-xs font-medium text-amber-600">Approval is blocked until duplicate, renamed, modified or uncertain matches are resolved.</p>}
              {version.reconciliation_report?.issues?.length>0 && <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-violet-600">Review {version.reconciliation_report.issues.length} findings</summary>
                <ul className="mt-2 max-h-52 space-y-2 overflow-auto text-xs">
                  {version.reconciliation_report.issues.slice(0,80).map((issue:any,index:number)=><li key={index} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                    <span className="font-semibold">{issue.type.replaceAll('_',' ')} · {issue.level}</span> — {issue.name}<div className="text-slate-500">{issue.path} · {issue.detail}</div>
                  </li>)}
                </ul>
              </details>}
            </div>)}
          </div> : <p className="text-sm text-slate-500">No version snapshots yet.</p>}
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldAlert size={16} className="mt-0.5 shrink-0"/>
        <p>Approval only creates missing nodes. Renames, duplicates and uncertain matches block automatic application. Nodes absent from the latest syllabus remain in the database and are reported for review; learner progress and content history are not deleted.</p>
      </div>
    </div>
  )
}
