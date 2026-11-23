import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyAdminApiSession } from '@/lib/admin-auth'
import { approveCurriculumVersion } from '@/lib/server/curriculum/versioned-reconciliation'

export const runtime = 'nodejs'

async function authorize() {
  const auth = await verifyAdminApiSession()
  if (!auth.authorized) return { user: null, response: auth.response }
  return { user: auth.user, response: null }
}

export async function GET(req: NextRequest) {
  const { user, response } = await authorize()
  if (response) return response
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const admin = getSupabaseAdmin() as any
  const examId = req.nextUrl.searchParams.get('examId')
  const [{ data: exams, error: examsError }, { data: jobs, error: jobsError }] = await Promise.all([
    admin.from('exams').select('id,name,status,verification_status,version_year').neq('status','archived').order('name').limit(500),
    admin.from('ai_jobs').select('id,exam_id,status,progress_stage,step_percentage,attempts,max_attempts,error,output_payload,created_at,completed_at')
      .eq('task','curriculum_reconciliation').order('created_at',{ascending:false}).limit(100),
  ])
  if (examsError || jobsError) return NextResponse.json({ success:false,error:examsError?.message || jobsError?.message },{status:500})

  let versionsQuery = admin.from('exam_curriculum_versions')
    .select('id,exam_id,exam_version_id,source_evidence_id,version_number,source_hash,source_url,source_version_date,status,is_current,coverage_percentage,subject_count,topic_count,subtopic_count,reconciliation_report,created_at,reviewed_at')
    .order('created_at',{ascending:false}).limit(100)
  if (examId) versionsQuery = versionsQuery.eq('exam_id',examId)
  const { data: versions, error: versionsError } = await versionsQuery
  if (versionsError) return NextResponse.json({success:false,error:versionsError.message},{status:500})

  return NextResponse.json({
    success:true,
    exams: examId ? (exams || []).filter((exam:any)=>exam.id===examId) : exams || [],
    jobs: examId ? (jobs || []).filter((job:any)=>job.exam_id===examId) : jobs || [],
    versions: versions || [],
    requestedBy:user.id,
  },{headers:{'Cache-Control':'no-store'}})
}

export async function POST(req: NextRequest) {
  const { user, response } = await authorize()
  if (response) return response
  if (!user) return NextResponse.json({success:false,error:'Unauthorized'},{status:401})
  const body = await req.json().catch(()=>({}))
  const admin = getSupabaseAdmin() as any

  if (body.action === 'queue') {
    const examId = String(body.examId || '').trim()
    if (!examId) return NextResponse.json({success:false,error:'examId is required.'},{status:400})
    const { data: exam, error: examError } = await admin.from('exams').select('id,name').eq('id',examId).maybeSingle()
    if (examError || !exam) return NextResponse.json({success:false,error:'Exam not found.'},{status:404})
    const { data: priorJob } = await admin.from('ai_jobs').select('id,exam_id,status,progress_stage,step_percentage,attempts,created_at')
      .eq('exam_id',examId).eq('task','curriculum_reconciliation')
      .in('status',['queued','processing','waiting_verification','failed'])
      .order('created_at',{ascending:false}).limit(1).maybeSingle()
    if (priorJob?.status === 'queued' || priorJob?.status === 'processing') {
      return NextResponse.json({success:true,job:priorJob,alreadyQueued:true})
    }
    if (priorJob) {
      const { data: requeued, error: requeueError } = await admin.from('ai_jobs').update({
        status:'queued',attempts:0,max_attempts:3,error:null,completed_at:null,
        input_payload:{examId,requestedBy:user.id,source:'admin_curriculum_review'},
        progress_stage:'Requeued for official syllabus comparison',step_percentage:0,
      }).eq('id',priorJob.id).select('id,exam_id,status,progress_stage,created_at').single()
      if (requeueError || !requeued) return NextResponse.json({success:false,error:requeueError?.message || 'Could not requeue reconciliation.'},{status:500})
      await admin.from('exam_curriculum_reconciliation_runs').upsert({
        exam_id:examId,ai_job_id:requeued.id,status:'queued',requested_by:user.id,report:{},updated_at:new Date().toISOString(),
      },{onConflict:'ai_job_id'})
      return NextResponse.json({success:true,job:requeued,requeued:true})
    }
    const { data: job, error } = await admin.from('ai_jobs').insert({
      exam_id:examId,
      task:'curriculum_reconciliation',
      priority:6,
      status:'queued',
      attempts:0,
      max_attempts:3,
      idempotency_key:`curriculum-reconciliation:v1:${examId}:${randomUUID()}`,
      input_payload:{examId,requestedBy:user.id,source:'admin_curriculum_review'},
      progress_stage:'Queued for official syllabus comparison',
      step_percentage:0,
    }).select('id,exam_id,status,progress_stage,created_at').single()
    if (error || !job) {
      const { data: racedJob } = await admin.from('ai_jobs').select('id,exam_id,status,progress_stage,step_percentage,created_at')
        .eq('exam_id',examId).eq('task','curriculum_reconciliation').in('status',['queued','processing']).maybeSingle()
      if (racedJob) return NextResponse.json({success:true,job:racedJob,alreadyQueued:true})
      return NextResponse.json({success:false,error:error?.message || 'Could not queue reconciliation.'},{status:500})
    }
    const { error: runError } = await admin.from('exam_curriculum_reconciliation_runs').insert({
      exam_id:examId,ai_job_id:job.id,status:'queued',requested_by:user.id,report:{}
    })
    if (runError) {
      await admin.from('ai_jobs').update({status:'failed',error:'Could not create reconciliation run: '+runError.message}).eq('id',job.id)
      return NextResponse.json({success:false,error:'Could not create reconciliation run.'},{status:500})
    }
    return NextResponse.json({success:true,job,examName:exam.name})
  }

  if (body.action === 'approve') {
    const versionId = String(body.versionId || '').trim()
    if (!versionId) return NextResponse.json({success:false,error:'versionId is required.'},{status:400})
    try {
      const result = await approveCurriculumVersion(versionId,user.id,String(body.reviewNotes || ''))
      return NextResponse.json({success:true,...result})
    } catch (error:any) {
      return NextResponse.json({success:false,error:error?.message || 'Curriculum approval failed.'},{status:409})
    }
  }

  if (body.action === 'reject') {
    const versionId = String(body.versionId || '').trim()
    if (!versionId) return NextResponse.json({success:false,error:'versionId is required.'},{status:400})
    const now = new Date().toISOString()
    const { data: version, error } = await admin.from('exam_curriculum_versions').update({
      status:'rejected',is_current:false,reviewed_by:user.id,reviewed_at:now,
      review_notes:String(body.reviewNotes || 'Rejected during manual curriculum review.'),updated_at:now,
    }).eq('id',versionId).eq('is_current',false).eq('status','pending_review').select('id,exam_id,status').maybeSingle()
    if (error || !version) return NextResponse.json({success:false,error:error?.message || 'Pending curriculum version not found.'},{status:404})
    await admin.from('exam_curriculum_reconciliation_runs').update({status:'rejected',updated_at:now}).eq('curriculum_version_id',versionId)
    return NextResponse.json({success:true,version})
  }

  return NextResponse.json({success:false,error:'Unsupported action.'},{status:400})
}
