/**
 * NeoMCQ Production SEO Database Access Layer
 * Centralized queries for public SEO routes with STRICT security boundaries.
 * 
 * SECURITY MANDATE:
 * For unauthenticated callers, getPublicMcq and related helpers MUST NEVER
 * return 'correct_answer', 'explanation', or 'rationale'.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { GLOBAL_EXAM_REGISTRY } from '@/lib/data/exam-registry';
import { CANONICAL_BLOG_POSTS } from '@/lib/data/blog-registry';
import {
  ExamSeoData,
  SubjectSeoData,
  TopicSeoData,
  McqSeoData,
  NoteSeoData,
  FlashcardSeoData,
  BlogSeoData,
} from './types';
import { evaluateMcqQuality } from './quality-gate';

/**
 * Slugify helper to guarantee clean SEO URLs
 */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Fetch public Exam by slug
 */
export async function getPublicExamBySlug(examSlug: string): Promise<ExamSeoData | null> {
  const supabase = getSupabaseAdmin();
  const cleanSlug = examSlug.toLowerCase().trim();

  // 1. Check Supabase 'exams' table
  try {
    const { data: examData } = await (supabase as any)
      .from('exams')
      .select('id, name, slug, description, difficulty, question_count, time_limit_mins, created_at, updated_at')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (examData) {
      // Get real subject count and MCQ count
      const [subjRes, mcqRes] = await Promise.all([
        (supabase as any).from('exam_subjects').select('id', { count: 'exact', head: true }).eq('exam_id', examData.id),
        (supabase as any).from('mcqs').select('id', { count: 'exact', head: true }).eq('exam_id', examData.id).eq('status', 'approved'),
      ]);

      return {
        id: examData.id,
        name: examData.name,
        slug: examData.slug,
        description: examData.description,
        difficulty: examData.difficulty || 'Advanced',
        question_count: examData.question_count || 200,
        time_limit_mins: examData.time_limit_mins || 180,
        subjects_count: subjRes.count || 0,
        mcqs_count: mcqRes.count || 0,
        created_at: examData.created_at,
        updated_at: examData.updated_at,
      };
    }
  } catch (err) {
    console.warn('[SEO] DB lookup for exam failed, falling back to registry:', err);
  }

  // 2. Fallback to GLOBAL_EXAM_REGISTRY
  const registryEntry = GLOBAL_EXAM_REGISTRY.find(
    (e) => e.slug === cleanSlug || slugify(e.canonicalName) === cleanSlug
  );

  if (registryEntry) {
    return {
      id: `reg-${registryEntry.slug}`,
      name: registryEntry.canonicalName,
      slug: registryEntry.slug,
      description: `Comprehensive AI-curated practice examination for ${registryEntry.canonicalName} (${registryEntry.organization}).`,
      difficulty: registryEntry.difficulty,
      question_count: registryEntry.questionCount,
      time_limit_mins: registryEntry.timeLimitMins,
      official_website: registryEntry.officialWebsite,
      subjects_count: registryEntry.defaultSubjects?.length || 0,
      mcqs_count: 50,
    };
  }

  return null;
}

/**
 * Fetch all public active exams
 */
export async function getAllPublicExams(): Promise<ExamSeoData[]> {
  const supabase = getSupabaseAdmin();
  const examsList: ExamSeoData[] = [];

  try {
    const { data: dbExams } = await (supabase as any)
      .from('exams')
      .select('id, name, slug, description, difficulty, question_count, time_limit_mins, created_at, updated_at')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (dbExams && dbExams.length > 0) {
      for (const e of dbExams) {
        examsList.push({
          id: e.id,
          name: e.name,
          slug: e.slug,
          description: e.description,
          difficulty: e.difficulty || 'Advanced',
          question_count: e.question_count || 200,
          time_limit_mins: e.time_limit_mins || 180,
          subjects_count: 0,
          mcqs_count: 0,
          created_at: e.created_at,
          updated_at: e.updated_at,
        });
      }
      return examsList;
    }
  } catch (err) {
    console.warn('[SEO] DB fetch for all exams failed, falling back to registry:', err);
  }

  // Fallback to registry
  return GLOBAL_EXAM_REGISTRY.map((r) => ({
    id: `reg-${r.slug}`,
    name: r.canonicalName,
    slug: r.slug,
    description: `Comprehensive AI-curated practice examination for ${r.canonicalName} (${r.organization}).`,
    difficulty: r.difficulty,
    question_count: r.questionCount,
    time_limit_mins: r.timeLimitMins,
    official_website: r.officialWebsite,
    subjects_count: r.defaultSubjects?.length || 0,
    mcqs_count: 50,
  }));
}

/**
 * Fetch all subjects for a given exam
 */
export async function getPublicExamSubjects(examId: string, examSlug: string): Promise<SubjectSeoData[]> {
  const supabase = getSupabaseAdmin();
  try {
    const { data: dbSubjects } = await (supabase as any)
      .from('exam_subjects')
      .select('id, name, slug, description, weight_percentage, order_index')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (dbSubjects && dbSubjects.length > 0) {
      return dbSubjects.map((s: any) => ({
        id: s.id,
        exam_id: examId,
        name: s.name,
        slug: s.slug || slugify(s.name),
        description: s.description,
        weight_percentage: s.weight_percentage,
        exam_slug: examSlug,
      }));
    }
  } catch (err) {
    console.warn('[SEO] Failed to fetch exam subjects from DB:', err);
  }

  // Fallback from registry
  const registryEntry = GLOBAL_EXAM_REGISTRY.find((e) => e.slug === examSlug);
  if (registryEntry?.defaultSubjects) {
    return registryEntry.defaultSubjects.map((name, idx) => ({
      id: `reg-subj-${examSlug}-${slugify(name)}`,
      exam_id: examId,
      name,
      slug: slugify(name),
      description: `Core high-yield concepts and board MCQs for ${name}.`,
      weight_percentage: Math.round(100 / registryEntry.defaultSubjects!.length),
      exam_slug: examSlug,
    }));
  }

  return [];
}

/**
 * Fetch public Subject by slug
 */
export async function getPublicSubjectBySlug(
  examSlug: string,
  subjectSlug: string
): Promise<{ exam: ExamSeoData; subject: SubjectSeoData; topics: TopicSeoData[] } | null> {
  const exam = await getPublicExamBySlug(examSlug);
  if (!exam) return null;

  const supabase = getSupabaseAdmin();
  const cleanSubjectSlug = subjectSlug.toLowerCase().trim();

  // Look for subject in database
  let subject: SubjectSeoData | null = null;
  let topics: TopicSeoData[] = [];

  try {
    const { data: subjData } = await (supabase as any)
      .from('exam_subjects')
      .select('id, name, slug, description, weight_percentage')
      .eq('exam_id', exam.id)
      .or(`slug.eq.${cleanSubjectSlug},name.ilike.%${cleanSubjectSlug.replace(/-/g, ' ')}%`)
      .maybeSingle();

    if (subjData) {
      subject = {
        id: subjData.id,
        exam_id: exam.id,
        name: subjData.name,
        slug: subjData.slug || slugify(subjData.name),
        description: subjData.description,
        weight_percentage: subjData.weight_percentage,
        exam_name: exam.name,
        exam_slug: exam.slug,
      };

      // Fetch topics for this subject
      const { data: topicData } = await (supabase as any)
        .from('exam_topics')
        .select('id, name, slug, description, level, learning_objectives, estimated_study_mins, updated_at')
        .eq('subject_id', subjData.id)
        .order('name', { ascending: true });

      if (topicData) {
        topics = topicData.map((t: any) => ({
          id: t.id,
          subject_id: subjData.id,
          name: t.name,
          slug: t.slug || slugify(t.name),
          description: t.description,
          level: t.level,
          learning_objectives: t.learning_objectives,
          estimated_study_mins: t.estimated_study_mins,
          exam_id: exam.id,
          exam_name: exam.name,
          exam_slug: exam.slug,
          subject_name: subjData.name,
          subject_slug: subject!.slug,
          updated_at: t.updated_at,
        }));
      }
    }
  } catch (err) {
    console.warn('[SEO] DB subject lookup error:', err);
  }

  // Fallback if not found in DB
  if (!subject) {
    const subjects = await getPublicExamSubjects(exam.id, exam.slug);
    const found = subjects.find((s) => s.slug === cleanSubjectSlug || slugify(s.name) === cleanSubjectSlug);
    if (!found) return null;
    subject = {
      ...found,
      exam_name: exam.name,
    };
    // Generate standard default topics
    const defaultTopicNames = [
      'High-Yield Fundamentals',
      'Clinical Case Scenarios',
      'Diagnostic Algorithms',
      'Pharmacotherapy & Management',
      'Board High-Yield Pearls',
    ];
    topics = defaultTopicNames.map((name) => ({
      id: `reg-top-${exam.slug}-${subject!.slug}-${slugify(name)}`,
      subject_id: subject!.id,
      name,
      slug: slugify(name),
      description: `Key clinical review and practice MCQs for ${name} under ${subject!.name}.`,
      exam_id: exam.id,
      exam_name: exam.name,
      exam_slug: exam.slug,
      subject_name: subject!.name,
      subject_slug: subject!.slug,
    }));
  }

  return { exam, subject, topics };
}

/**
 * Fetch public Topic by slug
 */
export async function getPublicTopicBySlug(
  examSlug: string,
  subjectSlug: string,
  topicSlug: string
): Promise<{ exam: ExamSeoData; subject: SubjectSeoData; topic: TopicSeoData } | null> {
  const result = await getPublicSubjectBySlug(examSlug, subjectSlug);
  if (!result) return null;

  const { exam, subject, topics } = result;
  const cleanTopicSlug = topicSlug.toLowerCase().trim();

  let topic = topics.find((t) => t.slug === cleanTopicSlug || slugify(t.name) === cleanTopicSlug);

  if (!topic) {
    // Attempt single DB lookup for topic
    const supabase = getSupabaseAdmin();
    try {
      const { data: dbTopic } = await (supabase as any)
        .from('exam_topics')
        .select('id, name, slug, description, level, learning_objectives, estimated_study_mins, updated_at')
        .eq('subject_id', subject.id)
        .or(`slug.eq.${cleanTopicSlug},name.ilike.%${cleanTopicSlug.replace(/-/g, ' ')}%`)
        .maybeSingle();

      if (dbTopic) {
        topic = {
          id: dbTopic.id,
          subject_id: subject.id,
          name: dbTopic.name,
          slug: dbTopic.slug || slugify(dbTopic.name),
          description: dbTopic.description,
          level: dbTopic.level,
          learning_objectives: dbTopic.learning_objectives,
          estimated_study_mins: dbTopic.estimated_study_mins,
          exam_id: exam.id,
          exam_name: exam.name,
          exam_slug: exam.slug,
          subject_name: subject.name,
          subject_slug: subject.slug,
          updated_at: dbTopic.updated_at,
        };
      }
    } catch (err) {
      console.warn('[SEO] DB topic lookup error:', err);
    }
  }

  if (!topic) {
    // Synthesize fallback topic to preserve SEO stability
    const titleCase = topicSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    topic = {
      id: `reg-top-${exam.slug}-${subject.slug}-${cleanTopicSlug}`,
      subject_id: subject.id,
      name: titleCase,
      slug: cleanTopicSlug,
      description: `Comprehensive high-yield topic review and practice questions for ${titleCase} in ${subject.name}.`,
      exam_id: exam.id,
      exam_name: exam.name,
      exam_slug: exam.slug,
      subject_name: subject.name,
      subject_slug: subject.slug,
    };
  }

  return { exam, subject, topic };
}

/**
 * Fetch public MCQs for a topic with pagination
 * 
 * STRICT SECURITY:
 * When isAuthenticated is false (default for crawlers / anonymous),
 * correct_answer and explanation are strictly stripped out!
 */
export async function getPublicTopicMcqs({
  topicId,
  examId,
  page = 1,
  limit = 10,
  isAuthenticated = false,
}: {
  topicId: string;
  examId?: string;
  page?: number;
  limit?: number;
  isAuthenticated?: boolean;
}): Promise<{ mcqs: McqSeoData[]; total: number; totalPages: number }> {
  const supabase = getSupabaseAdmin();
  const offset = (page - 1) * limit;

  try {
    let query = (supabase as any)
      .from('mcqs')
      .select('id, slug, question, options, difficulty, question_type, source, created_at, updated_at, status, visibility, correct_answer, explanation, clinical_pearl, rationale', { count: 'exact' })
      .eq('status', 'approved');

    if (topicId && !topicId.startsWith('reg-')) {
      query = query.eq('topic_id', topicId);
    } else if (examId && !examId.startsWith('reg-')) {
      query = query.eq('exam_id', examId);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (!error && data && data.length > 0) {
      const sanitizedMcqs: McqSeoData[] = data.map((m: any) => {
        const item: McqSeoData = {
          id: m.id,
          slug: m.slug || slugify(m.question.slice(0, 40)) || m.id,
          question: m.question,
          options: Array.isArray(m.options) ? m.options : [],
          difficulty: m.difficulty || 'Intermediate',
          question_type: m.question_type || 'single_choice',
          source: m.source,
          created_at: m.created_at,
          updated_at: m.updated_at,
        };

        // CRITICAL SECURITY CHECK
        if (isAuthenticated) {
          item.correct_answer = m.correct_answer;
          item.explanation = m.explanation;
          item.clinical_pearl = m.clinical_pearl;
          item.rationale = m.rationale;
        }

        return item;
      });

      return {
        mcqs: sanitizedMcqs,
        total: count || sanitizedMcqs.length,
        totalPages: Math.ceil((count || sanitizedMcqs.length) / limit),
      };
    }
  } catch (err) {
    console.warn('[SEO] getPublicTopicMcqs error:', err);
  }

  // Fallback mock questions for topic if DB has not yet populated it
  const sampleItems: McqSeoData[] = [
    {
      id: `sample-mcq-${page}-1`,
      slug: `high-yield-clinical-scenario-1`,
      question: `A 45-year-old patient presents with acute onset dyspnea and chest discomfort. Which diagnostic biomarker offers the highest specificity for myocardial cellular injury in this acute window?`,
      options: [
        'High-sensitivity Cardiac Troponin (hs-cTnI / hs-cTnT)',
        'Creatine Kinase Muscle-Brain Isoenzyme (CK-MB) in first 60 minutes',
        'Serum Lactate Dehydrogenase (LDH) isoenzyme 1:2 reversal',
        'Myoglobin qualitative point-of-care rapid lateral flow assay',
      ],
      difficulty: 'Expert',
      created_at: new Date().toISOString(),
    },
    {
      id: `sample-mcq-${page}-2`,
      slug: `pathophysiological-mechanism-differential-2`,
      question: `In evaluating refractory secondary hypertension with hypokalemia and metabolic alkalosis, which laboratory index is essential to differentiate primary aldosteronism from renal artery stenosis?`,
      options: [
        'Plasma Aldosterone Concentration to Plasma Renin Activity (PAC:PRA) Ratio',
        '24-hour urinary free cortisol excretion rate under baseline stress',
        'Serum intact parathyroid hormone (PTH) and ionized calcium level',
        'Fractional excretion of sodium (FENa) and urinary specific gravity',
      ],
      difficulty: 'Advanced',
      created_at: new Date().toISOString(),
    },
  ];

  return {
    mcqs: sampleItems,
    total: sampleItems.length,
    totalPages: 1,
  };
}

/**
 * Fetch a single MCQ by hierarchical slugs or fallback slug
 * 
 * SECURITY MANDATE:
 * Strips correct_answer and explanation unless isAuthenticated is true.
 */
export async function getPublicMcqByHierarchicalSlugs({
  examSlug,
  subjectSlug,
  topicSlug,
  mcqSlug,
  isAuthenticated = false,
}: {
  examSlug: string;
  subjectSlug: string;
  topicSlug: string;
  mcqSlug: string;
  isAuthenticated?: boolean;
}): Promise<{
  exam: ExamSeoData;
  subject: SubjectSeoData;
  topic: TopicSeoData;
  mcq: McqSeoData;
  isIndexable: boolean;
  relatedMcqs: McqSeoData[];
} | null> {
  const topicResult = await getPublicTopicBySlug(examSlug, subjectSlug, topicSlug);
  if (!topicResult) return null;

  const { exam, subject, topic } = topicResult;
  const supabase = getSupabaseAdmin();
  const cleanMcqSlug = mcqSlug.toLowerCase().trim();

  let mcqRecord: any = null;

  try {
    // 1. Search by slug or UUID
    const { data: dbMcq } = await (supabase as any)
      .from('mcqs')
      .select('id, slug, question, options, difficulty, question_type, source, status, visibility, created_at, updated_at, correct_answer, explanation, clinical_pearl, rationale')
      .or(`slug.eq.${cleanMcqSlug},id.eq.${cleanMcqSlug}`)
      .maybeSingle();

    if (dbMcq) {
      mcqRecord = dbMcq;
    }
  } catch (err) {
    console.warn('[SEO] getPublicMcq lookup failed:', err);
  }

  // Fallback sample if not found in DB
  if (!mcqRecord) {
    const readableQuestion = mcqSlug
      .replace(/-/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());

    mcqRecord = {
      id: `mcq-${cleanMcqSlug}`,
      slug: cleanMcqSlug,
      question: `Regarding ${readableQuestion}: Which clinical diagnostic or therapeutic principle represents the current first-line standard of care?`,
      options: [
        `Targeted risk-stratified protocol with early biomarker confirmation and monitoring`,
        `Empirical broad-spectrum monotherapy without baseline organ function assessment`,
        `Immediate surgical exploration without initial non-invasive imaging`,
        `Complete observational withholding of pharmacological support for 72 hours`,
      ],
      difficulty: 'Expert',
      status: 'approved',
      visibility: 'PUBLIC_CANONICAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      correct_answer: `Targeted risk-stratified protocol with early biomarker confirmation and monitoring`,
      explanation: `Modern guidelines require rapid risk stratification, pathognomonic biomarker confirmation, and organ-preserving targeted intervention.`,
    };
  }

  // Quality gate classification
  const quality = evaluateMcqQuality({
    ...mcqRecord,
    exam_slug: exam.slug,
    subject_slug: subject.slug,
    topic_slug: topic.slug,
  });

  const sanitizedMcq: McqSeoData = {
    id: mcqRecord.id,
    slug: mcqRecord.slug || cleanMcqSlug,
    question: mcqRecord.question,
    options: Array.isArray(mcqRecord.options) ? mcqRecord.options : [],
    difficulty: mcqRecord.difficulty || 'Intermediate',
    question_type: mcqRecord.question_type || 'single_choice',
    source: mcqRecord.source,
    created_at: mcqRecord.created_at,
    updated_at: mcqRecord.updated_at,
    exam_name: exam.name,
    exam_slug: exam.slug,
    subject_name: subject.name,
    subject_slug: subject.slug,
    topic_name: topic.name,
    topic_slug: topic.slug,
    seo_indexable: quality.isIndexable,
  };

  // CRITICAL SECURITY ENFORCEMENT
  if (isAuthenticated) {
    sanitizedMcq.correct_answer = mcqRecord.correct_answer;
    sanitizedMcq.explanation = mcqRecord.explanation;
    sanitizedMcq.clinical_pearl = mcqRecord.clinical_pearl;
    sanitizedMcq.rationale = mcqRecord.rationale;
  }

  // Fetch related MCQs from same topic
  const { mcqs: related } = await getPublicTopicMcqs({
    topicId: topic.id,
    examId: exam.id,
    limit: 4,
    isAuthenticated: false,
  });

  const relatedFiltered = related.filter((m) => m.id !== sanitizedMcq.id);

  return {
    exam,
    subject,
    topic,
    mcq: sanitizedMcq,
    isIndexable: quality.isIndexable,
    relatedMcqs: relatedFiltered,
  };
}

/**
 * Fetch public Blog post by slug
 */
export async function getPublicBlogBySlug(slug: string): Promise<BlogSeoData | null> {
  const cleanSlug = slug.toLowerCase().trim();
  const supabase = getSupabaseAdmin();

  // Try DB first
  try {
    const { data: dbBlog } = await (supabase as any)
      .from('blogs')
      .select('*')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (dbBlog) {
      return dbBlog;
    }
  } catch (err) {
    // Ignore if table does not exist
  }

  // Fallback to CANONICAL_BLOG_POSTS
  const post = CANONICAL_BLOG_POSTS.find((p) => p.slug === cleanSlug);
  return post || null;
}

/**
 * Fetch all public Blog posts
 */
export async function getAllPublicBlogs(): Promise<BlogSeoData[]> {
  const supabase = getSupabaseAdmin();
  try {
    const { data: dbBlogs } = await (supabase as any)
      .from('blogs')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (dbBlogs && dbBlogs.length > 0) {
      return dbBlogs;
    }
  } catch (err) {
    // Ignore
  }

  return CANONICAL_BLOG_POSTS.filter((p) => p.status === 'published');
}

/**
 * Get all indexable public URLs for XML sitemaps
 */
export async function getAllIndexableUrls(): Promise<{
  exams: Array<{ url: string; lastmod: string }>;
  subjects: Array<{ url: string; lastmod: string }>;
  topics: Array<{ url: string; lastmod: string }>;
  mcqs: Array<{ url: string; lastmod: string }>;
  notes: Array<{ url: string; lastmod: string }>;
  blogs: Array<{ url: string; lastmod: string }>;
}> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const examsList: Array<{ url: string; lastmod: string }> = [];
  const subjectsList: Array<{ url: string; lastmod: string }> = [];
  const topicsList: Array<{ url: string; lastmod: string }> = [];
  const mcqsList: Array<{ url: string; lastmod: string }> = [];
  const notesList: Array<{ url: string; lastmod: string }> = [];
  const blogsList: Array<{ url: string; lastmod: string }> = [];

  // 1. Exams
  for (const reg of GLOBAL_EXAM_REGISTRY) {
    examsList.push({
      url: `/${reg.slug}`,
      lastmod: now,
    });

    if (reg.defaultSubjects) {
      for (const subj of reg.defaultSubjects) {
        const subjSlug = slugify(subj);
        subjectsList.push({
          url: `/${reg.slug}/${subjSlug}`,
          lastmod: now,
        });

        // Add core topics
        const defaultTopics = ['fundamentals', 'clinical-scenarios', 'pharmacotherapy', 'board-pearls'];
        for (const top of defaultTopics) {
          topicsList.push({
            url: `/${reg.slug}/${subjSlug}/${top}`,
            lastmod: now,
          });
          // Topic MCQ hub
          topicsList.push({
            url: `/${reg.slug}/${subjSlug}/${top}/mcq`,
            lastmod: now,
          });
        }
      }
    }
  }

  // 2. Real DB MCQs
  try {
    const { data: dbMcqs } = await (supabase as any)
      .from('mcqs')
      .select('id, slug, updated_at, exams(slug), exam_subjects(slug, name), exam_topics(slug, name)')
      .eq('status', 'approved')
      .limit(500);

    if (dbMcqs) {
      for (const m of dbMcqs) {
        const eSlug = m.exams?.slug || 'neet-pg';
        const sSlug = m.exam_subjects?.slug || slugify(m.exam_subjects?.name || 'general-medicine');
        const tSlug = m.exam_topics?.slug || slugify(m.exam_topics?.name || 'clinical-cases');
        const mSlug = m.slug || m.id;
        mcqsList.push({
          url: `/${eSlug}/${sSlug}/${tSlug}/mcq/${mSlug}`,
          lastmod: m.updated_at || now,
        });
      }
    }
  } catch (err) {
    console.warn('[SEO] Sitemap DB query error:', err);
  }

  // 3. Blogs
  const blogs = await getAllPublicBlogs();
  for (const b of blogs) {
    blogsList.push({
      url: `/blog/${b.slug}`,
      lastmod: b.updated_at || b.published_at || now,
    });
  }

  return {
    exams: examsList,
    subjects: subjectsList,
    topics: topicsList,
    mcqs: mcqsList,
    notes: notesList,
    blogs: blogsList,
  };
}
