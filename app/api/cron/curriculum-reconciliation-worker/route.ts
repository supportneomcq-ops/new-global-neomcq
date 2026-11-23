import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createCurriculumVersionFromEvidence } from '@/lib/server/curriculum/versioned-reconciliation'

export const runtime = 'nodejs'
export const maxDuration = 300
const TASK = 'curriculum_reconciliation'

function json(status:number, body:Record<string,unknown>) {
  return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}})
}

export async function GET(req:NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return json(401,{success:false,error:'Unauthorized'})
  }
  const admin = getSupabaseAdmin() as any
  const now = new Date().toISOString()
  const staleBefore = new Date(Date.now()-15*60*1000).toISOString()

  await admin.from('ai_jobs').update({
    status:'queued',progress_stage:'Recovered after reconciliation worker timeout',
    step_percentage:0,error:'Previous worker did not finish; safely requeued.',
  }).eq('task',TASK).eq('status','processing').lt('started_at',staleBefore)

  const { data: failed } = await admin.from('ai_jobs').select('*')
    .eq('task',TASK).eq('status','failed').lt('attempts',3)
    .order('priority',{ascending:false}).order('created_at',{ascending:true}).limit(1)
  const { data: queued } = failed?.length ? {data:[]} : await admin.from('ai_jobs').select('*')
    .eq('task',TASK).eq('status','queued')
    .order('priority',{ascending:false}).order('created_at',{ascending:true}).limit(1)
  const candidate = failed?.[0] || queued?.[0]
  if (!candidate) return json(200,{success:true,message:'No official curriculum reconciliation jobs are waiting.'})

  const { data: claimed, error: claimError } = await admin.from('ai_jobs').update({
    status:'processing',attempts:Number(candidate.attempts || 0)+1,started_at:now,
    completed_at:null,error:null,progress_stage:'Checking Stage 2 approval and official syllabus evidence',step_percentage:10,
  }).eq('id',candidate.id).in('status',['queued','failed']).select('*').maybeSingle()
  if (claimError || !claimed) return json(200,{success:true,message:'Another worker claimed the reconciliation job.'})

  await admin.from('exam_curriculum_reconciliation_runs').upsert({
    exam_id:claimed.exam_id,ai_job_id:claimed.id,status:'processing',started_at:now,updated_at:now,
    requested_by:claimed.input_payload?.requestedBy || null,report:{},
  },{onConflict:'ai_job_id'})

  try {
    const examId = String(claimed.input_payload?.examId || claimed.exam_id || '')
    if (!examId) throw new Error('Reconciliation job is missing examId.')
    const result = await createCurriculumVersionFromEvidence(examId,claimed.input_payload?.requestedBy || null,claimed.id)
    const finishedAt = new Date().toISOString()
    await admin.from('ai_jobs').update({
      status:'completed',completed_at:finishedAt,progress_stage:'Comparison saved; awaiting administrator review',
      step_percentage:100,error:null,output_payload:{curriculumVersionId:result.version.id,report:result.report,examName:result.examName},
    }).eq('id',claimed.id)
    await admin.from('exam_curriculum_reconciliation_runs').update({
      status:result.report.issues?.length ? 'needs_review' : 'completed',curriculum_version_id:result.version.id,report:result.report,completed_at:finishedAt,updated_at:finishedAt,
    }).eq('ai_job_id',claimed.id)
    return json(200,{success:true,jobId:claimed.id,curriculumVersionId:result.version.id,report:result.report})
  } catch(error:any) {
    const message = String(error?.message || 'Curriculum reconciliation failed.')
    const waiting = /Stage 2|verified|official syllabus|authority|current-year|conflicting verified/i.test(message)
    const finishedAt = new Date().toISOString()
    await admin.from('ai_jobs').update({
      status:waiting?'waiting_verification':'failed',completed_at:waiting?null:finishedAt,
      progress_stage:waiting?'Waiting for official verification or source resolution':'Curriculum reconciliation failed',
      step_percentage:0,error:message,
    }).eq('id',claimed.id)
    await admin.from('exam_curriculum_reconciliation_runs').update({
      status:waiting?'needs_review':'failed',error:message,completed_at:finishedAt,updated_at:finishedAt,
      report:{message,waitingForVerification:waiting},
    }).eq('ai_job_id',claimed.id)
    return json(waiting?200:500,{success:false,jobId:claimed.id,waitingForVerification:waiting,error:message})
  }
}
