export type ContentScope = 'TOPIC' | 'SUBTOPIC';

export type CalloutType =
  | 'key_insight'
  | 'high_yield_point'
  | 'exam_trap'
  | 'formula'
  | 'memory_aid'
  | 'comparison';

export interface A4Callout {
  id?: string;
  type: CalloutType;
  title: string;
  content: string;
}

export interface A4Table {
  title?: string;
  headers: string[];
  rows: string[][];
}

// ----------------------------------------------------------------------------
// Batch 4: Expanded Structured Block Model for Exam-Agnostic Manuscripts
// ----------------------------------------------------------------------------
export type A4BlockType =
  | 'heading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'callout'
  | 'comparison_table'
  | 'formula_or_rule'
  | 'memory_aid'
  | 'checklist'
  | 'process_flow'
  | 'image_or_diagram'
  | 'quote';

export interface A4ImageOrDiagram {
  url?: string;
  svgXml?: string;
  altText: string;
  caption?: string;
  placement?: 'center' | 'left' | 'right' | 'full';
  widthSize?: 'small' | 'medium' | 'large' | 'full';
  diagramType?: string;
}

export interface A4ProcessStep {
  stepNumber?: number;
  title: string;
  description?: string;
}

export interface A4ProcessFlow {
  title?: string;
  steps: A4ProcessStep[];
  direction?: 'horizontal' | 'vertical';
}

export interface A4FormulaOrRule {
  title: string;
  expression: string;
  explanation?: string;
  variablesOrConditions?: { name: string; meaning: string }[];
}

export interface A4MemoryAid {
  title: string;
  mnemonic: string;
  expansion?: { key: string; meaning: string }[];
  context?: string;
}

export interface A4Block {
  id: string;
  type: A4BlockType;
  content?: string;
  level?: 1 | 2 | 3;
  items?: string[];
  callout?: A4Callout;
  table?: A4Table;
  formula?: A4FormulaOrRule;
  memoryAid?: A4MemoryAid;
  processFlow?: A4ProcessFlow;
  imageOrDiagram?: A4ImageOrDiagram;
}

export interface A4Section {
  id: string;
  heading: string;
  contentMarkdown?: string;
  callouts?: A4Callout[];
  table?: A4Table;
  checklist?: string[];
  blocks?: A4Block[];
}

export interface A4Page {
  pageNumber: number;
  pageTitle: string;
  sections: A4Section[];
}

export interface A4TableOfContentsItem {
  id: string;
  pageNumber: number;
  title: string;
  sectionIds?: string[];
}

export interface A4NotesDocument {
  id: string;
  contentScope: ContentScope;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  subtopicId?: string | null;
  subtopicName?: string | null;
  availableSubtopics?: string[];
  documentTitle: string;
  totalPages: number;
  version: number;
  isCurrent?: boolean;
  createdAt: string;
  expiresAt: string;
  tableOfContents: A4TableOfContentsItem[];
  pages: A4Page[];
}

export interface UserHighlight {
  id: string;
  pageNumber: number;
  sectionId: string;
  selectedText: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: string;
}

export interface UserAnnotation {
  id: string;
  pageNumber: number;
  sectionId: string;
  noteText: string;
  createdAt: string;
}

export interface UserA4NotesData {
  documentAssetId: string;
  highlights: UserHighlight[];
  annotations: UserAnnotation[];
  lastVisitedPage?: number;
}
