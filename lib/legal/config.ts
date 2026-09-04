export interface LegalConfig {
  brandName: string;
  tagline: string;
  platformDescription: string;
  supportEmail: string;
  privacyEmail: string;
  legalEmail: string;
  securityEmail: string;
  effectiveDate: string;
  lastUpdated: string;
  pricing: {
    free: string;
    pro: string;
    max: string;
    elite: string;
    examSwitchFee: string;
  };
  limits: {
    free: string;
    pro: string;
    max: string;
    elite: string;
  };
}

export const LEGAL_CONFIG: LegalConfig = {
  brandName: 'NeoMCQ',
  tagline: 'World’s Most Intelligent AI Exam Preparation Platform',
  platformDescription:
    'NeoMCQ is an online educational technology platform providing AI-assisted exam preparation, structured learning materials, practice questions, quizzes, flashcards, notes, AI tutoring, study tools, and related educational services across international examination systems and jurisdictions.',
  supportEmail: 'support@neomcq.com',
  privacyEmail: 'privacy@neomcq.com',
  legalEmail: 'legal@neomcq.com',
  securityEmail: 'security@neomcq.com',
  effectiveDate: 'January 15, 2026',
  lastUpdated: 'September 4, 2026',
  pricing: {
    free: '$0 USD / Forever',
    pro: '$9.99 USD / Month',
    max: '$19.99 USD / Month',
    elite: '$499 USD / Year',
    examSwitchFee: '$2.00 USD per curriculum switch (FREE for Elite members)',
  },
  limits: {
    free: '1 unique lifetime topic across all features',
    pro: '100 MCQs/day, 10 Quizzes/day, 100 Flashcards/day, 10 A4 Notes/day, 50 Fill-in-the-Blanks/day, 50 AI Tutor interactions/day, 15 AI Tutor TTS/day, 2 topic switches/day',
    max: '350 MCQs/day, 30 Quizzes/day, 300 Flashcards/day, 30 A4 Notes/day, 150 Fill-in-the-Blanks/day, 150 AI Tutor interactions/day, 50 AI Tutor TTS/day, 15 topic switches/day',
    elite: 'Unlimited high-yield MCQs, Quizzes, Flashcards, A4 Notes, AI Tutor interactions & Neural Audio (TTS), unlimited topic switching, 365-day access',
  },
};
