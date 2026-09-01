export type BulletIconType = 
  | 'heart'
  | 'star'
  | 'lightning'
  | 'check'
  | 'target'
  | 'lightbulb'
  | 'pill'
  | 'warning'
  | 'microscope'
  | 'dna';

export type HighlightColor = 
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'purple'
  | 'rose'
  | 'indigo'
  | 'teal';

export type HandDrawnDiagramType =
  | 'ice_pack'
  | 'antibody'
  | 'emg_wave'
  | 'chest_lungs'
  | 'iv_drip'
  | 'diurnal_sun_moon'
  | 'speech_bubble'
  | 'synapse_nmj'
  | 'heart_ecg'
  | 'nephron_kidney'
  | 'brain_cortex'
  | 'microscope_slide'
  | 'dna_strand'
  | 'pill_capsule'
  | 'thermometer'
  | 'syringe'
  | 'stethoscope'
  | 'reflex_hammer'
  | 'bacterium'
  | 'virus'
  | 'bone_fracture'
  | 'algorithm_flow';

export interface HandwrittenNoteItem {
  id: string;
  bulletIcon: BulletIconType;
  bulletColor?: 'red' | 'purple' | 'amber' | 'emerald' | 'indigo' | 'sky' | 'rose';
  label: string;
  boxedHighlight: string;
  highlightColor: HighlightColor;
  explanationBullets: string[];
  diagramType?: HandDrawnDiagramType;
  diagramCaption?: string;
  sideAnnotation?: string;
  annotationBadge?: string;
  isHighYield?: boolean;
  isExamTrap?: boolean;
  warningText?: string;
  imageUrl?: string;
  imageCaption?: string;
  videoUrl?: string;
  videoTitle?: string;
}

export interface StickyKeyPointBox {
  title: string;
  points: string[];
  color?: 'amber' | 'emerald' | 'sky' | 'rose' | 'purple';
}

export interface MnemonicCard {
  mnemonic: string;
  expansion?: { letter: string; phrase: string }[];
  clinicalContext: string;
}

export interface ComparisonMiniTable {
  title: string;
  headers: [string, string, string];
  rows: [string, string, string][];
}

export interface HandwrittenA4Page {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  sectionHeader?: string;
  items: HandwrittenNoteItem[];
  stickyBox?: StickyKeyPointBox;
  mnemonic?: MnemonicCard;
  comparisonTable?: ComparisonMiniTable;
}

export interface HandwrittenA4NotePackage {
  id: string;
  examId: string;
  subjectId: string;
  topicId: string;
  subtopicId?: string | null;
  examName: string;
  subjectName: string;
  topicName: string;
  subtopicName?: string | null;
  title: string;
  subtitle: string;
  highYieldBadgeText: string;
  overview: string;
  version: number;
  allVersions?: { version: number; createdAt: string }[];
  pages: HandwrittenA4Page[];
  rawItems: HandwrittenNoteItem[];
  keyPointsSticky?: StickyKeyPointBox;
  mnemonics?: MnemonicCard[];
  comparisonTables?: ComparisonMiniTable[];
  createdAt: string;
  updatedAt: string;
  qualityScore?: number;
  wordCount?: number;
}
