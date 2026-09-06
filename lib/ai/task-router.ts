import { getSupabaseAdmin } from '../supabase/admin';
import type { TaskRoutingRule, AIProviderId } from './types';
import { ModelRegistry } from './model-registry';

export const CANONICAL_TASK_ROUTING_DEFAULTS: TaskRoutingRule[] = [
  {
    task_type: 'FIRST_CANONICAL_CONTENT_CREATION',
    display_name: 'First-Time Canonical Topic Generation',
    description: 'High-accuracy reasoning model for canonical exam content',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.7-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o',
    credit_cost: 3.0,
    temperature: 0.4,
    max_input_tokens: 16384,
    max_output_tokens: 8192,
    enabled: true,
  },
  {
    task_type: 'CONTENT_30_DAY_REFRESH',
    display_name: '30-Day Topic Content Refresh',
    description: 'High-yield reasoning model for scheduled canonical version refreshes',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.7-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o',
    credit_cost: 2.5,
    temperature: 0.4,
    max_input_tokens: 16384,
    max_output_tokens: 8192,
    enabled: true,
  },
  {
    task_type: 'DIFFICULT_MCQ_GENERATION',
    display_name: 'Difficult / Multi-Step Reasoning Questions',
    description: 'High-order complex questions with rigorous distractors',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.7-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o',
    credit_cost: 2.0,
    temperature: 0.5,
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    enabled: true,
  },
  {
    task_type: 'NORMAL_MCQ_GENERATION',
    display_name: 'Standard MCQ Generation',
    description: 'Fast, accurate single-choice board and exam questions',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 1.5,
    temperature: 0.6,
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    enabled: true,
  },
  {
    task_type: 'NOTE_GENERATION',
    display_name: 'High-Yield Comprehensive Notes',
    description: 'Structured markdown summaries and core revision sheets',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 2.0,
    temperature: 0.5,
    max_input_tokens: 8192,
    max_output_tokens: 6144,
    enabled: true,
  },
  {
    task_type: 'FLASHCARD_GENERATION',
    display_name: 'Active Recall Flashcards',
    description: 'Front/back rapid recall cards for exam preparation',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 1.0,
    temperature: 0.5,
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    enabled: true,
  },
  {
    task_type: 'STUDY_PLAN',
    display_name: 'Custom AI Study Plan & Timeline',
    description: 'Curriculum timeline, key target scheduling, and pacing',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 1.5,
    temperature: 0.7,
    max_input_tokens: 4096,
    max_output_tokens: 3072,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_SIMPLE',
    display_name: 'AI Tutor - Instant Doubt Clarification',
    description: 'Concise conceptual explanations and quick topic reviews',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.5,
    temperature: 0.6,
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_NORMAL',
    display_name: 'AI Tutor - Interactive Discussion',
    description: 'Conversational Socratic tutoring with logical feedback',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.75,
    temperature: 0.7,
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    enabled: true,
  },
  {
    task_type: 'AI_TUTOR_DIFFICULT',
    display_name: 'AI Tutor - Deep Conceptual Reasoning',
    description: 'Complex multi-step analytical reasoning and concept breakdown',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.7-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o',
    credit_cost: 2.0,
    temperature: 0.3,
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    enabled: true,
  },
  {
    task_type: 'ENTITY_RESOLUTION',
    display_name: 'Canonical Entity Resolution',
    description: 'Fast entity normalization, canonical topic matching, and aliases',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.1,
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'DUPLICATE_DETECTION',
    display_name: 'Topic & Question Duplicate Detection',
    description: 'Semantic duplicate detection across syllabus catalogs',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.1,
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'CONTENT_QUALITY_VALIDATION',
    display_name: 'Automated Content Quality Review',
    description: 'Syllabus alignment correctness, distractor audit, and quality standards',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.7-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o',
    credit_cost: 1.0,
    temperature: 0.2,
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    enabled: true,
  },
  {
    task_type: 'CONTENT_DEDUPLICATION',
    display_name: 'Catalog Deduplication Engine',
    description: 'High-throughput catalog cleansing and uniqueness verification',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.1,
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'CONTENT_METADATA_EXTRACTION',
    display_name: 'Syllabus Metadata & Taxonomy Extraction',
    description: 'Subject-topic categorization, taxonomy mapping, and difficulty indexing',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.1-flash-lite',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.2,
    max_input_tokens: 4096,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'EXAM_INTELLIGENCE',
    display_name: 'Exam Intelligence & Classification',
    description: 'Autonomous global examination discovery, syllabus verification, and validity classification',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.5,
    temperature: 0.2,
    max_input_tokens: 4096,
    max_output_tokens: 2048,
    enabled: true,
  },
  {
    task_type: 'CURRICULUM_RECONCILIATION',
    display_name: 'Curriculum & Hierarchy Reconciliation',
    description: 'Hierarchical Exam-Subject-Topic-Subtopic syllabus gap filling and canonical alignment',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 1.0,
    temperature: 0.3,
    max_input_tokens: 8192,
    max_output_tokens: 4096,
    enabled: true,
  },
  {
    task_type: 'STUDY_PLAN_GENERATION',
    display_name: 'High-Yield Adaptive Study Plan',
    description: 'Generates milestone schedules, daily tasks, and 5-day mock revision buffers',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 1.5,
    temperature: 0.6,
    max_input_tokens: 4096,
    max_output_tokens: 3072,
    enabled: true,
  },
  {
    task_type: 'ADD_SUBJECT',
    display_name: 'Add Missing Subject Validation',
    description: 'Validates and resolves new canonical subjects under a locked examination',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.2,
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'ADD_TOPIC',
    display_name: 'Add Missing Topic Validation',
    description: 'Validates and resolves new canonical topics under a locked exam and subject',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.2,
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    enabled: true,
  },
  {
    task_type: 'ADD_SUBTOPIC',
    display_name: 'Add Missing Subtopic Validation',
    description: 'Validates and resolves new canonical subtopics under a locked exam, subject, and topic',
    primary_provider: 'gemini',
    primary_model: 'gemini-3.5-flash',
    fallback_provider: 'openai',
    fallback_model: 'gpt-4o-mini',
    credit_cost: 0.25,
    temperature: 0.2,
    max_input_tokens: 2048,
    max_output_tokens: 1024,
    enabled: true,
  },
];

// Mapping for legacy or synonym task types
const TASK_TYPE_ALIASES: Record<string, string> = {
  FIRST_GENERATION: 'FIRST_CANONICAL_CONTENT_CREATION',
  TOPIC_CONTENT_REFRESH: 'CONTENT_30_DAY_REFRESH',
  MCQ_GENERATION: 'NORMAL_MCQ_GENERATION',
  SHORT_EXPLANATION: 'AI_TUTOR_SIMPLE',
  QUESTION_QUALITY_REVIEW: 'CONTENT_QUALITY_VALIDATION',
  CANONICAL_CLASSIFICATION: 'ENTITY_RESOLUTION',
  STUDY_PLAN: 'STUDY_PLAN_GENERATION',
  CURRICULUM_RECONCILE: 'CURRICULUM_RECONCILIATION',
  EXAM_RESOLVE: 'EXAM_INTELLIGENCE',
};

export class TaskRouter {
  private static rulesCache: Map<string, TaskRoutingRule> = new Map();
  private static isInitialized = false;

  public static normalizeTaskType(taskType: string): string {
    const clean = taskType.trim().toUpperCase();
    return TASK_TYPE_ALIASES[clean] || clean;
  }

  public static async initialize(): Promise<void> {
    if (this.isInitialized && this.rulesCache.size > 0) return;

    // 1. Seed defaults
    for (const rule of CANONICAL_TASK_ROUTING_DEFAULTS) {
      this.rulesCache.set(rule.task_type, { ...rule });
    }

    // 2. Load overrides from database
    try {
      const supabase: any = getSupabaseAdmin();
      const { data: dbRules, error } = await supabase
        .from('ai_task_routing')
        .select('*');

      if (!error && dbRules && dbRules.length > 0) {
        for (const row of dbRules) {
          const norm = this.normalizeTaskType(row.task_type);
          const existing: TaskRoutingRule = this.rulesCache.get(norm) || {
            task_type: norm,
            display_name: norm,
            description: norm,
            primary_provider: (row.primary_provider || 'gemini') as AIProviderId,
            primary_model: row.primary_model || 'gemini-3.5-flash',
            fallback_provider: (row.fallback_provider || 'openai') as AIProviderId,
            fallback_model: row.fallback_model || 'gpt-4o-mini',
            credit_cost: Number(row.credit_cost || 1.5),
            temperature: Number(row.temperature || 0.7),
            max_input_tokens: 8192,
            max_output_tokens: 4096,
            enabled: row.enabled ?? true,
          };

          this.rulesCache.set(norm, {
            ...existing,
            id: row.id,
            display_name: row.display_name || existing.display_name,
            description: row.description || existing.description,
            primary_provider: (row.primary_provider || existing.primary_provider) as AIProviderId,
            primary_model: row.primary_model || existing.primary_model,
            fallback_provider: (row.fallback_provider || existing.fallback_provider) as AIProviderId,
            fallback_model: row.fallback_model || existing.fallback_model,
            credit_cost: Number(row.credit_cost ?? existing.credit_cost),
            temperature: Number(row.temperature ?? existing.temperature),
            max_input_tokens: row.max_input_tokens || existing.max_input_tokens,
            max_output_tokens: row.max_output_tokens || existing.max_output_tokens,
            enabled: row.enabled ?? existing.enabled,
          });
        }
      }
    } catch (err) {
      console.warn('TaskRouter: Could not load ai_task_routing from DB, using in-memory defaults:', err);
    }

    this.isInitialized = true;
  }

  public static async getAllRules(): Promise<TaskRoutingRule[]> {
    await this.initialize();
    return Array.from(this.rulesCache.values());
  }

  public static async getRuleForTask(taskType: string): Promise<TaskRoutingRule> {
    await this.initialize();
    const normalized = this.normalizeTaskType(taskType);
    const rule = this.rulesCache.get(normalized);

    if (rule) return rule;

    // Fallback standard default if unrecognized
    return {
      task_type: normalized,
      display_name: normalized,
      primary_provider: 'gemini',
      primary_model: 'gemini-3.5-flash',
      fallback_provider: 'openai',
      fallback_model: 'gpt-4o-mini',
      credit_cost: 1.5,
      temperature: 0.7,
      max_input_tokens: 8192,
      max_output_tokens: 4096,
      enabled: true,
    };
  }

  /**
   * Resolves safe active verified models for execution
   */
  public static async resolveExecutableRoute(
    taskType: string,
    preferredProvider?: AIProviderId,
    preferredModel?: string
  ): Promise<{
    primaryProvider: AIProviderId;
    primaryModel: string;
    fallbackProvider: AIProviderId;
    fallbackModel: string;
    creditCost: number;
    temperature: number;
    maxOutputTokens: number;
  }> {
    const rule = await this.getRuleForTask(taskType);

    let primaryProvider = preferredProvider || rule.primary_provider;
    let primaryModel = preferredModel || rule.primary_model;
    let fallbackProvider = rule.fallback_provider;
    let fallbackModel = rule.fallback_model;

    // Verify against model registry to avoid routing to inactive or non-existent models
    const primaryMeta = await ModelRegistry.getModel(primaryProvider, primaryModel);
    if (!primaryMeta || !primaryMeta.active) {
      // Find another active verified model for provider
      const available = await ModelRegistry.getVerifiedActiveModels(primaryProvider);
      if (available.length > 0) {
        primaryModel = available[0].model_id;
      } else {
        // Switch provider entirely to fallback
        primaryProvider = rule.fallback_provider;
        primaryModel = rule.fallback_model;
      }
    }

    const fallbackMeta = await ModelRegistry.getModel(fallbackProvider, fallbackModel);
    if (!fallbackMeta || !fallbackMeta.active) {
      const available = await ModelRegistry.getVerifiedActiveModels(fallbackProvider);
      if (available.length > 0) {
        fallbackModel = available[0].model_id;
      } else {
        // Use primary provider's backup model as fallback
        const primaryBackups = await ModelRegistry.getVerifiedActiveModels(primaryProvider);
        if (primaryBackups.length > 1) {
          fallbackProvider = primaryProvider;
          fallbackModel = primaryBackups[1].model_id;
        }
      }
    }

    return {
      primaryProvider,
      primaryModel,
      fallbackProvider,
      fallbackModel,
      creditCost: rule.credit_cost,
      temperature: rule.temperature,
      maxOutputTokens: rule.max_output_tokens || 4096,
    };
  }

  public static async updateRule(
    taskType: string,
    updates: Partial<TaskRoutingRule>
  ): Promise<TaskRoutingRule> {
    await this.initialize();
    const normalized = this.normalizeTaskType(taskType);
    const existing = await this.getRuleForTask(normalized);

    const updated: TaskRoutingRule = {
      ...existing,
      ...updates,
      task_type: normalized,
      updated_at: new Date().toISOString(),
    };

    this.rulesCache.set(normalized, updated);

    try {
      const supabase: any = getSupabaseAdmin();
      await supabase.from('ai_task_routing').upsert(
        {
          task_type: normalized,
          display_name: updated.display_name,
          description: updated.description,
          primary_provider: updated.primary_provider,
          primary_model: updated.primary_model,
          fallback_provider: updated.fallback_provider,
          fallback_model: updated.fallback_model,
          credit_cost: updated.credit_cost,
          temperature: updated.temperature,
          max_input_tokens: updated.max_input_tokens,
          max_output_tokens: updated.max_output_tokens,
          enabled: updated.enabled,
          updated_at: updated.updated_at,
        },
        { onConflict: 'task_type' }
      );
    } catch (err) {
      console.warn('TaskRouter: Failed to persist routing rule to DB:', err);
    }

    return updated;
  }
}
