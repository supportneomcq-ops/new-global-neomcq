import { getSupabaseAdmin } from '../../supabase';

export interface ExamStyleAndPattern {
  domain: string;
  role: string;
  styleDescription: string;
  notesInstruction: string;
  markingSchemeInstruction: string;
  difficulty: string;
  questionCount: number;
  durationMinutes: number;
}

export async function getExamStyleAndPattern(
  examId: string,
  supabaseClient?: any
): Promise<ExamStyleAndPattern> {
  const supabase = supabaseClient || getSupabaseAdmin();
  try {
    const { data: exam, error } = await supabase
      .from('exams')
      .select('*, exam_categories(slug, name)')
      .eq('id', examId)
      .maybeSingle();

    if (error || !exam) {
      return {
        domain: 'general',
        role: 'Senior Academic Subject Matter Expert and Syllabus Designer',
        styleDescription: 'Clear, rigorous conceptual and factual reasoning with comprehensive explanations and highly realistic question stems.',
        notesInstruction: 'Detailed summaries, core concepts, formulas where applicable, high-yield facts, and exam pearls.',
        markingSchemeInstruction: 'Standard 4-option multiple-choice format with single correct response.',
        difficulty: 'Intermediate',
        questionCount: 100,
        durationMinutes: 120,
      };
    }

    const nameLower = (exam.name || '').toLowerCase();
    const descLower = (exam.description || '').toLowerCase();
    const catSlug = ((exam as any).exam_categories?.slug || '').toLowerCase();
    
    let markingInstr = 'Standard multiple-choice format with 4 options and 1 correct answer.';
    if (exam.marking_scheme) {
      const ms = typeof exam.marking_scheme === 'string' ? JSON.parse(exam.marking_scheme) : exam.marking_scheme;
      const optionCount = ms.option_count || 4;
      const negMarking = ms.has_negative_marking || exam.negative_marking;
      markingInstr = `Format: ${optionCount} options per question with exactly 1 correct answer. Scoring pattern is based on standard rules ${negMarking ? 'with negative marking' : 'without negative marking'}.`;
    }

    // Determine domain
    let domain = 'general';
    let role = 'Lead Syllabus and Curriculum Architect';
    let styleDescription = 'Rigorous, highly-relevant academic questions and thorough distractors mapping to official syllabus.';
    let notesInstruction = 'Complete subject summaries, key formulas, core concepts, definition logs, high-yield facts, and revision highlights.';

    const isMedical = 
      catSlug.includes('medical') ||
      catSlug.includes('nursing') ||
      catSlug.includes('pharmacy') ||
      catSlug.includes('dentistry') ||
      catSlug.includes('veterinary') ||
      catSlug.includes('health') ||
      nameLower.includes('fmge') || 
      nameLower.includes('neet') || 
      nameLower.includes('usmle') || 
      nameLower.includes('nclex') || 
      nameLower.includes('plab') || 
      nameLower.includes('medical') || 
      nameLower.includes('medicine') || 
      nameLower.includes('anatomy') || 
      nameLower.includes('pharm') || 
      nameLower.includes('nursing') || 
      descLower.includes('medical') || 
      descLower.includes('clinical') || 
      descLower.includes('nursing') || 
      descLower.includes('doctor') || 
      descLower.includes('patient');

    const isEngineering = 
      catSlug.includes('engineering') ||
      catSlug.includes('tech') ||
      catSlug.includes('computer') ||
      catSlug.includes('software') ||
      catSlug.includes('science') ||
      nameLower.includes('gate') || 
      nameLower.includes('jee') || 
      nameLower.includes('engineering') || 
      nameLower.includes('computer') || 
      nameLower.includes('software') || 
      nameLower.includes('science') || 
      nameLower.includes('physics') || 
      nameLower.includes('math') || 
      descLower.includes('engineering') || 
      descLower.includes('programming') || 
      descLower.includes('algorithm');

    const isLaw = 
      catSlug.includes('law') ||
      catSlug.includes('legal') ||
      nameLower.includes('law') || 
      nameLower.includes('clat') || 
      nameLower.includes('bar exam') || 
      nameLower.includes('legal') || 
      nameLower.includes('juris') || 
      descLower.includes('law') || 
      descLower.includes('legal') || 
      descLower.includes('jurisprudence') || 
      descLower.includes('court') || 
      descLower.includes('statute');

    const isBusinessFinance = 
      catSlug.includes('business') ||
      catSlug.includes('finance') ||
      catSlug.includes('accounting') ||
      catSlug.includes('banking') ||
      catSlug.includes('audit') ||
      nameLower.includes('mba') ||
      nameLower.includes('gmat') ||
      nameLower.includes('cat') ||
      nameLower.includes('cfa') ||
      nameLower.includes('ca') ||
      nameLower.includes('finance') ||
      nameLower.includes('business') ||
      nameLower.includes('accounting') ||
      descLower.includes('finance') ||
      descLower.includes('business') ||
      descLower.includes('accounting');

    const isCivilServicesGovt = 
      catSlug.includes('civil') ||
      catSlug.includes('govt') ||
      catSlug.includes('defence') ||
      nameLower.includes('upsc') ||
      nameLower.includes('ssc') ||
      nameLower.includes('civil service') ||
      nameLower.includes('defence') ||
      nameLower.includes('military') ||
      nameLower.includes('gk') ||
      nameLower.includes('general knowledge') ||
      descLower.includes('upsc') ||
      descLower.includes('ssc') ||
      descLower.includes('civil services') ||
      descLower.includes('defence') ||
      descLower.includes('general knowledge');

    const isIQ = 
      nameLower.includes('iq') || 
      nameLower.includes('gre') || 
      nameLower.includes('aptitude') || 
      nameLower.includes('cognitive') || 
      descLower.includes('aptitude') || 
      descLower.includes('reasoning') || 
      descLower.includes('analytical');

    if (isMedical) {
      domain = 'medical';
      role = 'Lead Medical Content Director and Chief Board Exam Author';
      styleDescription = 'Every question must be a realistic clinical scenario, case-based vignette, or high-yield medical reasoning stem (25-80 words). Incorporate clinical findings, labs, and diagnostic pathways where relevant.';
      notesInstruction = 'clinical/anatomical/medical format: include topicOverview, learningObjectives, keyConcepts, importantDefinitions, mechanismsOrPathophysiology, classifications, clinicalFeatures, diagnosisAndInvestigation, management, highYieldFacts, examPearls, and summary.';
    } else if (isEngineering) {
      domain = 'engineering';
      role = 'Senior Engineering Professor and Technical Certification Author';
      styleDescription = 'Every question must challenge problem-solving capability, technical principles, algorithms, equations, system designs, or structural logic. Stems should include exact technical parameters, system requirements, or architectural scenarios.';
      notesInstruction = 'technical/engineering format: focus heavily on technical principles, architectural components, design trade-offs, step-by-step algorithms, mathematical proofs, formulas, classifications, high-yield engineering guidelines, and exam revision pearls.';
    } else if (isLaw) {
      domain = 'law';
      role = 'Distinguished Professor of Law and Bar Examiner';
      styleDescription = 'Every question must be a legal scenario, hypothetical case study, statute interpretation, or judicial precedent analysis. Stems should detail facts, parties, jurisdiction, or relevant constitutional/statutory clauses, challenging legal analysis and deductive application.';
      notesInstruction = 'legal/statutory format: focus on statutory text, judicial precedents, constitutional provisions, core legal definitions, procedural rules, elements of offenses/claims, legal exceptions, high-yield bar exam principles, and quick revision pearls.';
    } else if (isBusinessFinance) {
      domain = 'business-finance';
      role = 'Senior Professor of Finance and Professional Accountant Board Examiner';
      styleDescription = 'Every question must challenge financial principles, business case studies, accounting standards, auditing rules, quantitative analytical standards, or regulatory guidelines. Stems should outline exact business transactions, corporate statements, or management scenarios.';
      notesInstruction = 'business/finance format: focus on accounting standards, corporate financial rules, economic principles, mathematical formulas, case-study analytics, risk parameters, regulatory frameworks, and key revision highlights.';
    } else if (isCivilServicesGovt) {
      domain = 'civil-services-govt';
      role = 'Chief Academic Curriculum Designer for Civil Services and Government Exams';
      styleDescription = 'Every question must represent highly rigorous general awareness, history, polity, geography, socio-economic context, or public administration. Stems must be precise, authoritative, factual, and deeply reasoned, testing profound civil/general awareness.';
      notesInstruction = 'civil services and general knowledge format: focus on historical timelines, constitutional frameworks, administrative structures, geographic variables, socio-economic trends, international affairs, core facts, and exam revision highlights.';
    } else if (isIQ) {
      domain = 'iq';
      role = 'Senior Psychometrician and Cognitive Assessment Designer';
      styleDescription = 'Every question must target analytical reasoning, logical deduction, quantitative aptitude, verbal logic, or spatial-cognitive pathways. Ensure distractors test common cognitive traps and logical fallacies.';
      notesInstruction = 'cognitive/aptitude format: focus on logical patterns, mathematical reasoning shortcuts, analytical methodologies, verbal/quantitative strategies, common traps, high-yield tips, and cognitive practice benchmarks.';
    }

    return {
      domain,
      role,
      styleDescription,
      notesInstruction,
      markingSchemeInstruction: markingInstr,
      difficulty: exam.difficulty_level || exam.difficulty || 'Intermediate',
      questionCount: exam.total_questions || exam.question_count || 100,
      durationMinutes: exam.duration_minutes || exam.time_limit_mins || 120,
    };
  } catch (err) {
    console.warn('[Exam Style Helper] Error fetching style/pattern from db:', err);
    return {
      domain: 'general',
      role: 'Senior Academic Subject Matter Expert and Syllabus Designer',
      styleDescription: 'Clear, rigorous conceptual and factual reasoning with comprehensive explanations and highly realistic question stems.',
      notesInstruction: 'Detailed summaries, core concepts, formulas where applicable, high-yield facts, and exam pearls.',
      markingSchemeInstruction: 'Standard 4-option multiple-choice format with single correct response.',
      difficulty: 'Intermediate',
      questionCount: 100,
      durationMinutes: 120,
    };
  }
}
