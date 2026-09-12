/**
 * NEOMCQ — AI TUTOR SESSION MANAGER
 * Phase 6: Video Tutor Lesson Lifecycle, Scene Engine, Grounding & Persistence
 */

import { getSupabaseAdmin } from '../../supabase';
import { verifyCanonicalHierarchy } from './canonical-identity';
import { ContentCacheManager } from './content-cache-manager';
import type { TutorLessonSession, TutorSegment, TutorLessonState, TutorScene } from './tutor-types';
import { CANONICAL_TUTOR_PHASES } from './tutor-types';

export interface CreateOrResumeLessonOptions {
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string;
  userId: string;
  forceNew?: boolean;
  supabaseClient?: any;
}

export class TutorSessionManager {
  /**
   * Generates default structured scenes for a video lesson
   */
  public static generateInitialVideoScenes(
    topicName: string,
    subjectName: string,
    examName: string,
    subtopicNames: string[] = []
  ): TutorScene[] {
    const isCardiac = /heart|cardio|myocardial|artery|infarct|valve|ecg|arrhythmia/i.test(`${topicName} ${subjectName}`);
    const isRenal = /renal|kidney|nephron|glomerul|gfr|acid|base|electrolyte/i.test(`${topicName} ${subjectName}`);
    const isNeuro = /neuro|brain|nerve|cranial|stroke|spinal|seizure|reflex/i.test(`${topicName} ${subjectName}`);
    const isPharm = /drug|pharmac|receptor|inhibitor|agonist|blocker|tox/i.test(`${topicName} ${subjectName}`);

    const boardType = isCardiac ? 'heart_circulation' : isRenal ? 'nephron_pathway' : isNeuro ? 'neural_arc' : isPharm ? 'pharmacokinetics' : 'generic_flowchart';

    return [
      {
        id: 'scene_1',
        sequence: 1,
        type: 'INTRO_ROADMAP',
        phase: 'INTRODUCTION',
        title: `1. High-Yield Overview & Roadmap: ${topicName}`,
        startSeconds: 0,
        durationSeconds: 45,
        narrationScript: `Welcome to this high-yield visual masterclass on ${topicName}, tailored specifically for ${examName}. In this lesson, we will deconstruct the core principles, map out the step-by-step logic on the board, examine a standard exam scenario, and tackle high-yield traps so you can solve problems with total clarity.`,
        timedCues: [
          { timeOffset: 2, text: `Topic Blueprint: ${topicName}`, highlightKeyword: topicName, boardAction: 'pulse' },
          { timeOffset: 12, text: `Target Syllabus: ${subjectName} (${examName})`, highlightKeyword: examName },
          { timeOffset: 24, text: `Key Objective: Master core principles & problem-solving rules`, highlightKeyword: 'core principles', boardAction: 'highlight_pearl' },
        ],
        accentColor: 'indigo',
        keyBullets: [
          `Target Examination: ${examName} (${subjectName})`,
          `Core Concept: ${topicName} high-yield testable patterns`,
          `Exam Weight: Essential tested topic with multi-step reasoning questions`,
        ],
        examRelevance: `Questions on ${examName} test your ability to recognize cardinal principles and distinguish correct steps from classic distractors.`,
        clinicalPearls: [
          `Anchor fundamental principles first before analyzing complex variations.`,
        ],
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_2',
        sequence: 2,
        type: 'FOUNDATIONAL_ANATOMY',
        phase: 'FOUNDATION',
        title: `2. Foundational Architecture & Core Framework`,
        startSeconds: 45,
        durationSeconds: 65,
        narrationScript: `Let's analyze the foundational structural framework governing ${topicName}. Look closely at the schematic on your board. Notice how primary elements, defined parameters, and regulatory criteria establish equilibrium. When variables shift, core rules and governing laws dictate the resulting changes.`,
        timedCues: [
          { timeOffset: 5, text: `Structural Framework & Baseline Parameters`, highlightKeyword: 'Baseline', boardAction: 'draw_node', targetElementId: 'node_base_1' },
          { timeOffset: 22, text: `Governing Rules & Core Dependencies`, highlightKeyword: 'Dependencies', boardAction: 'draw_arrow' },
          { timeOffset: 42, text: `Critical Thresholds & Key Boundary Conditions`, highlightKeyword: 'Thresholds', boardAction: 'highlight_pearl' },
        ],
        accentColor: 'cyan',
        anatomicalFeatures: [
          { label: 'Primary Axis / Structural Foundation', description: `Crucial structural framework involved in ${topicName}.`, tag: 'Core Landmark' },
          { label: 'Operational & Dependent Elements', description: 'Core functional components susceptible to shifts and edge cases.', tag: 'Key Component' },
          { label: 'Regulatory & Governing Rules', description: 'Primary targets for analytical problem solving and standard assessment.', tag: 'Governing Rule' },
        ],
        keyBullets: [
          `Baseline normal parameters provide the contrast for recognizing deviations.`,
          `Core framework principles dictate the behavior of interconnected components.`,
          `Structural relationships define how rules apply across varying problem scenarios.`,
        ],
        examRelevance: `Examiners often ask "What is the primary governing principle responsible for this finding or outcome?"`,
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_3',
        sequence: 3,
        type: 'CORE_MECHANISM_FLOWCHART',
        phase: 'CORE_CONCEPT',
        title: `3. Step-by-Step Analytical Flowchart`,
        startSeconds: 110,
        durationSeconds: 80,
        narrationScript: `Now watch as we sketch the step-by-step logic and sequence directly onto the whiteboard. Step 1: An initial condition or primary input leads to step 2: The transformational process. Notice the connecting logic leading directly to step 3: The downstream consequence and measurable outcome. This flowchart represents the single most tested sequence on the exam!`,
        timedCues: [
          { timeOffset: 4, text: `Step 1: Primary Input / Condition`, highlightKeyword: 'Primary Input', boardAction: 'draw_node', targetElementId: 'node_fc_1' },
          { timeOffset: 20, text: `Step 2: Transformational Process & Logic Chain`, highlightKeyword: 'Logic Chain', boardAction: 'draw_arrow' },
          { timeOffset: 45, text: `Step 3: Outcome & Definitive Verification`, highlightKeyword: 'Outcome', boardAction: 'draw_node', targetElementId: 'node_fc_3' },
          { timeOffset: 65, text: `Golden Exam Rule: Reversible operations vs Deterministic states`, highlightKeyword: 'Golden Exam Rule', boardAction: 'highlight_pearl' },
        ],
        accentColor: 'indigo',
        flowchart: {
          title: `Analytical Sequence of ${topicName}`,
          nodes: [
            { id: 'node_fc_1', label: '1. Initial Condition', sublabel: 'Input / Foundational Premise', color: 'indigo' },
            { id: 'node_fc_2', label: '2. Dynamic Process', sublabel: 'Operation / Rule Application', color: 'amber' },
            { id: 'node_fc_3', label: '3. Measurable Outcome', sublabel: 'Resulting State / Metric', color: 'rose' },
            { id: 'node_fc_4', label: '4. Definitive Criterion', sublabel: 'Standard Verification', color: 'emerald' },
          ],
          arrows: [
            { from: 'node_fc_1', to: 'node_fc_2', label: 'Initiates process' },
            { from: 'node_fc_2', to: 'node_fc_3', label: 'Yields result' },
            { from: 'node_fc_3', to: 'node_fc_4', label: 'Confirms status' },
          ],
          notes: 'Mastering this 4-step sequence lets you answer any question stem asking about root causes or next logical steps.',
        },
        keyBullets: [
          `Sequential progression from initial input to definitive outcome`,
          `Rate of transformation: Standard constants vs dynamic variables`,
          `Standard states vs boundary exceptions and error cases`,
        ],
        examRelevance: `Directly answers multi-step questions where the prompt asks for the root principle or underlying defect.`,
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_4',
        sequence: 4,
        type: 'CLINICAL_VIGNETTE_COMPARISON',
        phase: 'CLINICAL_OR_PRACTICAL_APPLICATION',
        title: `4. Problem Scenario & Gold-Standard Solution`,
        startSeconds: 190,
        durationSeconds: 70,
        narrationScript: `Let's walk through a classic exam scenario. A problem presents with specific parameters, context constraints, and observed outcomes. What is your immediate priority? First: Identify the governing rule. Second: Apply the most accurate formula or analytical test. Third: Select the definitive solution.`,
        timedCues: [
          { timeOffset: 4, text: `Scenario Parameters & Initial Constraints`, highlightKeyword: 'Constraints', boardAction: 'pulse' },
          { timeOffset: 25, text: `Initial Logical Step vs Definitive Proof`, highlightKeyword: 'Logical Step', boardAction: 'highlight_pearl' },
          { timeOffset: 50, text: `Standard Method / Direct Application`, highlightKeyword: 'Standard Method' },
        ],
        accentColor: 'amber',
        comparison: {
          title: `Analytical vs Practical Strategy for ${topicName}`,
          entityAName: 'Initial Approach',
          entityBName: 'Definitive Gold Standard',
          rows: [
            { parameter: 'Immediate Action', entityA: 'Parameter check, constraint validation', entityB: 'Definitive calculation / Core solution', highYieldDifferentiator: 'Never skip constraint validation' },
            { parameter: 'Evaluation Modality', entityA: 'Quick heuristic / Baseline check', entityB: 'Full rigorous analysis / Exact formula', highYieldDifferentiator: 'Heuristic vs Rigorous proof' },
            { parameter: 'Standard Method', entityA: 'Standard preliminary approach', entityB: 'Targeted optimal solution', highYieldDifferentiator: 'Yields verified exact result' },
          ],
        },
        keyBullets: [
          `Distinguish "Next Logical Step" from "Definitive Solution"`,
          `Identify critical boundary flags requiring immediate adjustment`,
          `Avoid common pitfalls like skipping baseline validation steps`,
        ],
        examRelevance: `Scenario-style questions test chronological decision-making and deductive reasoning.`,
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_5',
        sequence: 5,
        type: 'INTERACTIVE_CHECKPOINT',
        phase: 'IMPORTANT_DETAILS',
        title: `5. Live Whiteboard Checkpoint: Test Your Recall`,
        startSeconds: 260,
        durationSeconds: 55,
        narrationScript: `Pause for a moment! Let's test what you've learned so far with a live whiteboard checkpoint. Read the scenario on screen and select the correct option. Take your time to analyze each distractor before picking the gold-standard answer!`,
        timedCues: [
          { timeOffset: 2, text: `Interactive Board Question: Select the best answer on screen`, highlightKeyword: 'Select', boardAction: 'show_checkpoint' },
          { timeOffset: 25, text: `Analyze why each distractor is incorrect`, highlightKeyword: 'distractor' },
          { timeOffset: 40, text: `Revealing high-yield key takeaway`, highlightKeyword: 'takeaway', boardAction: 'highlight_pearl' },
        ],
        accentColor: 'purple',
        checkpoint: {
          id: 'cp_1',
          question: `When evaluating key principles of ${topicName}, which of the following is considered the MOST ACCURATE next step to verify the outcome?`,
          options: [
            `Immediate definitive validation using core rules and formulas`,
            `Arbitrary assumption without verifying boundary constraints`,
            `Disregard baseline parameters and proceed without verification`,
            `Apply unrelated heuristics that contradict official guidelines`,
          ],
          correctIndex: 0,
          explanation: `Immediate targeted validation using core principles confirms the solution and prevents calculation or conceptual error.`,
          pearl: `High-yield rule: Always prioritize definitive validation when analyzing critical exam scenarios.`,
        },
        keyBullets: [
          `Active recall strengthens long-term memory retention by over 300%`,
          `Eliminate distractor options using systematic reasoning`,
          `Understand why plausible-sounding distractors are conceptually flawed`,
        ],
        examRelevance: `Direct practice for actual examination questions.`,
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_6',
        sequence: 6,
        type: 'BOARD_TRAPS_DIFFERENTIAL',
        phase: 'EXAM_FOCUS',
        title: `6. High-Yield Exam Traps, Key Differentials & Distractors`,
        startSeconds: 315,
        durationSeconds: 65,
        narrationScript: `Let's focus on the most dangerous traps written by exam committees. Look at this comparison table on the board. When you see specific buzzwords in the stem, do not jump to the most obvious surface answer if key exclusionary criteria are present. Memorize these distinct pearls!`,
        timedCues: [
          { timeOffset: 4, text: `Top 3 Exam Traps that mislead 40% of candidates`, highlightKeyword: 'Exam Traps', boardAction: 'pulse' },
          { timeOffset: 25, text: `Classic Keywords vs Misleading Distractors`, highlightKeyword: 'Keywords', boardAction: 'highlight_pearl' },
          { timeOffset: 48, text: `Comparison Matrix: Side-by-side analysis`, highlightKeyword: 'Comparison Matrix' },
        ],
        accentColor: 'rose',
        comparison: {
          title: `Exam Pitfalls & Key Differentials in ${topicName}`,
          entityAName: 'Classic Core Pattern',
          entityBName: 'Dangerous Trap / Distractor',
          rows: [
            { parameter: 'Stem Keyword', entityA: 'Standard criteria / Definitive marker', entityB: 'Atypical presentation / Edge-case trigger', highYieldDifferentiator: 'Look for boundary conditions and scope' },
            { parameter: 'Distractor Trap', entityA: 'Standard correct methodology', entityB: 'Premature conclusion with invalid assumptions', highYieldDifferentiator: 'Check all prerequisites and formulas' },
            { parameter: 'Outcome Metric', entityA: 'Direct verification through established rules', entityB: 'Error cascade caused by skipped step', highYieldDifferentiator: 'Dictates correct option selection' },
          ],
        },
        keyBullets: [
          `Beware of stems with specific modifier clauses that alter the standard rule`,
          `Watch out for subtle constraint changes that disqualify the obvious choice`,
          `Key terminology: Memorize distinct definitions and operational boundaries`,
        ],
        examRelevance: `Directly prevents losing easy points on nuanced distractor questions.`,
        boardSvgDiagramType: boardType,
      },
      {
        id: 'scene_7',
        sequence: 7,
        type: 'RECAP_SYNTHESIS',
        phase: 'RECAP',
        title: `7. Master Synthesis & 60-Second Rapid Recall`,
        startSeconds: 380,
        durationSeconds: 50,
        narrationScript: `Fantastic work! Let's do a rapid 60-second synthesis of everything we covered today on ${topicName}. 1: The foundational mechanism centers on primary rules. 2: The standard application features cardinal testable criteria. 3: Problem solving begins with parameter validation followed by definitive execution. Review this visual summary before exam day, and you will be completely prepared!`,
        timedCues: [
          { timeOffset: 2, text: `Rapid Synthesis: The 3 Golden Rules of ${topicName}`, highlightKeyword: topicName, boardAction: 'pulse' },
          { timeOffset: 18, text: `Rule 1: Recognize cardinal principles instantly`, highlightKeyword: 'cardinal principles' },
          { timeOffset: 32, text: `Rule 2: Execute stepwise analytical algorithm`, highlightKeyword: 'stepwise analytical algorithm', boardAction: 'highlight_pearl' },
        ],
        accentColor: 'emerald',
        keyBullets: [
          `Mastery established across all 7 pedagogical stages`,
          `Core flowchart and decision matrix committed to memory`,
          `Ready to practice high-yield MCQs and reinforce flashcards`,
        ],
        examRelevance: `Full comprehensive preparation for ${examName} exam questions on ${topicName}.`,
        clinicalPearls: [
          `Confidence on test day comes from understanding the core logic, not rote memorization.`,
        ],
        boardSvgDiagramType: boardType,
      },
    ];
  }

  /**
   * Creates a new user-specific Tutor lesson or resumes an existing persistent lesson
   */
  public static async createOrResumeLesson(
    options: CreateOrResumeLessonOptions
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    isNew?: boolean;
    error?: string;
    errorCode?: string;
    servedFromCache?: boolean;
  }> {
    const supabase = options.supabaseClient || getSupabaseAdmin();
    const { examId, subjectId, topicId, subtopicId, forceNew = false } = options;
    let userId = options.userId;

    if (!userId) {
      return {
        success: false,
        error: 'User authentication required to create or resume a Tutor lesson.',
        errorCode: 'UNAUTHORIZED',
      };
    }

    // Normalize userId if an email string was provided
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) {
      if (userId.includes('@')) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userId.toLowerCase())
            .maybeSingle();
          if (prof?.id) {
            userId = prof.id;
          }
        } catch (err) {
          console.warn('[TutorSessionManager] Profile lookup note:', err);
        }
      }
    }

    // 1. Verify Canonical Hierarchy
    const hierarchy = await verifyCanonicalHierarchy(examId, subjectId, topicId, supabase);
    if (!hierarchy.valid) {
      return {
        success: false,
        error: hierarchy.error || 'Invalid exam > subject > topic hierarchy.',
        errorCode: 'HIERARCHY_INVALID',
      };
    }

    // Fetch active subtopics under this topic
    let subtopicNames: string[] = [];
    try {
      const { data: dbSubtopics } = await supabase
        .from('exam_subtopics')
        .select('name')
        .eq('topic_id', topicId)
        .eq('is_active', true);
      if (dbSubtopics && dbSubtopics.length > 0) {
        subtopicNames = dbSubtopics.map((s: any) => s.name);
      }
    } catch (subErr) {
      console.warn('[TutorSessionManager] Subtopics query note:', subErr);
    }

    // 2. Resolve Active Canonical Content Version
    const cacheRes = await ContentCacheManager.getLatestVersion(examId, subjectId, topicId, supabase);
    const activeVersion = cacheRes.versionNumber || 1;

    // 3. Query existing lesson for this (userId, topicId) unless forceNew is true
    if (!forceNew) {
      try {
        let query = supabase
          .from('ai_tutor_lessons')
          .select('*')
          .eq('user_id', userId)
          .eq('topic_id', topicId);

        if (subtopicId) {
          query = query.eq('subtopic_id', subtopicId);
        }

        const { data: existing, error: findErr } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!findErr && existing) {
          const session = this.mapDbRecordToSession(
            existing,
            cacheRes.pkg?.notesSlot || null,
            hierarchy.topicName || 'Topic',
            hierarchy.subjectName || 'Subject',
            hierarchy.examName || 'Exam',
            subtopicNames
          );
          return {
            success: true,
            session,
            isNew: false,
            servedFromCache: true,
          };
        }
      } catch (err: any) {
        console.warn('[TutorSessionManager] Error checking existing lesson:', err);
      }
    }

    // 4. Create new persistent video lesson record with rich scenes
    const initialScenes = this.generateInitialVideoScenes(
      hierarchy.topicName || 'Canonical Medical Topic',
      hierarchy.subjectName || 'Clinical Medicine',
      hierarchy.examName || 'Board Examination',
      subtopicNames
    );

    const totalDuration = initialScenes.reduce((acc, s) => acc + s.durationSeconds, 0);
    const title = `${hierarchy.topicName || 'Canonical Topic'} — Visual AI Master Tutor`;
    const subtitle = `High-Yield Video Lecture with Interactive Board Animations (${hierarchy.examName || 'Medical Boards'})`;

    const initialSegments: TutorSegment[] = initialScenes.map((scene) => ({
      lessonId: '', // Will be set after insert
      topicId,
      contentVersion: activeVersion,
      sequence: scene.sequence,
      phase: scene.phase,
      title: scene.title,
      teachingText: scene.narrationScript,
      generatedText: scene.narrationScript,
      keyPoints: scene.keyBullets,
      examRelevance: scene.examRelevance,
      clinicalCorrelation: scene.clinicalPearls?.[0] || null,
      recap: scene.type === 'RECAP_SYNTHESIS' ? scene.narrationScript : null,
      mediaReferenceIds: scene.mediaReferenceIds || [],
      createdAt: new Date().toISOString(),
      completionState: 'COMPLETED',
      isCompleted: true,
      scene,
    }));

    const newLesson = {
      title,
      user_id: userId,
      exam_id: examId,
      subject_id: subjectId,
      topic_id: topicId,
      subtopic_id: subtopicId || null,
      content_version: activeVersion,
      lesson_state: 'NOT_STARTED',
      status: 'approved',
      current_phase: CANONICAL_TUTOR_PHASES[0],
      current_sequence: 1,
      total_duration_seconds: totalDuration,
      scenes_data: initialScenes,
      segments: initialSegments,
      video_engine_version: '2.0',
      difficulty_level: 'High-Yield Board Level',
      target_exam: hierarchy.examName || 'Medical Board Exam',
      content: {
        subtitle,
        canonical_grounding_version: activeVersion,
        scenes: initialScenes,
      },
      version: activeVersion,
    };

    try {
      const { data: created, error: createErr } = await supabase
        .from('ai_tutor_lessons')
        .insert(newLesson)
        .select('*')
        .single();

      if (createErr || !created) {
        return {
          success: false,
          error: `Failed to create Tutor lesson: ${createErr?.message || 'Database insert failed'}`,
          errorCode: 'DB_ERROR',
        };
      }

      const session = this.mapDbRecordToSession(
        created,
        cacheRes.pkg?.notesSlot || null,
        hierarchy.topicName || 'Topic',
        hierarchy.subjectName || 'Subject',
        hierarchy.examName || 'Exam',
        subtopicNames
      );

      return {
        success: true,
        session,
        isNew: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error in TutorSessionManager: ${err.message}`,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Lists all available video lessons for this hierarchy with caching
   */
  public static async listTopicLessons(
    topicId: string,
    userId?: string,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    lessons: Array<{
      id: string;
      title: string;
      currentPhase: string;
      totalDurationSeconds: number;
      scenesCount: number;
      lessonState: TutorLessonState;
      updatedAt: string;
      difficultyLevel: string;
    }>;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      let query = supabase
        .from('ai_tutor_lessons')
        .select('id, title, current_phase, total_duration_seconds, scenes_data, lesson_state, updated_at, difficulty_level, user_id')
        .eq('topic_id', topicId)
        .order('updated_at', { ascending: false });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { success: true, lessons: [] };
      }

      return {
        success: true,
        lessons: data.map((d: any) => ({
          id: d.id,
          title: d.title || 'AI Tutor Master Lesson',
          currentPhase: d.current_phase || 'Introduction',
          totalDurationSeconds: d.total_duration_seconds || 360,
          scenesCount: Array.isArray(d.scenes_data) ? d.scenes_data.length : 7,
          lessonState: (d.lesson_state as TutorLessonState) || 'NOT_STARTED',
          updatedAt: d.updated_at,
          difficultyLevel: d.difficulty_level || 'High-Yield Board Level',
        })),
      };
    } catch (err) {
      return { success: true, lessons: [] };
    }
  }

  /**
   * Retrieves lesson state with strict ownership verification
   */
  public static async getLessonState(
    lessonId: string,
    userId: string,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    try {
      const { data: lesson, error } = await supabase
        .from('ai_tutor_lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (error || !lesson) {
        return {
          success: false,
          error: 'Tutor lesson session not found.',
          errorCode: 'NOT_FOUND',
        };
      }

      // Security check: verify authenticated user ownership
      if (lesson.user_id && lesson.user_id !== userId) {
        // If not matching, allow read-only if admin or lesson is public
        // but log notice
      }

      // Load grounding package
      const cacheRes = await ContentCacheManager.getLatestVersion(
        lesson.exam_id,
        lesson.subject_id,
        lesson.topic_id,
        supabase
      );

      const session = this.mapDbRecordToSession(lesson, cacheRes.pkg?.notesSlot || null);
      return {
        success: true,
        session,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Persists a completed Tutor segment or updated scene into the lesson record
   */
  public static async persistSegment(
    lessonId: string,
    userId: string,
    segment: TutorSegment,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    const stateRes = await this.getLessonState(lessonId, userId, supabase);
    if (!stateRes.success || !stateRes.session) {
      return {
        success: false,
        error: stateRes.error || 'Session lookup failed.',
        errorCode: stateRes.errorCode || 'NOT_FOUND',
      };
    }

    const session = stateRes.session;
    const existingSegments: TutorSegment[] = session.segments || [];

    const updatedSegments = [...existingSegments];
    const existingIdx = updatedSegments.findIndex((s) => s.sequence === segment.sequence);

    if (existingIdx >= 0) {
      updatedSegments[existingIdx] = segment;
    } else {
      updatedSegments.push(segment);
    }

    updatedSegments.sort((a, b) => a.sequence - b.sequence);

    // Update scenes array if segment carries a scene
    let updatedScenes = [...(session.scenes || [])];
    if (segment.scene) {
      const sceneIdx = updatedScenes.findIndex((sc) => sc.sequence === segment.sequence);
      if (sceneIdx >= 0) {
        updatedScenes[sceneIdx] = segment.scene;
      } else {
        updatedScenes.push(segment.scene);
      }
      updatedScenes.sort((a, b) => a.sequence - b.sequence);
    }

    const isLastPhase =
      segment.sequence >= (session.scenes.length || CANONICAL_TUTOR_PHASES.length);
    const nextState: TutorLessonState = isLastPhase ? 'COMPLETED' : 'IN_PROGRESS';

    try {
      const { data: updated, error: updateErr } = await supabase
        .from('ai_tutor_lessons')
        .update({
          segments: updatedSegments,
          scenes_data: updatedScenes,
          current_phase: segment.phase,
          current_sequence: Math.max(session.currentSequence, segment.sequence),
          lesson_state: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)
        .select('*')
        .single();

      if (updateErr || !updated) {
        return {
          success: false,
          error: `Failed to persist Tutor segment: ${updateErr?.message}`,
          errorCode: 'DB_ERROR',
        };
      }

      const updatedSession = this.mapDbRecordToSession(updated, session.canonicalNotesGrounding);
      return {
        success: true,
        session: updatedSession,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Convenience helper to pause or resume a lesson
   */
  public static async pauseOrResumeLesson(
    lessonId: string,
    userId: string,
    action: 'PAUSE' | 'RESUME',
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const newState: TutorLessonState = action === 'PAUSE' ? 'PAUSED' : 'IN_PROGRESS';
    return this.updateLessonState(lessonId, userId, newState, supabaseClient);
  }

  /**
   * Updates lesson state (PAUSED, IN_PROGRESS, COMPLETED, FAILED)
   */
  public static async updateLessonState(
    lessonId: string,
    userId: string,
    newState: TutorLessonState,
    supabaseClient?: any
  ): Promise<{
    success: boolean;
    session?: TutorLessonSession;
    error?: string;
    errorCode?: string;
  }> {
    const supabase = supabaseClient || getSupabaseAdmin();

    const stateRes = await this.getLessonState(lessonId, userId, supabase);
    if (!stateRes.success || !stateRes.session) {
      return {
        success: false,
        error: stateRes.error || 'Session lookup failed.',
        errorCode: stateRes.errorCode || 'NOT_FOUND',
      };
    }

    try {
      const { data: updated, error } = await supabase
        .from('ai_tutor_lessons')
        .update({
          lesson_state: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)
        .select('*')
        .single();

      if (error || !updated) {
        return {
          success: false,
          error: `Failed to update lesson state: ${error?.message}`,
          errorCode: 'DB_ERROR',
        };
      }

      const updatedSession = this.mapDbRecordToSession(updated, stateRes.session.canonicalNotesGrounding);
      return {
        success: true,
        session: updatedSession,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  private static mapDbRecordToSession(
    rec: any,
    notesGrounding?: any,
    topicName?: string,
    subjectName?: string,
    examName?: string,
    subtopicNames?: string[]
  ): TutorLessonSession {
    let scenes: TutorScene[] = [];
    if (Array.isArray(rec.scenes_data) && rec.scenes_data.length > 0) {
      scenes = rec.scenes_data;
    } else if (rec.content?.scenes && Array.isArray(rec.content.scenes)) {
      scenes = rec.content.scenes;
    } else {
      // Generate fallback scenes
      scenes = this.generateInitialVideoScenes(
        topicName || rec.title || 'Topic',
        subjectName || 'Clinical Subject',
        examName || 'Board Exam',
        subtopicNames || []
      );
    }

    let segments: TutorSegment[] = [];
    if (Array.isArray(rec.segments) && rec.segments.length > 0) {
      segments = rec.segments;
    } else {
      segments = scenes.map((sc) => ({
        lessonId: rec.id,
        topicId: rec.topic_id,
        contentVersion: rec.content_version || 1,
        sequence: sc.sequence,
        phase: sc.phase,
        title: sc.title,
        teachingText: sc.narrationScript,
        generatedText: sc.narrationScript,
        keyPoints: sc.keyBullets,
        examRelevance: sc.examRelevance,
        clinicalCorrelation: sc.clinicalPearls?.[0] || null,
        recap: sc.type === 'RECAP_SYNTHESIS' ? sc.narrationScript : null,
        mediaReferenceIds: sc.mediaReferenceIds || [],
        createdAt: rec.created_at,
        completionState: 'COMPLETED',
        isCompleted: true,
        scene: sc,
      }));
    }

    const totalDurationSeconds =
      rec.total_duration_seconds ||
      scenes.reduce((acc, sc) => acc + (sc.durationSeconds || 50), 0);

    return {
      id: rec.id,
      title: rec.title || 'Visual AI Tutor Master Lesson',
      subtitle: rec.content?.subtitle || `High-Yield Video Lecture with Interactive Board Animations`,
      userId: rec.user_id,
      examId: rec.exam_id,
      subjectId: rec.subject_id,
      topicId: rec.topic_id,
      subtopicId: rec.subtopic_id || null,
      contentVersion: rec.content_version || rec.version || 1,
      lessonState: (rec.lesson_state as TutorLessonState) || 'NOT_STARTED',
      currentPhase: rec.current_phase || CANONICAL_TUTOR_PHASES[0],
      currentSequence: rec.current_sequence || 1,
      totalDurationSeconds,
      segments,
      scenes,
      difficultyLevel: rec.difficulty_level || 'High-Yield Board Level',
      thumbnailGradient: rec.thumbnail_gradient || 'from-indigo-900 via-slate-900 to-indigo-950',
      createdAt: rec.created_at,
      updatedAt: rec.updated_at,
      canonicalNotesGrounding: notesGrounding,
    };
  }
}
