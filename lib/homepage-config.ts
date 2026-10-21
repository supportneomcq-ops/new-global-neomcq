export interface HeroConfig {
  badgeText: string;
  headlinePrefix: string;
  headlineGradient1: string;
  headlineMiddle: string;
  headlineGradient2: string;
  subtitle: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  trustText: string;
  heroVisualType: 'ai_orb' | 'dashboard_preview' | '3d_student' | 'custom_image';
  customImageUrl?: string;
  stats: Array<{ id: string; label: string; value: string; subtext: string; icon: string }>;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  ctaText: string;
  ctaLink: string;
  badge: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  color: string;
}

export interface ExamItem {
  id: string;
  title: string;
  category: 'Medical' | 'Engineering' | 'Civil Services' | 'College Entrance' | 'Professional' | 'Custom';
  questionCount: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  popularBadge?: string;
  icon: string;
  tags: string[];
  link: string;
}

export interface DemoQuestion {
  id: string;
  examTag: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  aiTip: string;
}

export interface WhyPillar {
  id: string;
  title: string;
  description: string;
  statValue: string;
  statLabel: string;
  icon: string;
  traditionalWay: string;
  neoWay: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  exam: string;
  score: string;
  quote: string;
  avatarUrl: string;
  rating: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  currencySymbol: string;
  popular?: boolean;
  badge?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SectionVisibility {
  announcement: boolean;
  hero: boolean;
  examCategories: boolean;
  features: boolean;
  interactiveDemo: boolean;
  whyNeo: boolean;
  testimonials: boolean;
  pricing: boolean;
  faq: boolean;
  ctaBanner: boolean;
}

export interface HomepageConfig {
  version: number;
  accentPreset: 'violet' | 'cyan' | 'emerald' | 'amber';
  announcement: AnnouncementConfig;
  hero: HeroConfig;
  features: FeatureItem[];
  exams: ExamItem[];
  demoQuestion: DemoQuestion;
  whyPillars: WhyPillar[];
  testimonials: TestimonialItem[];
  pricing: PricingPlan[];
  faqs: FaqItem[];
  visibility: SectionVisibility;
}

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  version: 2,
  accentPreset: 'violet',
  announcement: {
    enabled: true,
    text: '🚀 NeoMCQ AI 3.5 Engine Updated — Practice with 100,000+ Verified MCQs',
    ctaText: 'Try AI Practice',
    ctaLink: '/register',
    badge: 'NEW RELEASE',
  },
  hero: {
    badgeText: '✨ AI-Powered Exam Mastery Platform',
    headlinePrefix: 'The Future of',
    headlineGradient1: 'Exam Preparation',
    headlineMiddle: 'Powered by',
    headlineGradient2: 'Artificial Intelligence.',
    subtitle: 'One AI. Every Exam. Every Country.',
    description: 'Prepare smarter with adaptive practice, high-yield detailed rationales, spaced repetition flashcards, and personalized analytics that get you top results.',
    primaryCtaText: 'Start Studying Free',
    primaryCtaLink: '/onboarding',
    secondaryCtaText: 'Explore Exams',
    secondaryCtaLink: '#exams',
    trustText: 'No Credit Card Required • Instant AI Access • 50,000+ Students',
    heroVisualType: 'ai_orb',
    customImageUrl: '/assets/student-welcome-banner.png',
    stats: [
      { id: '1', label: 'Active Students', value: '50,000+', subtext: 'In 35+ Countries', icon: 'Users' },
      { id: '2', label: 'Practice Questions', value: '100,000+', subtext: 'Verified & Explained', icon: 'BookOpen' },
      { id: '3', label: 'Average Score Boost', value: '+28%', subtext: 'Within 30 Days', icon: 'TrendingUp' },
      { id: '4', label: 'AI Rationales Generated', value: '2.5M+', subtext: 'Instant Feedback', icon: 'Zap' },
    ],
  },
  visibility: {
    announcement: true,
    hero: true,
    examCategories: true,
    features: true,
    interactiveDemo: true,
    whyNeo: true,
    testimonials: true,
    pricing: true,
    faq: true,
    ctaBanner: true,
  },
  features: [
    {
      id: 'f1',
      title: 'AI Question Generator',
      description: 'Generate endless high-yield multiple choice questions tailored specifically to your weak areas, target difficulty, and syllabus topic.',
      icon: 'Sparkles',
      badge: 'Core AI',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'f2',
      title: 'Detailed Explanations & Rationales',
      description: 'Never memorize blindly again. Get step-by-step AI breakdowns explaining why every option is correct or incorrect with clinical/academic sources.',
      icon: 'CheckCircle2',
      badge: 'Smart Feedback',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'f3',
      title: 'Performance Analytics & Tracker',
      description: 'Identify topic vulnerabilities before exam day. Precision radar charts and speed analytics show you exact high-yield subjects to revise.',
      icon: 'BarChart3',
      badge: 'Real-time',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'f4',
      title: 'Timed Mock Tests & Exam Mode',
      description: 'Simulate true exam day pressure with realistic timers, negative marking calculators, bookmarking, and official formatting.',
      icon: 'Clock',
      badge: 'Simulation',
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'f5',
      title: 'Smart Spaced Repetition Flashcards',
      description: 'Convert tricky MCQs directly into interactive active-recall flashcard decks powered by Anki-style spaced repetition algorithms.',
      icon: 'BrainCircuit',
      badge: 'Active Recall',
      color: 'from-pink-500 to-rose-600',
    },
    {
      id: 'f6',
      title: 'Exam-Specific Question Banks',
      description: 'Curated question banks aligned with official blueprints for Medical (USMLE, NEET PG), Engineering (GATE, JEE), Civil Services, and SAT.',
      icon: 'Database',
      badge: 'Global Syllabi',
      color: 'from-violet-500 to-purple-700',
    },
  ],
  exams: [
    {
      id: 'e1',
      title: 'USMLE Step 1 & 2 CK',
      category: 'Medical',
      questionCount: '15,000+ MCQs',
      difficulty: 'Adaptive',
      popularBadge: 'Most Popular',
      icon: 'Stethoscope',
      tags: ['Physiology', 'Pathology', 'Pharmacology'],
      link: '/exams/usmle',
    },
    {
      id: 'e2',
      title: 'NEET PG / INI-CET',
      category: 'Medical',
      questionCount: '22,000+ MCQs',
      difficulty: 'Hard',
      popularBadge: 'High Demand',
      icon: 'Activity',
      tags: ['Clinical Subjects', 'Basic Sciences', 'High-Yield Image Based'],
      link: '/exams/neet-pg',
    },
    {
      id: 'e3',
      title: 'NCLEX-RN Practice',
      category: 'Medical',
      questionCount: '8,500+ NGN MCQs',
      difficulty: 'Adaptive',
      popularBadge: 'NGN Format',
      icon: 'HeartPulse',
      tags: ['Next-Gen Case Studies', 'Pharm', 'Patient Safety'],
      link: '/exams/nclex',
    },
    {
      id: 'e4',
      title: 'JEE Advanced & Mains',
      category: 'Engineering',
      questionCount: '18,000+ MCQs',
      difficulty: 'Hard',
      popularBadge: 'Top Tier',
      icon: 'Atom',
      tags: ['Physics', 'Organic Chemistry', 'Calculus'],
      link: '/exams/jee',
    },
    {
      id: 'e5',
      title: 'UPSC Civil Services Prelims',
      category: 'Civil Services',
      questionCount: '12,000+ MCQs',
      difficulty: 'Hard',
      popularBadge: 'Popular',
      icon: 'Landmark',
      tags: ['Polity', 'Economy', 'History & Current Affairs'],
      link: '/exams/upsc',
    },
    {
      id: 'e6',
      title: 'SAT & Digital ACT',
      category: 'College Entrance',
      questionCount: '10,000+ MCQs',
      difficulty: 'Medium',
      popularBadge: 'New Format',
      icon: 'GraduationCap',
      tags: ['Digital SAT Math', 'Reading & Writing', 'Adaptive'],
      link: '/exams/sat',
    },
  ],
  demoQuestion: {
    id: 'demo-1',
    examTag: 'USMLE Step 1 / Medical',
    subject: 'Pharmacology & Pathology',
    question: 'A 54-year-old male with a history of hypertension and gout presents with severe, sudden-onset pain in his right big toe. Diagnostic arthrocentesis reveals needle-shaped, negatively birefringent crystals under polarized light. Which of the following anti-hypertensive medications was most likely responsible for precipitating this flare?',
    options: [
      'A) Lisinopril',
      'B) Hydrochlorothiazide',
      'C) Amlodipine',
      'D) Metoprolol Succinate',
    ],
    correctIndex: 1,
    explanation: 'Hydrochlorothiazide (HCTZ) is a thiazide diuretic that inhibits the Na+/Cl- cotransporter in the distal convoluted tubule. Thiazide diuretics compete with uric acid for organic acid secretion in the proximal tubule, causing uric acid retention and hyperuricemia, which can precipitate acute gouty arthritis flares.',
    aiTip: '💡 Clinical Pearl: Thiazides (HCTZ, Chlorthalidone) and Loop diuretics (Furosemide) reduce uric acid excretion. In patients with gout, Losartan or Calcium Channel Blockers (Amlodipine) are preferred antihypertensives!',
  },
  whyPillars: [
    {
      id: 'w1',
      title: 'Targeted AI Adaptive Learning',
      description: 'Unlike static textbook question banks, NeoMCQ dynamically presents questions at your precise difficulty horizon, ensuring maximum memory retention.',
      statValue: '3.2x',
      statLabel: 'Faster Mastery',
      icon: 'Target',
      traditionalWay: 'Random static PDFs without difficulty calibration',
      neoWay: 'Real-time difficulty engine based on your personal response lag',
    },
    {
      id: 'w2',
      title: 'Instant Socratic Rationale Engine',
      description: 'Stop wasting hours flipping through textbooks to check why an answer was wrong. Get instant, comprehensive breakdowns for all choices.',
      statValue: '100%',
      statLabel: 'Instant Rationales',
      icon: 'Brain',
      traditionalWay: 'Short, cryptic answer keys with minimal context',
      neoWay: 'Interactive AI tutor that answers follow-up questions',
    },
    {
      id: 'w3',
      title: 'Active Recall & Spaced Repetition',
      description: 'Automatically converts your incorrect questions into memory cards scheduled using proven cognitive science intervals.',
      statValue: '94%',
      statLabel: 'Long-term Retention',
      icon: 'Repeat',
      traditionalWay: 'Manual flashcard creation requiring hours of writing',
      neoWay: '1-click automated card deck creation with smart scheduling',
    },
  ],
  testimonials: [
    {
      id: 't1',
      name: 'Dr. Sarah Jenkins',
      role: 'USMLE Step 1 - 262 Score',
      exam: 'USMLE Step 1',
      score: 'Top 1% Global',
      quote: 'NeoMCQs AI explanation generator completely changed my preparation. Instead of just reading answer keys, I could ask follow-up questions to understand why wrong options were ruled out.',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      rating: 5,
    },
    {
      id: 't2',
      name: 'Rohan Sharma',
      role: 'NEET PG AIR 84',
      exam: 'NEET PG',
      score: 'AIR 84',
      quote: 'The weak spot tracker pointed out my Pharmacology gap 3 weeks before the exam. I spent 10 days focusing on NeoMCQ generated practice questions and saw an immediate jump in mock test scores.',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      rating: 5,
    },
    {
      id: 't3',
      name: 'Emily Chen',
      role: 'NCLEX-RN Passed (85 Questions)',
      exam: 'NCLEX-RN',
      score: 'Passed in 85',
      quote: 'The Next-Gen NCLEX case study generator was spot-on. I felt completely comfortable during the actual exam because the question layout and rationales were identical.',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813566-78853a06800d?w=150&auto=format&fit=crop&q=80',
      rating: 5,
    },
  ],
  pricing: [
    {
      id: 'p1',
      name: 'Free Pioneer',
      monthlyPrice: 0,
      annualPrice: 0,
      currencySymbol: '$',
      description: 'Essential practice tools to kickstart your preparation journey.',
      features: [
        '50 AI-generated MCQs per day',
        'Standard rationales & explanations',
        'Basic score tracking & subject stats',
        'Access to community question banks',
      ],
      ctaText: 'Get Started Free',
      ctaLink: '/onboarding',
    },
    {
      id: 'p2',
      name: 'Pro Master',
      monthlyPrice: 19,
      annualPrice: 12,
      currencySymbol: '$',
      popular: true,
      badge: 'MOST POPULAR',
      description: 'Unlimited access to all high-yield AI features and exam simulations.',
      features: [
        'Unlimited AI MCQ Generation',
        'Instant Socratic AI Follow-up Tutor',
        'Advanced Spaced Repetition Decks',
        'Full Mock Test Simulator with Timers',
        'Deep Radar Analytics & Weak Spot Detector',
        'Exportable Custom Study Revision PDF Notes',
        'Priority 24/7 AI Tutor Access',
      ],
      ctaText: 'Start 7-Day Free Trial',
      ctaLink: '/onboarding?plan=pro',
    },
    {
      id: 'p3',
      name: 'Institutional Pass',
      monthlyPrice: 49,
      annualPrice: 35,
      currencySymbol: '$',
      description: 'Ideal for study groups, medical schools, and coaching academies.',
      features: [
        'Everything in Pro Master',
        'Multi-user study group collaboration',
        'Custom syllabus upload & AI parsing',
        'Faculty / Mentor performance monitoring',
        'Dedicated account manager',
      ],
      ctaText: 'Contact Academic Team',
      ctaLink: '/contact-us',
    },
  ],
  faqs: [
    {
      id: 'fq1',
      question: 'How accurate are the AI-generated MCQs and explanations?',
      answer: 'NeoMCQ utilizes medical and academic benchmarked AI models trained on peer-reviewed guidelines, clinical reference materials, and official exam blueprints. Every explanation includes high-yield rationale and clinical pearls.',
      category: 'General',
    },
    {
      id: 'fq2',
      question: 'Can I use NeoMCQ for specific exams like USMLE, NEET PG, or JEE?',
      answer: 'Yes! NeoMCQ features pre-configured blueprints and question banks for USMLE Step 1/2, NEET PG, NCLEX-RN, JEE, UPSC, SAT, and custom professional certification exams. You can also input your own custom topic or syllabus.',
      category: 'Exams',
    },
    {
      id: 'fq3',
      question: 'What is the Spaced Repetition feature and how does it work?',
      answer: 'Whenever you get an MCQ incorrect or mark it for review, NeoMCQ creates a active-recall flashcard. Our spaced repetition engine resurfaces that concept at optimal cognitive time intervals (1 day, 3 days, 7 days, 14 days) to build long-term memory.',
      category: 'Features',
    },
    {
      id: 'fq4',
      question: 'Is there a free trial or refund policy?',
      answer: 'Yes, you can use the Free Pioneer plan indefinitely with daily practice quotas. Paid Pro plans come with a 7-day risk-free trial and a hassle-free refund policy.',
      category: 'Pricing',
    },
  ],
};

const STORAGE_KEY = 'neomcq_homepage_config_v2';

export function getHomepageConfig(): HomepageConfig {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.version === DEFAULT_HOMEPAGE_CONFIG.version) {
        return {
          ...DEFAULT_HOMEPAGE_CONFIG,
          ...parsed,
          visibility: { ...DEFAULT_HOMEPAGE_CONFIG.visibility, ...(parsed.visibility || {}) },
          hero: { ...DEFAULT_HOMEPAGE_CONFIG.hero, ...(parsed.hero || {}) },
          announcement: { ...DEFAULT_HOMEPAGE_CONFIG.announcement, ...(parsed.announcement || {}) },
        };
      }
    }
  } catch (err) {
    console.error('Error loading homepage config:', err);
  }
  return DEFAULT_HOMEPAGE_CONFIG;
}

export function saveHomepageConfig(config: HomepageConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event for real-time reactivity
    window.dispatchEvent(new Event('neomcq_homepage_config_updated'));
  } catch (err) {
    console.error('Error saving homepage config:', err);
  }
}

export function resetHomepageConfig(): HomepageConfig {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_CONFIG;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('neomcq_homepage_config_updated'));
  } catch (err) {
    console.error('Error resetting homepage config:', err);
  }
  return DEFAULT_HOMEPAGE_CONFIG;
}
