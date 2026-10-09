export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface McqSeoData {
  id: string;
  slug: string;
  question: string;
  options: string[];
  difficulty: string;
  question_type?: string;
  source?: string;
  ai_generated?: boolean;
  reviewed?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
  exam_id?: string;
  exam_name?: string;
  exam_slug?: string;
  subject_id?: string;
  subject_name?: string;
  subject_slug?: string;
  topic_id?: string;
  topic_name?: string;
  topic_slug?: string;
  seo_title?: string;
  seo_description?: string;
  seo_indexable?: boolean;
  canonical_url?: string;
  // Note: correct_answer & explanation are deliberately optional / omitted for public views
  correct_answer?: string;
  explanation?: string;
  clinical_pearl?: string;
  rationale?: string;
}

export interface ExamSeoData {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
  difficulty?: string;
  question_count?: number;
  time_limit_mins?: number;
  official_website?: string | null;
  created_at?: string;
  updated_at?: string;
  subjects_count?: number;
  topics_count?: number;
  mcqs_count?: number;
  notes_count?: number;
  verification_status?: string;
}

export interface SubjectSeoData {
  id: string;
  exam_id: string;
  name: string;
  slug: string;
  description?: string | null;
  weight_percentage?: number;
  topic_count?: number;
  exam_name?: string;
  exam_slug?: string;
  topics?: Array<{ id: string; name: string; slug: string; description?: string }>;
  mcqs_count?: number;
  notes_count?: number;
}

export interface TopicSeoData {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description?: string | null;
  level?: string;
  target_weight?: number;
  learning_objectives?: string[];
  estimated_study_mins?: number;
  exam_id?: string;
  exam_name?: string;
  exam_slug?: string;
  subject_name?: string;
  subject_slug?: string;
  mcqs_count?: number;
  notes_count?: number;
  flashcards_count?: number;
  updated_at?: string;
}

export interface NoteSeoData {
  id: string;
  slug?: string;
  title: string;
  content: string;
  summary?: string;
  note_type?: string;
  exam_id?: string;
  exam_name?: string;
  exam_slug?: string;
  subject_id?: string;
  subject_name?: string;
  subject_slug?: string;
  topic_id?: string;
  topic_name?: string;
  topic_slug?: string;
  author_source?: string;
  created_at?: string;
  updated_at?: string;
  seo_indexable?: boolean;
}

export interface FlashcardSeoData {
  id: string;
  slug?: string;
  front: string;
  back: string;
  category?: string;
  exam_id?: string;
  exam_name?: string;
  exam_slug?: string;
  subject_id?: string;
  subject_name?: string;
  subject_slug?: string;
  topic_id?: string;
  topic_name?: string;
  topic_slug?: string;
  created_at?: string;
  updated_at?: string;
  seo_indexable?: boolean;
}

export interface BlogSeoData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author_name: string;
  author_title?: string;
  reviewer_name?: string;
  reviewer_credentials?: string;
  category: string;
  tags: string[];
  cover_image?: string;
  published_at: string;
  updated_at: string;
  reading_time_mins: number;
  status: 'draft' | 'published' | 'archived';
  seo_title?: string;
  seo_description?: string;
  seo_indexable?: boolean;
  canonical_url?: string;
}

export interface SeoHealthAuditResult {
  overallScore: number;
  totalPublished: number;
  indexableCount: number;
  noindexCount: number;
  categories: {
    technical: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    metadata: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    indexability: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    internalLinking: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    structuredData: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    contentQuality: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
    sitemapCoverage: { score: number; max: number; status: 'good' | 'warning' | 'error'; issues: string[] };
  };
  metrics: {
    examsCount: number;
    subjectsCount: number;
    topicsCount: number;
    mcqsCount: number;
    notesCount: number;
    flashcardsCount: number;
    blogsCount: number;
    missingTitleCount: number;
    missingDescriptionCount: number;
    missingCanonicalCount: number;
    duplicateCanonicalCount: number;
    missingOgImageCount: number;
    missingStructuredDataCount: number;
    orphanPagesCount: number;
    thinContentCount: number;
  };
  lastAuditAt: string;
}
