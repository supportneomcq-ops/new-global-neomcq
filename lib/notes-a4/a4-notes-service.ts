import { getSupabaseAdmin } from '@/lib/supabase';
import { AIGateway } from '@/lib/ai-gateway';
import { z } from 'zod';
import {
  A4NotesDocument,
  ContentScope,
  UserHighlight,
  UserAnnotation,
  UserA4NotesData,
} from '@/lib/types/a4-notes';

export interface HierarchyValidationResult {
  valid: boolean;
  error?: string;
  examName?: string;
  subjectName?: string;
  topicName?: string;
  subtopicName?: string | null;
  availableSubtopics?: string[];
}

export const a4CalloutSchema = z.object({
  type: z.enum(['key_insight', 'high_yield_point', 'exam_trap', 'formula', 'memory_aid', 'comparison']),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const a4TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const a4ImageOrDiagramSchema = z.object({
  url: z.string().optional(),
  svgXml: z.string().optional(),
  altText: z.string(),
  caption: z.string().optional(),
  placement: z.enum(['center', 'left', 'right', 'full']).optional(),
  widthSize: z.enum(['small', 'medium', 'large', 'full']).optional(),
  diagramType: z.string().optional(),
});

export const a4ProcessStepSchema = z.object({
  stepNumber: z.number().optional(),
  title: z.string(),
  description: z.string().optional(),
});

export const a4ProcessFlowSchema = z.object({
  title: z.string().optional(),
  steps: z.array(a4ProcessStepSchema),
  direction: z.enum(['horizontal', 'vertical']).optional(),
});

export const a4FormulaOrRuleSchema = z.object({
  title: z.string(),
  expression: z.string(),
  explanation: z.string().optional(),
  variablesOrConditions: z
    .array(
      z.object({
        name: z.string(),
        meaning: z.string(),
      })
    )
    .optional(),
});

export const a4MemoryAidSchema = z.object({
  title: z.string(),
  mnemonic: z.string(),
  expansion: z
    .array(
      z.object({
        key: z.string(),
        meaning: z.string(),
      })
    )
    .optional(),
  context: z.string().optional(),
});

export const a4BlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'heading',
    'paragraph',
    'bullet_list',
    'numbered_list',
    'callout',
    'comparison_table',
    'formula_or_rule',
    'memory_aid',
    'checklist',
    'process_flow',
    'image_or_diagram',
    'quote',
  ]),
  content: z.string().optional(),
  level: z.enum([1, 2, 3] as any).optional(),
  items: z.array(z.string()).optional(),
  callout: a4CalloutSchema.optional(),
  table: a4TableSchema.optional(),
  formula: a4FormulaOrRuleSchema.optional(),
  memoryAid: a4MemoryAidSchema.optional(),
  processFlow: a4ProcessFlowSchema.optional(),
  imageOrDiagram: a4ImageOrDiagramSchema.optional(),
});

export const a4SectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  contentMarkdown: z.string().optional(),
  callouts: z.array(a4CalloutSchema).optional(),
  table: a4TableSchema.optional(),
  checklist: z.array(z.string()).optional(),
  blocks: z.array(a4BlockSchema).optional(),
});

export const a4PageSchema = z.object({
  pageNumber: z.number().min(1),
  pageTitle: z.string().min(1),
  sections: z.array(a4SectionSchema).min(1),
});

export const a4TableOfContentsItemSchema = z.object({
  id: z.string().min(1),
  pageNumber: z.number().min(1),
  title: z.string().min(1),
});

export const a4NotesDocumentSchema = z.object({
  id: z.string().optional(),
  contentScope: z.enum(['TOPIC', 'SUBTOPIC']),
  examId: z.string(),
  examName: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  topicId: z.string(),
  topicName: z.string(),
  subtopicId: z.string().nullable().optional(),
  subtopicName: z.string().nullable().optional(),
  availableSubtopics: z.array(z.string()).optional(),
  documentTitle: z.string().min(3),
  totalPages: z.number().min(3),
  version: z.number().min(1),
  isCurrent: z.boolean().optional(),
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
  tableOfContents: z.array(a4TableOfContentsItemSchema).min(1),
  pages: z.array(a4PageSchema).min(3),
});

/**
 * Validates the strict hierarchy: Exam -> Subject -> Topic -> Subtopic (optional)
 * Fails safely if IDs are cross-linked or mismatched.
 */
export async function validateCurriculumHierarchy(params: {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
}): Promise<HierarchyValidationResult> {
  const { examId, subjectId, topicId, subtopicId } = params;
  const adminClient = getSupabaseAdmin();

  // 1. Verify Exam
  const { data: exam, error: examErr } = await adminClient
    .from('exams')
    .select('id, name')
    .eq('id', examId)
    .maybeSingle();

  if (examErr || !exam) {
    return { valid: false, error: 'Invalid exam specified or exam not found.' };
  }

  // 2. Verify Subject belongs to Exam
  const { data: subject, error: subErr } = await adminClient
    .from('exam_subjects')
    .select('id, name, exam_id')
    .eq('id', subjectId)
    .eq('exam_id', examId)
    .maybeSingle();

  if (subErr || !subject) {
    return { valid: false, error: 'Invalid subject specified or subject does not belong to the given exam.' };
  }

  // 3. Verify Topic belongs to Subject
  const { data: topic, error: topErr } = await adminClient
    .from('exam_topics')
    .select('id, name, subject_id')
    .eq('id', topicId)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (topErr || !topic) {
    return { valid: false, error: 'Invalid topic specified or topic does not belong to the given subject.' };
  }

  // 4. Fetch all available subtopics for this topic
  const { data: subtopicsList } = await adminClient
    .from('exam_subtopics')
    .select('id, name')
    .eq('topic_id', topicId);

  const availableSubtopics = (subtopicsList || []).map((s) => s.name);

  // 5. Verify Subtopic if provided
  let subtopicName: string | null = null;
  if (subtopicId) {
    const { data: subtopicRecord, error: subtopErr } = await adminClient
      .from('exam_subtopics')
      .select('id, name, topic_id')
      .eq('id', subtopicId)
      .eq('topic_id', topicId)
      .maybeSingle();

    if (subtopErr || !subtopicRecord) {
      return { valid: false, error: 'Invalid subtopic specified or subtopic does not belong to the given topic.' };
    }
    subtopicName = subtopicRecord.name;
  }

  return {
    valid: true,
    examName: exam.name,
    subjectName: subject.name,
    topicName: topic.name,
    subtopicName,
    availableSubtopics,
  };
}

/**
 * Fetches existing canonical A4 notes and evaluates 30-day freshness.
 */
export async function getCanonicalA4NoteRecord(params: {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  contentScope: ContentScope;
}): Promise<{
  note: A4NotesDocument | null;
  isFresh: boolean;
  expired: boolean;
  version: number;
}> {
  const { examId, subjectId, topicId, subtopicId, contentScope } = params;
  const adminClient = getSupabaseAdmin();

  let query = adminClient
    .from('canonical_a4_notes')
    .select('*')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .eq('topic_id', topicId)
    .eq('content_scope', contentScope)
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1);

  if (contentScope === 'SUBTOPIC' && subtopicId) {
    query = query.eq('subtopic_id', subtopicId);
  } else {
    query = query.is('subtopic_id', null);
  }

  const { data: record, error } = await query.maybeSingle();

  if (error || !record) {
    return { note: null, isFresh: false, expired: false, version: 1 };
  }

  const expiresAtMs = new Date(record.expires_at).getTime();
  const nowMs = Date.now();
  const isFresh = expiresAtMs > nowMs;
  const expired = !isFresh;

  const document: A4NotesDocument = {
    id: record.id,
    contentScope: record.content_scope,
    examId: record.exam_id,
    examName: '', // populated from request context
    subjectId: record.subject_id,
    subjectName: '',
    topicId: record.topic_id,
    topicName: '',
    subtopicId: record.subtopic_id,
    subtopicName: null,
    documentTitle: record.document_title,
    totalPages: record.total_pages,
    version: record.version,
    isCurrent: record.is_current,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    tableOfContents: record.table_of_contents || [],
    pages: record.document_content || [],
  };

  return {
    note: document,
    isFresh,
    expired,
    version: record.version,
  };
}

/**
 * Generates an exam-agnostic, minimum 3-page A4 study manuscript via Gemini API.
 */
export async function generateA4NotesManuscript(params: {
  userId: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string | null;
  subtopicName?: string | null;
  availableSubtopics?: string[];
  contentScope: ContentScope;
  targetVersion?: number;
}): Promise<A4NotesDocument> {
  const {
    userId,
    examId,
    examName,
    subjectId,
    subjectName,
    topicId,
    topicName,
    subtopicId = null,
    subtopicName = null,
    availableSubtopics = [],
    contentScope,
    targetVersion = 1,
  } = params;

  const scopeDescription =
    contentScope === 'TOPIC'
      ? `Main Topic: "${topicName}" covering subtopics: [${availableSubtopics.join(', ')}]`
      : `Subtopic: "${subtopicName}" within Main Topic: "${topicName}"`;

  const prompt = `Generate a high-yield, published-quality exam study manuscript for:
- Exam: ${examName}
- Subject: ${subjectName}
- ${scopeDescription}

Provide AT LEAST 3 FULLY POPULATED PAGES (3 to 5 pages) in strict JSON with this exact structure:
{
  "documentTitle": "High-Yield Study Manuscript: ${topicName}${subtopicName ? ' - ' + subtopicName : ''}",
  "totalPages": 3,
  "tableOfContents": [
    { "id": "sec-1-1", "pageNumber": 1, "title": "1. Executive Summary & Foundational Principles" },
    { "id": "sec-2-1", "pageNumber": 2, "title": "2. Comparative Matrix & Process Flow" },
    { "id": "sec-3-1", "pageNumber": 3, "title": "3. Exam Traps & Problem-Solving Checklist" }
  ],
  "pages": [
    {
      "pageNumber": 1,
      "pageTitle": "Executive Summary & Core Principles",
      "sections": [
        {
          "id": "sec-1-1",
          "heading": "1.1 Core Principles & High-Yield Blueprint",
          "contentMarkdown": "Comprehensive overview of fundamental principles for ${examName}...",
          "callouts": [
            {
              "type": "key_insight",
              "title": "Fundamental Concept",
              "content": "Key exam insight formulated specifically for this topic."
            }
          ],
          "blocks": [
            {
              "id": "blk-1-1-1",
              "type": "paragraph",
              "content": "Essential foundational rules and principles for ${examName} in ${subjectName}."
            },
            {
              "id": "blk-1-1-2",
              "type": "formula_or_rule",
              "formula": {
                "title": "Core Formula / Framework Rule",
                "expression": "Primary Rule or Mathematical Expression",
                "explanation": "Critical formula breakdown tested frequently in ${examName}.",
                "variablesOrConditions": [
                  { "name": "Variable A", "meaning": "Primary factor or parameter" },
                  { "name": "Variable B", "meaning": "Secondary constraint" }
                ]
              }
            }
          ],
          "checklist": ["Verify essential concepts", "Review fundamental rules"]
        }
      ]
    },
    {
      "pageNumber": 2,
      "pageTitle": "Comparative Matrix & Process Workflows",
      "sections": [
        {
          "id": "sec-2-1",
          "heading": "2.1 Distinguishing Features & Comparative Analysis",
          "contentMarkdown": "Key differentiators tested on ${examName}...",
          "table": {
            "headers": ["Category / Concept", "Primary Feature", "Exam Differentiator"],
            "rows": [
              ["Concept A", "Key Characteristic 1", "Distinguishing Criteria 1"],
              ["Concept B", "Key Characteristic 2", "Distinguishing Criteria 2"]
            ]
          },
          "blocks": [
            {
              "id": "blk-2-1-1",
              "type": "process_flow",
              "processFlow": {
                "title": "Step-by-Step Diagnostic & Problem-Solving Algorithm",
                "direction": "vertical",
                "steps": [
                  { "stepNumber": 1, "title": "Initial Assessment", "description": "Identify primary inputs or symptoms." },
                  { "stepNumber": 2, "title": "Rule Application / Calculation", "description": "Apply core formula or legal/technical test." },
                  { "stepNumber": 3, "title": "Final Verification", "description": "Confirm conclusion matches criteria." }
                ]
              }
            },
            {
              "id": "blk-2-1-2",
              "type": "memory_aid",
              "memoryAid": {
                "title": "High-Yield Mnemonic",
                "mnemonic": "PAVE",
                "expansion": [
                  { "key": "P", "meaning": "Primary Principle" },
                  { "key": "A", "meaning": "Analysis Step" },
                  { "key": "V", "meaning": "Verification Criteria" },
                  { "key": "E", "meaning": "Execution Method" }
                ],
                "context": "Use this mnemonic to quickly recall the sequence on exam questions."
              }
            }
          ]
        }
      ]
    },
    {
      "pageNumber": 3,
      "pageTitle": "Exam Traps & Final Revision Checklist",
      "sections": [
        {
          "id": "sec-3-1",
          "heading": "3.1 Common Exam Traps & Rapid Recall",
          "contentMarkdown": "Critical pitfalls and distractor choices commonly presented on ${examName}...",
          "callouts": [
            {
              "type": "exam_trap",
              "title": "Exam Trap Warning",
              "content": "Commonly confused distractor pattern on ${examName}."
            }
          ],
          "checklist": [
            "Check for classic trap phrasing",
            "Verify calculation / application rule",
            "Confirm primary solution criteria"
          ]
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Make content exam-agnostic to match the domain (e.g. formulas for finance/engineering, law principles for legal, clinical facts for medical, key shortcuts for entrance exams).
2. Exactly 3 to 5 pages. Each page MUST contain populated sections.
3. Callout types allowed: "key_insight", "high_yield_point", "exam_trap", "formula", "memory_aid", "comparison".
4. Support structured visual blocks in "blocks" including "paragraph", "heading", "bullet_list", "callout", "comparison_table", "formula_or_rule", "memory_aid", "checklist", "process_flow", "image_or_diagram", "quote".`;

  const systemInstruction = `You are NeoMCQ AI Engine, an expert exam content generator creating authoritative study manuscripts for global examination formats. Always output valid JSON.`;

  const genResult = await AIGateway.generateContent({
    userId,
    taskType: 'a4_notes_generation',
    prompt,
    systemInstruction,
    preferredModel: 'gemini-3.5-flash',
  });

  const parsed = genResult.parsedJson || JSON.parse(genResult.text);

  // Validate output against schema
  const validated = a4NotesDocumentSchema.safeParse({
    contentScope,
    examId,
    examName,
    subjectId,
    subjectName,
    topicId,
    topicName,
    subtopicId,
    subtopicName,
    availableSubtopics,
    documentTitle: parsed.documentTitle || `High-Yield Notes: ${topicName}`,
    totalPages: parsed.totalPages || (parsed.pages?.length ?? 3),
    version: targetVersion,
    tableOfContents: parsed.tableOfContents || [],
    pages: parsed.pages || [],
  });

  if (!validated.success) {
    throw new Error(`Generated A4 document failed schema validation: ${validated.error.issues[0]?.message}`);
  }

  return validated.data as A4NotesDocument;
}

/**
 * Saves or updates canonical A4 notes document in Supabase.
 */
export async function saveCanonicalA4Note(document: A4NotesDocument): Promise<string> {
  const adminClient = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Deactivate any existing current record for this exact scope
  let deactivateQuery = adminClient
    .from('canonical_a4_notes')
    .update({ is_current: false, updated_at: new Date().toISOString() })
    .eq('exam_id', document.examId)
    .eq('subject_id', document.subjectId)
    .eq('topic_id', document.topicId)
    .eq('content_scope', document.contentScope)
    .eq('is_current', true);

  if (document.contentScope === 'SUBTOPIC' && document.subtopicId) {
    deactivateQuery = deactivateQuery.eq('subtopic_id', document.subtopicId);
  } else {
    deactivateQuery = deactivateQuery.is('subtopic_id', null);
  }

  await deactivateQuery;

  // 2. Insert new canonical document as is_current: true
  const { data, error } = await adminClient
    .from('canonical_a4_notes')
    .insert({
      exam_id: document.examId,
      subject_id: document.subjectId,
      topic_id: document.topicId,
      subtopic_id: document.contentScope === 'SUBTOPIC' ? document.subtopicId : null,
      content_scope: document.contentScope,
      document_title: document.documentTitle,
      total_pages: document.totalPages,
      document_content: document.pages,
      table_of_contents: document.tableOfContents,
      version: document.version,
      is_current: true,
      generation_status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to store canonical A4 note in database: ${error?.message}`);
  }

  return data.id;
}

/**
 * Retrieves user-specific highlights and annotations for a document.
 */
export async function getUserA4NotesData(
  userId: string,
  documentId: string
): Promise<UserA4NotesData> {
  const adminClient = getSupabaseAdmin();

  const [{ data: highlights }, { data: annotations }] = await Promise.all([
    adminClient
      .from('user_a4_highlights')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId),
    adminClient
      .from('user_a4_annotations')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId),
  ]);

  const mappedHighlights: UserHighlight[] = (highlights || []).map((h) => ({
    id: h.id,
    pageNumber: h.page_number,
    sectionId: h.section_id,
    selectedText: h.selected_text,
    color: h.color,
    createdAt: h.created_at,
  }));

  const mappedAnnotations: UserAnnotation[] = (annotations || []).map((a) => ({
    id: a.id,
    pageNumber: a.page_number,
    sectionId: a.section_id,
    noteText: a.note_text,
    createdAt: a.created_at,
  }));

  return {
    documentAssetId: documentId,
    highlights: mappedHighlights,
    annotations: mappedAnnotations,
  };
}
