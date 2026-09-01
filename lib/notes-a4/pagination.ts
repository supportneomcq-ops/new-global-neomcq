import {
  HandwrittenA4NotePackage,
  HandwrittenA4Page,
  HandwrittenNoteItem,
  StickyKeyPointBox,
  MnemonicCard,
  ComparisonMiniTable,
} from '@/types/notes-a4.types';

/**
 * Transforms raw structured content into a fully paginated A4 notebook document.
 */
export function paginateHandwrittenA4Note(params: {
  id?: string;
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  examName: string;
  subjectName: string;
  topicName: string;
  subtopicName?: string | null;
  title?: string;
  subtitle?: string;
  overview?: string;
  version?: number;
  items?: HandwrittenNoteItem[];
  keyPoints?: string[];
  mnemonics?: MnemonicCard[];
  comparisonTables?: ComparisonMiniTable[];
  createdAt?: string;
  updatedAt?: string;
  allVersions?: { version: number; createdAt: string }[];
}): HandwrittenA4NotePackage {
  const {
    id = `note_${params.topicId}_v${params.version || 1}`,
    examId,
    subjectId,
    topicId,
    subtopicId = null,
    examName,
    subjectName,
    topicName,
    subtopicName = null,
    title = formatDisplayTitle(topicName),
    subtitle = `(High-Yield Core Review & Examination Pearls) [${generateTopicAcronym(topicName)}]`,
    overview = '',
    version = 1,
    items = [],
    keyPoints = [],
    mnemonics = [],
    comparisonTables = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    allVersions = [{ version: 1, createdAt: new Date().toISOString() }],
  } = params;

  // Build default sticky key points if not provided
  const keyPointsSticky: StickyKeyPointBox = {
    title: 'Key Points',
    points: keyPoints.length > 0 ? keyPoints : [
      'High-yield clinical diagnostic criteria',
      'First-line pharmacological management',
      'Gold standard diagnostic test',
      'Recurrent board trap distinction',
    ],
    color: 'amber',
  };

  // If no items were provided, synthesize structured items based on the topic & subject
  const effectiveItems = items.length > 0 ? items : generateFallbackHighYieldItems(topicName, subjectName, examName);

  // Distribute items across logical A4 pages
  // Page 1: Header + 6 items + Key Points sticky note box
  // Subsequent pages: 8 items per page with comparison tables / mnemonics
  const pages: HandwrittenA4Page[] = [];

  const PAGE_1_ITEM_CAPACITY = 6;
  const SUBSEQUENT_PAGE_CAPACITY = 8;

  const page1Items = effectiveItems.slice(0, PAGE_1_ITEM_CAPACITY);
  const remainingItems = effectiveItems.slice(PAGE_1_ITEM_CAPACITY);

  pages.push({
    pageNumber: 1,
    totalPages: 1,
    isFirstPage: true,
    isLastPage: remainingItems.length === 0,
    sectionHeader: `${subjectName} • ${topicName}`,
    items: page1Items,
    stickyBox: keyPointsSticky,
    mnemonic: mnemonics[0],
    comparisonTable: comparisonTables[0],
  });

  // Chunk remaining items into subsequent pages
  let currentPageIndex = 0;
  while (currentPageIndex < remainingItems.length) {
    const chunk = remainingItems.slice(currentPageIndex, currentPageIndex + SUBSEQUENT_PAGE_CAPACITY);
    const pageNum = pages.length + 1;
    const isLast = currentPageIndex + SUBSEQUENT_PAGE_CAPACITY >= remainingItems.length;

    pages.push({
      pageNumber: pageNum,
      totalPages: 1,
      isFirstPage: false,
      isLastPage: isLast,
      sectionHeader: `${topicName} • High-Yield Pearls Part ${pageNum}`,
      items: chunk,
      mnemonic: mnemonics[pageNum - 1],
      comparisonTable: comparisonTables[pageNum - 1],
    });

    currentPageIndex += SUBSEQUENT_PAGE_CAPACITY;
  }

  // Update totalPages across all pages
  const totalPages = pages.length;
  pages.forEach((p) => {
    p.totalPages = totalPages;
  });

  return {
    id,
    examId,
    subjectId,
    topicId,
    subtopicId,
    examName,
    subjectName,
    topicName,
    subtopicName,
    title,
    subtitle,
    highYieldBadgeText: 'High Yield',
    overview,
    version,
    allVersions,
    pages,
    rawItems: effectiveItems,
    keyPointsSticky,
    mnemonics,
    comparisonTables,
    createdAt,
    updatedAt,
    wordCount: effectiveItems.reduce((acc, item) => acc + item.label.length + item.explanationBullets.join(' ').length, 0),
  };
}

function formatDisplayTitle(topicName: string): string {
  if (!topicName) return 'HIGH-YIELD REVISION SHEET';
  return topicName.toUpperCase();
}

function generateTopicAcronym(topicName: string): string {
  if (!topicName) return 'HY';
  const words = topicName.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0].toUpperCase()).join('').slice(0, 4);
}

/**
 * Fallback synthesizer for topics when loaded for the first time without raw items.
 */
function generateFallbackHighYieldItems(
  topicName: string,
  subjectName: string,
  examName: string
): HandwrittenNoteItem[] {
  const isNeuro = /neuro|myasthenia|brain|stroke|epilep|scleros/i.test(topicName + subjectName);
  const isBiochem = /carbohydrate|metabol|glycolysis|enzyme|protein|lipid/i.test(topicName + subjectName);

  if (isNeuro || /myasthenia/i.test(topicName)) {
    return [
      {
        id: 'item_1',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Screening test -',
        boxedHighlight: 'Ice pack test',
        highlightColor: 'emerald',
        explanationBullets: [
          'Improvement in ptosis after placing ice pack over closed eyelids for 2-5 minutes.',
        ],
        diagramType: 'ice_pack',
        diagramCaption: 'Cold inhibits acetylcholinesterase',
        isHighYield: true,
      },
      {
        id: 'item_2',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Most specific test (confirmation) -',
        boxedHighlight: 'Anti AchR Ab',
        highlightColor: 'sky',
        explanationBullets: [
          'Anti-Acetylcholine Receptor Antibody is highly specific (>90%) for Myasthenia Gravis.',
          'Anti-MuSK Ab positive in a subset of seronegative MG.',
        ],
        diagramType: 'antibody',
        diagramCaption: 'Autoantibodies block post-synaptic AChRs',
        isHighYield: true,
      },
      {
        id: 'item_3',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'IOC (Investigation of Choice) -',
        boxedHighlight: 'Single-Fiber EMG',
        highlightColor: 'purple',
        explanationBullets: [
          'Most sensitive test (>95%) for detecting impaired neuromuscular transmission (increased jitter).',
        ],
        diagramType: 'emg_wave',
        diagramCaption: 'Decremental response on repetitive nerve stimulation',
        isHighYield: true,
      },
      {
        id: 'item_4',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Imaging -',
        boxedHighlight: 'CT scan of chest',
        highlightColor: 'amber',
        explanationBullets: [
          'To look for thymoma (associated in ~10-15% cases) and thymic hyperplasia (~65%).',
        ],
        diagramType: 'chest_lungs',
        diagramCaption: 'Anterior mediastinal mass evaluation',
        isHighYield: true,
      },
      {
        id: 'item_5',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Treatment of choice -',
        boxedHighlight: 'IVIG / Thymectomy',
        highlightColor: 'sky',
        explanationBullets: [
          'IVIG or Plasmapheresis for myasthenic crisis / acute severe respiratory exacerbation.',
          'Thymectomy indicated in all thymomas and generalized MG in patients <60 years.',
        ],
        diagramType: 'iv_drip',
        diagramCaption: 'Rapid removal/neutralization of autoantibodies',
        isHighYield: true,
      },
      {
        id: 'item_6',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Drug of choice (symptomatic) -',
        boxedHighlight: 'Pyridostigmine',
        highlightColor: 'rose',
        explanationBullets: [
          'Oral acetylcholinesterase inhibitor (AChEI).',
          'Improves neuromuscular transmission by prolonging acetylcholine half-life at synaptic cleft.',
        ],
        diagramType: 'speech_bubble',
        sideAnnotation: 'Increases ACh at NMJ',
        isHighYield: true,
      },
      {
        id: 'item_7',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Symptoms improve in morning and worsen in evening? -',
        boxedHighlight: 'True',
        highlightColor: 'emerald',
        explanationBullets: [
          'Fatigability worsens progressively with repeated active use of striated muscles.',
        ],
        diagramType: 'diurnal_sun_moon',
        diagramCaption: 'Diurnal symptom fluctuation',
        isHighYield: true,
      },
      {
        id: 'item_8',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Deep Tendon Reflexes (DTR) Normal? -',
        boxedHighlight: 'True',
        highlightColor: 'emerald',
        explanationBullets: [
          'MG is a pure disorder of NMJ, not a neuropathy (loss of DTR) or primary myopathy.',
        ],
        diagramType: 'speech_bubble',
        sideAnnotation: 'DTRs & pupils are usually Normal',
        isHighYield: true,
      },
    ];
  }

  if (isBiochem) {
    return [
      {
        id: 'item_1',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Rate-limiting enzyme of Glycolysis -',
        boxedHighlight: 'PFK-1 (Phosphofructokinase-1)',
        highlightColor: 'emerald',
        explanationBullets: [
          'Converts Fructose-6-P into Fructose-1,6-bisphosphate.',
          'Allosterically activated by AMP and Fructose-2,6-bisphosphate; inhibited by ATP and Citrate.',
        ],
        diagramType: 'algorithm_flow',
        diagramCaption: 'Glycolytic checkpoint',
        isHighYield: true,
      },
      {
        id: 'item_2',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Von Gierke Disease (Type I GSD) Enzyme Defect -',
        boxedHighlight: 'Glucose-6-Phosphatase',
        highlightColor: 'rose',
        explanationBullets: [
          'Severe fasting hypoglycemia, lactic acidosis, hepatomegaly, hyperuricemia (gout), hyperlipidemia.',
          'Treatment: Frequent oral cornstarch and avoidance of fructose/galactose.',
        ],
        diagramType: 'nephron_kidney',
        diagramCaption: 'Doll-like facies with massive liver',
        isHighYield: true,
      },
      {
        id: 'item_3',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Pompe Disease (Type II GSD) Enzyme Defect -',
        boxedHighlight: 'Lysosomal α-1,4-Glucosidase',
        highlightColor: 'purple',
        explanationBullets: [
          'Cardiomegaly, hypertrophic cardiomyopathy, exercise intolerance, early infant death.',
        ],
        diagramType: 'heart_ecg',
        diagramCaption: 'Lysosomal glycogen accumulation',
        isHighYield: true,
      },
      {
        id: 'item_4',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Essential Fructosuria vs Fructose Intolerance -',
        boxedHighlight: 'Fructokinase vs Aldolase B',
        highlightColor: 'amber',
        explanationBullets: [
          'Essential Fructosuria: Fructokinase defect. Benign, asymptomatic fructose in urine.',
          'Hereditary Fructose Intolerance: Aldolase B defect. Fructose-1-P accumulates -> hypoglycemia and vomiting after fruit/juice intake.',
        ],
        diagramType: 'speech_bubble',
        sideAnnotation: 'Aldolase B traps intracellular ATP',
        isHighYield: true,
      },
      {
        id: 'item_5',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Galactosemia Classic Triad -',
        boxedHighlight: 'Cataracts + Jaundice + Hepatomegaly',
        highlightColor: 'sky',
        explanationBullets: [
          'Deficiency of Galactose-1-phosphate uridyltransferase (GALT).',
          'Neonatal presentation upon starting milk feeding; predisposes to E. coli sepsis.',
        ],
        diagramType: 'microscope_slide',
        diagramCaption: 'Accumulation of toxic galactitol in lens',
        isHighYield: true,
      },
      {
        id: 'item_6',
        bulletIcon: 'heart',
        bulletColor: 'red',
        label: 'Pyruvate Dehydrogenase Complex Co-factors -',
        boxedHighlight: 'TLCFN (B1, B2, B3, B5, Lipoic Acid)',
        highlightColor: 'emerald',
        explanationBullets: [
          'Thiamine (B1), Lipoic acid, Coenzyme A (B5), FAD (B2), NAD (B3).',
          'Arsenic poisoning inhibits lipoic acid, mimicking PDH deficiency (garlic breath).',
        ],
        diagramType: 'pill_capsule',
        diagramCaption: '5 Essential Vitamin Cofactors',
        isHighYield: true,
      },
    ];
  }

  // General Medical / Clinical fallback
  return [
    {
      id: 'item_1',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'Hallmark Diagnostic Finding -',
      boxedHighlight: `${topicName} Pathognomonic Triad`,
      highlightColor: 'emerald',
      explanationBullets: [
        `Classical clinical presentation calibrated strictly to ${examName} board guidelines.`,
        'Rapid initial bedside assessment with high sensitivity and specificity.',
      ],
      diagramType: 'speech_bubble',
      sideAnnotation: 'High-Yield Board Indicator',
      isHighYield: true,
    },
    {
      id: 'item_2',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'Gold Standard Investigation (IOC) -',
      boxedHighlight: 'Confirmatory Laboratory / Imaging Matrix',
      highlightColor: 'sky',
      explanationBullets: [
        'Definitive diagnostic test with highest positive predictive value.',
        'Differentiates from closest clinical mimics and rule-out differentials.',
      ],
      diagramType: 'microscope_slide',
      diagramCaption: 'Diagnostic Gold Standard',
      isHighYield: true,
    },
    {
      id: 'item_3',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'Pathophysiology / Core Mechanism -',
      boxedHighlight: 'Primary Etiological Cascade',
      highlightColor: 'purple',
      explanationBullets: [
        'Cellular/molecular mechanism leading to functional impairment.',
        'Target site for disease-modifying and symptomatic pharmacotherapy.',
      ],
      diagramType: 'synapse_nmj',
      diagramCaption: 'Pathophysiologic Target',
      isHighYield: true,
    },
    {
      id: 'item_4',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'First-Line Pharmacotherapy (DOC) -',
      boxedHighlight: 'Evidence-Based Drug of Choice',
      highlightColor: 'rose',
      explanationBullets: [
        'Optimal initial dosing regimen and route of administration.',
        'Significant contraindications and adverse effect surveillance.',
      ],
      diagramType: 'pill_capsule',
      diagramCaption: 'First-Line Protocol',
      isHighYield: true,
    },
    {
      id: 'item_5',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'Most Common Board Examination Trap -',
      boxedHighlight: 'Differential Distinction Rule',
      highlightColor: 'amber',
      explanationBullets: [
        'Key discriminator that prevents incorrect distractor selection on exam day.',
        'Crucial timing, age distribution, and laboratory nuances.',
      ],
      diagramType: 'speech_bubble',
      sideAnnotation: 'Do Not Confuse With Mimics',
      isHighYield: true,
    },
    {
      id: 'item_6',
      bulletIcon: 'heart',
      bulletColor: 'red',
      label: 'Prognostic Indicator / Next Best Step -',
      boxedHighlight: 'Emergency Stabilization & Follow-up',
      highlightColor: 'emerald',
      explanationBullets: [
        'Immediate algorithmic step if patient deteriorates or fails first-line therapy.',
        'Long-term surveillance and mortality-reducing interventions.',
      ],
      diagramType: 'iv_drip',
      diagramCaption: 'Critical Clinical Decision Point',
      isHighYield: true,
    },
  ];
}
