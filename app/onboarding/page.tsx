'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  User,
  Mail,
  Phone,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Loader2,
  Zap,
  Target,
  Languages,
  ArrowRight,
  ShieldAlert,
  Edit2,
  Building2,
  Layers,
  FileText,
  BookmarkCheck,
  ListOrdered,
  BadgeCheck,
  Database,
  Cpu,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import Link from 'next/link';

interface ExamInfo {
  id: string;
  name: string;
  slug: string;
  short_name?: string;
  category: string;
  country: string;
  flag: string;
  description?: string;
  difficulty?: string;
  question_count?: number;
  time_limit_mins?: number;
  in_database?: boolean;
}

interface OnboardingState {
  // Step 1: Account Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  language: string;
  password: string;

  // Step 2 & 3: Exam Selection & Confirmation
  examSearchQuery: string;
  selectedExamId: string;
  selectedExamName: string;
  selectedExamShortName: string;
  selectedExamCategory: string;
  selectedExamCountry: string;
  selectedExamFlag: string;
  selectedExamDescription: string;
  customExamInput: string;
  isCustomExam: boolean;
  resolvedCurriculumSummary?: {
    subjectCount: number;
    topicCount: number;
    subtopicCount: number;
  };

  // Step 4: Study Information
  examDate: string;
  learningStyle: 'Rapid Learning' | 'Balanced Study';
  studyHours: number;
  studyTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Flexible';
  studyGoals: string[];
}

const STORAGE_KEY = 'neomcq_onboarding_state';
const CURRENT_STEP_KEY = 'neomcq_onboarding_step';

const PRESET_EXAMS: ExamInfo[] = [
  { id: 'fmge', name: 'FMGE (Foreign Medical Graduate Examination)', slug: 'fmge', short_name: 'FMGE', category: 'Medical Licensing', country: 'India', flag: '🇮🇳', description: 'National Board of Examinations screening test for medical graduates.' },
  { id: 'usmle-step-1', name: 'USMLE Step 1 & Step 2 CK', slug: 'usmle-step-1', short_name: 'USMLE', category: 'Medical Licensing', country: 'United States', flag: '🇺🇸', description: 'United States Medical Licensing Examination assessing fundamental sciences and clinical knowledge.' },
  { id: 'neet-pg', name: 'NEET PG / INI-CET', slug: 'neet-pg', short_name: 'NEET PG', category: 'Postgraduate Medical', country: 'India', flag: '🇮🇳', description: 'National Eligibility cum Entrance Test for Postgraduate medical admissions in India.' },
  { id: 'plab', name: 'PLAB 1 / UKMLA', slug: 'plab', short_name: 'PLAB/UKMLA', category: 'Medical Licensing', country: 'United Kingdom', flag: '🇬🇧', description: 'Professional and Linguistic Assessments Board test for UK medical licensing.' },
  { id: 'nclex-rn', name: 'NCLEX-RN Nursing Licensure', slug: 'nclex-rn', short_name: 'NCLEX-RN', category: 'Nursing & Healthcare', country: 'United States', flag: '🇺🇸', description: 'National Council Licensure Examination for Registered Nurses.' },
  { id: 'amc-mcq', name: 'AMC MCQ Examination', slug: 'amc-mcq', short_name: 'AMC', category: 'Medical Licensing', country: 'Australia', flag: '🇦🇺', description: 'Australian Medical Council computer-adaptive multiple-choice examination.' },
  { id: 'upsc-cse', name: 'UPSC Civil Services Examination (Prelims & Mains)', slug: 'upsc-cse', short_name: 'UPSC CSE', category: 'Civil Services & Administration', country: 'India', flag: '🇮🇳', description: 'Union Public Service Commission premier civil services examination.' },
  { id: 'cfa-level-1', name: 'CFA Level I, II & III', slug: 'cfa-level-1', short_name: 'CFA', category: 'Finance & Investment', country: 'Global', flag: '🌐', description: 'Chartered Financial Analyst credential covering ethical, analytical and financial standards.' },
  { id: 'ca-final', name: 'ICAI Chartered Accountancy (CA Final / Inter)', slug: 'ca-final', short_name: 'CA Final', category: 'Accounting & Taxation', country: 'India', flag: '🇮🇳', description: 'Institute of Chartered Accountants of India professional examination.' },
  { id: 'gre-general', name: 'GRE General Test', slug: 'gre-general', short_name: 'GRE', category: 'Graduate Entrance', country: 'Global', flag: '🌐', description: 'Graduate Record Examination assessing verbal reasoning, quantitative reasoning, and writing.' },
  { id: 'gmat-focus', name: 'GMAT Focus Edition', slug: 'gmat-focus', short_name: 'GMAT', category: 'Business & Management', country: 'Global', flag: '🌐', description: 'Graduate Management Admission Test for top global MBA and business master programs.' },
  { id: 'ielts-academic', name: 'IELTS Academic', slug: 'ielts-academic', short_name: 'IELTS', category: 'Language Proficiency', country: 'Global', flag: '🌐', description: 'International English Language Testing System for university admissions and visa verification.' },
];

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
];

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'United Arab Emirates',
  'Singapore',
  'Japan',
  'South Africa',
  'Other Global Location',
];

const LANGUAGES = [
  'English (US/UK)',
  'Hindi',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Arabic',
  'Portuguese',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [formError, setFormError] = useState('');
  const [isResolvingExam, setIsResolvingExam] = useState(false);
  const [resolvingStage, setResolvingStage] = useState<number>(0);
  const [resolvingExamType, setResolvingExamType] = useState<'EXISTING' | 'NEW_SYNTHESIS'>('EXISTING');
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Live database states
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [dbLanguages, setDbLanguages] = useState<any[]>([]);
  const [dbExams, setDbExams] = useState<ExamInfo[]>([]);
  const [searchResults, setSearchResults] = useState<ExamInfo[]>([]);
  const [isSearchingExams, setIsSearchingExams] = useState(false);

  // Step 5 Progress Animation Steps
  const [prepProgress, setPrepProgress] = useState<number>(0);
  const [prepStatuses, setPrepStatuses] = useState<string[]>([
    'Preparing your exam curriculum...',
    'Exam verified',
    'Subjects prepared',
    'Main topics prepared',
    'Subtopics prepared where applicable',
    'Curriculum saved',
  ]);
  const [activePrepIndex, setActivePrepIndex] = useState<number>(0);

  // Core Form State
  const [formData, setFormData] = useState<OnboardingState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+91',
    country: 'India',
    language: 'English (US/UK)',
    password: '',

    examSearchQuery: '',
    selectedExamId: '',
    selectedExamName: '',
    selectedExamShortName: '',
    selectedExamCategory: '',
    selectedExamCountry: 'India',
    selectedExamFlag: '🇮🇳',
    selectedExamDescription: '',
    customExamInput: '',
    isCustomExam: false,
    resolvedCurriculumSummary: {
      subjectCount: 0,
      topicCount: 0,
      subtopicCount: 0,
    },

    examDate: '',
    learningStyle: 'Balanced Study',
    studyHours: 4,
    studyTime: 'Morning',
    studyGoals: ['Pass Exam', 'High Score', 'Master Weak Areas'],
  });

  // Fetch reference data from database
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [countriesRes, languagesRes, examsRes] = await Promise.all([
          fetch('/api/countries').catch(() => null),
          fetch('/api/languages').catch(() => null),
          fetch('/api/exams/search').catch(() => null),
        ]);

        if (countriesRes?.ok) {
          const data = await countriesRes.json();
          if (data.success && data.countries?.length > 0) setDbCountries(data.countries);
        }

        if (languagesRes?.ok) {
          const data = await languagesRes.json();
          if (data.success && data.languages?.length > 0) setDbLanguages(data.languages);
        }

        if (examsRes?.ok) {
          const data = await examsRes.json();
          if (data.success && data.exams?.length > 0) {
            setDbExams(data.exams);
            setSearchResults(data.exams);
          } else {
            setDbExams(PRESET_EXAMS);
            setSearchResults(PRESET_EXAMS);
          }
        } else {
          setDbExams(PRESET_EXAMS);
          setSearchResults(PRESET_EXAMS);
        }
      } catch (err) {
        console.error('Failed to load database reference data:', err);
        setDbExams(PRESET_EXAMS);
        setSearchResults(PRESET_EXAMS);
      }
    }
    loadReferenceData();
  }, []);

  // Search debounce
  useEffect(() => {
    if (!formData.examSearchQuery.trim()) {
      setSearchResults(dbExams.length > 0 ? dbExams : PRESET_EXAMS);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingExams(true);
      try {
        const res = await fetch(`/api/exams/search?q=${encodeURIComponent(formData.examSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.exams)) {
            setSearchResults(data.exams);
          }
        }
      } catch (err) {
        console.warn('Search request fallback to client filter:', err);
        const q = formData.examSearchQuery.toLowerCase();
        const list = (dbExams.length > 0 ? dbExams : PRESET_EXAMS).filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q) ||
            e.short_name?.toLowerCase().includes(q)
        );
        setSearchResults(list);
      } finally {
        setIsSearchingExams(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.examSearchQuery, dbExams]);

  // Set default date on mount if not loaded from cache
  useEffect(() => {
    const timer = setTimeout(() => {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      const defaultDate = d.toISOString().split('T')[0];

      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        const savedStep = localStorage.getItem(CURRENT_STEP_KEY);

        if (savedState) {
          const parsed = JSON.parse(savedState);
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            examDate: parsed.examDate || defaultDate,
          }));
        } else {
          setFormData((prev) => ({ ...prev, examDate: defaultDate }));
        }

        if (savedStep) {
          const stepNum = parseInt(savedStep, 10);
          if (stepNum >= 1 && stepNum <= 6) {
            setStep(stepNum);
          }
        }
      } catch (e) {
        console.warn('Failed to recover onboarding state from cache:', e);
      } finally {
        setIsMounted(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save progress on state change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      localStorage.setItem(CURRENT_STEP_KEY, step.toString());
    } catch (e) {
      // Ignore write errors
    }
  }, [formData, step, isMounted]);

  const updateField = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Time calculations
  const calculateTimeLeft = (targetDateStr: string) => {
    if (!targetDateStr) return { days: 90, weeks: 12.8, months: 3 };
    const target = new Date(targetDateStr).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 3600 * 24)));
    const weeks = Math.max(0, Number((days / 7).toFixed(1)));
    const months = Math.max(0, Number((days / 30.4).toFixed(1)));
    return { days, weeks, months };
  };

  const { days: daysLeft, weeks: weeksLeft, months: monthsLeft } = calculateTimeLeft(formData.examDate);
  const learningPhaseDays = Math.max(1, daysLeft - 5);

  // Form validations per step
  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        setFormError('Please enter your first name.');
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setFormError('Please enter a valid email address.');
        return false;
      }
      if (!formData.password || formData.password.length < 8) {
        setFormError('Please create a secure password of at least 8 characters.');
        return false;
      }
      if (!formData.phone.trim()) {
        setFormError('Please enter your mobile phone number for high-priority study reminders.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.selectedExamName && !formData.customExamInput.trim()) {
        setFormError('Please select or search for the exam you are preparing for.');
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.examDate || daysLeft <= 0) {
        setFormError('Please choose a valid future official exam date.');
        return false;
      }
      if (learningPhaseDays <= 0) {
        setFormError('The 5-Day Lockout Rule requires your exam date to be at least 6 days in the future to allow for a learning curriculum and revision buffer.');
        return false;
      }
    }
    return true;
  };

  // Exam Selection Handler
  const handleSelectExamItem = (exam: ExamInfo) => {
    updateField('selectedExamId', exam.id || '');
    updateField('selectedExamName', exam.name);
    updateField('selectedExamShortName', exam.short_name || exam.name.split(' ')[0]);
    updateField('selectedExamCategory', exam.category || 'Standard Exam Prep');
    updateField('selectedExamCountry', exam.country || 'Global');
    updateField('selectedExamFlag', exam.flag || '🌐');
    updateField('selectedExamDescription', exam.description || `Official examination preparation for ${exam.name}.`);
    updateField('isCustomExam', false);
    updateField('customExamInput', '');
    setFormError('');
  };

  // Handle Moving from Step 2 to Step 3 (Confirmation)
  const handleProceedFromExamSelection = async () => {
    if (!validateStep(2)) return;

    // If user provided a custom exam input or unlisted exam name, run Exam Intelligence / Resolution
    const targetInput = formData.customExamInput.trim() || formData.selectedExamName;
    const isCustom = formData.isCustomExam || !!formData.customExamInput.trim();

    setIsResolvingExam(true);
    setResolvingStage(0);
    setResolvingExamType(isCustom ? 'NEW_SYNTHESIS' : 'EXISTING');
    setFormError('');

    // Smooth stage progression ticker (0 -> 1 -> 2 -> 3)
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      currentStage = Math.min(3, currentStage + 1);
      setResolvingStage(currentStage);
    }, 600);

    try {
      const startTime = Date.now();
      const res = await fetch('/api/exams/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examQuery: targetInput,
          country: formData.country,
          category: formData.selectedExamCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.exam?.id) {
        throw new Error(data.error || 'We could not verify this exam. Please choose a listed exam or try again.');
      }

      // Detect if server identified a new custom synthesis vs existing canonical record
      const isNewExam = data.is_new || data.decision === 'NEW_EXAM_CREATED' || isCustom;
      setResolvingExamType(isNewExam ? 'NEW_SYNTHESIS' : 'EXISTING');

      if (data.exam) {
        const ex = data.exam;
        updateField('selectedExamId', ex.id);
        updateField('selectedExamName', ex.name);
        updateField('selectedExamShortName', ex.short_name || ex.name.split(' ')[0]);
        updateField('selectedExamCategory', ex.category || formData.selectedExamCategory);
        updateField('selectedExamCountry', ex.country || formData.country);
        updateField('selectedExamFlag', ex.flag || '🌐');
        updateField('selectedExamDescription', ex.description || `Official curriculum for ${ex.name}`);

        const subjects = ex.exam_subjects || [];
        const subjectCount = ex.subjectCount ?? subjects.length;
        let topicCount = ex.topicCount ?? 0;
        let subtopicCount = ex.subtopicCount ?? 0;

        if (!ex.topicCount && subjects.length > 0) {
          subjects.forEach((s: any) => {
            const topics = s.exam_topics || [];
            topicCount += topics.length;
            topics.forEach((t: any) => {
              if (t.exam_subtopics) subtopicCount += t.exam_subtopics.length;
            });
          });
        }

        updateField('resolvedCurriculumSummary', {
          subjectCount,
          topicCount,
          subtopicCount,
        });
      }

      // Ensure minimum display time (2.4s) so user clearly views resolution steps
      const elapsed = Date.now() - startTime;
      const minDuration = 2400;
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }

      // Final Completion Step (4)
      clearInterval(stageInterval);
      setResolvingStage(4);
      await new Promise((resolve) => setTimeout(resolve, 650));

      setStep(3); // Proceed to Step 3: Exam Confirmation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Exam resolution error:', err);
      clearInterval(stageInterval);
      setResolvingStage(0);
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Never advance onboarding with an unresolved or fabricated exam selection.
      setFormError('We could not verify this exam right now. Please try again or choose an exam from the list. Your selection has not been saved.');
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      clearInterval(stageInterval);
      setIsResolvingExam(false);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      handleProceedFromExamSelection();
      return;
    }

    if (validateStep(step)) {
      if (step === 4) {
        // From Step 4 (Study Info), go to Step 5 (Curriculum Preparation & Account Creation)
        startCurriculumPreparation();
      } else if (step < 6) {
        setStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrev = () => {
    setFormError('');
    if (step > 1 && step !== 5) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoalToggle = (goal: string) => {
    if (formData.studyGoals.includes(goal)) {
      updateField('studyGoals', formData.studyGoals.filter((g) => g !== goal));
    } else {
      updateField('studyGoals', [...formData.studyGoals, goal]);
    }
  };

  // STEP 5: CURRICULUM PREPARATION & ACCOUNT CREATION
  const startCurriculumPreparation = async () => {
    setStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActivePrepIndex(0);
    setPrepProgress(15);

    try {
      const supabase = getSupabaseClient();

      // Progress Step 0: Exam recognized and validated
      await new Promise((r) => setTimeout(r, 400));
      setActivePrepIndex(1);
      setPrepProgress(30);

      // 1. SignUp via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: `${formData.countryCode}${formData.phone}`,
            country: formData.country,
            language: formData.language,
            exam: formData.selectedExamName,
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?next=/dashboard` : undefined,
        },
      });

      if (authError) {
        console.warn('Auth notice:', authError.message);
        const lowerMsg = authError.message.toLowerCase();
        if (lowerMsg.includes('already registered') || lowerMsg.includes('already in use') || lowerMsg.includes('user already exists')) {
          setFormError('An account with this email already exists. Please sign in or use a different email.');
          setStep(1);
          return;
        }
        if (lowerMsg.includes('password')) {
          setFormError('Password must be at least 8 characters long.');
          setStep(1);
          return;
        }

        // Do not continue onboarding when account creation failed for any other reason.
        setFormError('We could not create your account right now. Please try again in a moment.');
        setStep(1);
        return;
      }

      // Progress Step 2: Curriculum framework resolved in database
      setActivePrepIndex(2);
      setPrepProgress(50);

      // 2. Map preferred time to DB Check constraint values ('morning', 'afternoon', 'evening', 'night')
      let dbPreferredTime: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
      const uiTimeLower = formData.studyTime.toLowerCase();
      if (['morning', 'afternoon', 'evening', 'night'].includes(uiTimeLower)) {
        dbPreferredTime = uiTimeLower as any;
      }

      // Progress Step 3: Synchronizing subjects and syllabus
      setActivePrepIndex(3);
      setPrepProgress(70);

      // 3. Sync all data server-side via the secure onboarding API
      const onboardResponse = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authData?.user?.id || null,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: `${formData.countryCode}${formData.phone}`,
          country: formData.country,
          language: formData.language,
          examName: formData.selectedExamName,
          examId: formData.selectedExamId || null,
          examDate: formData.examDate,
          daysLeft,
          learningStyle: formData.learningStyle === 'Rapid Learning' ? 'rapid' : 'balanced',
          studyHours: formData.studyHours,
          studyTime: dbPreferredTime,
          studyGoals: formData.studyGoals,
        }),
      });

      const onboardData = await onboardResponse.json().catch(() => ({}));
      if (!onboardResponse.ok || onboardData.success === false) {
        throw new Error(onboardData.error || 'Failed to finalize curriculum setup.');
      }

      // Progress Step 4: Subtopics & modules verified
      setActivePrepIndex(4);
      setPrepProgress(85);

      // 4. Initialize the real study-plan endpoint only when sign-up returned a session.
      // Email-confirmation sign-ups have no session yet; the dashboard initializes the plan after verification.
      if (authData?.session) {
        try {
          const studyPlanResponse = await fetch('/api/study-plans/current', {
            method: 'GET',
            cache: 'no-store',
          });
          if (!studyPlanResponse.ok) {
            console.warn('Study plan initialization deferred:', studyPlanResponse.status);
          }
        } catch (planErr) {
          console.warn('Study plan initialization deferred:', planErr);
        }
      }

      // Progress Step 5: Finished
      setActivePrepIndex(5);
      setPrepProgress(100);

      // 5. Store active selection directly in localStorage so Dashboard renders the exact chosen exam
      try {
        const initialSelection = {
          exam: {
            id: onboardData.examId || formData.selectedExamId || onboardData.exam?.id || 'selected-exam',
            name: formData.selectedExamName,
            slug: formData.selectedExamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          },
          subject: null,
          topic: null,
          subtopic: null,
        };
        localStorage.setItem('neomcq_selection', JSON.stringify(initialSelection));
        localStorage.setItem('neomcq_target_date', formData.examDate);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CURRENT_STEP_KEY);
      } catch {
        // Safe to ignore
      }

      await new Promise((r) => setTimeout(r, 600));

      // Check if email confirmation is required:
      // If user session is null (or user has no email_confirmed_at), email verification is required.
      const requiresConfirmation = !authData?.session || !authData?.user?.email_confirmed_at;
      if (requiresConfirmation && authData?.user?.id) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Onboarding preparation error:', err);
      const rawMsg = (err.message || '').toLowerCase();
      let safeMsg = 'Setup could not be completed at this time. Please verify your details and try again.';
      if (rawMsg.includes('already registered') || rawMsg.includes('already in use')) {
        safeMsg = 'An account with this email already exists. Please sign in or use a different email.';
        setStep(1);
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch') || rawMsg.includes('failed to fetch')) {
        safeMsg = 'Network connection issue. Please check your internet connection and retry.';
        setStep(4);
      } else {
        setStep(4);
      }
      setFormError(safeMsg);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#050816] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white flex flex-col relative overflow-hidden font-sans antialiased">
      {/* Visual background decorations */}
      <div className="absolute top-[-20%] left-[-25%] w-[70%] h-[70%] rounded-full bg-[#6D5BFF]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-20%] w-[65%] h-[65%] rounded-full bg-[#00D4FF]/5 blur-[120px] pointer-events-none" />

      {/* Header with Progress Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#050816]/80 border-b border-slate-200/80 dark:border-gray-900/60 backdrop-blur-xl transition-all">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-heading font-extrabold px-3 py-1 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] border border-[#6D5BFF]/25">
              Step {step} of 6
            </span>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              {Math.round((step / 6) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* Dynamic elegant progress bar */}
        <div className="w-full h-1 bg-slate-100 dark:bg-gray-900">
          <motion.div
            className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]"
            initial={{ width: '16.6%' }}
            animate={{ width: `${(step / 6) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </div>
      </header>

      {/* Main Form Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-start z-10">
        {/* Error notification */}
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-start gap-2.5 shadow-sm"
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">{formError}</div>
            <button onClick={() => setFormError('')} className="p-1 hover:opacity-75 transition-opacity">
              <Check className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        <div className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/15 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/40 min-h-[460px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: ACCOUNT INFORMATION */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                    <User className="w-3.5 h-3.5" /> Step 1: Account Information
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Create your NeoMCQ Account
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Set up your global learner credentials to securely synchronize your curriculum and study plan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="e.g. Sarah"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="e.g. Connor"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="sarah.connor@university.edu"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Secure Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="Minimum 8 characters..."
                        className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.countryCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField('countryCode', val);
                          const match = (dbCountries.length > 0 ? dbCountries : COUNTRY_CODES).find((c: any) => (c.phone_code || c.code) === val);
                          if (match) updateField('country', match.name);
                        }}
                        className="px-2.5 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white cursor-pointer"
                      >
                        {dbCountries.length > 0 ? (
                          dbCountries.map((c) => (
                            <option key={c.id} value={c.phone_code}>
                              {c.flag_emoji} {c.phone_code}
                            </option>
                          ))
                        ) : (
                          COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))
                        )}
                      </select>

                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="9876543210"
                          className="w-full pl-10 pr-3 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Country
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={formData.country}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField('country', val);
                          const match = dbCountries.find((c) => c.name === val);
                          if (match) updateField('countryCode', match.phone_code);
                        }}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm text-slate-900 dark:text-white cursor-pointer"
                      >
                        {dbCountries.length > 0 ? (
                          dbCountries.map((cnt) => (
                            <option key={cnt.id} value={cnt.name}>
                              {cnt.flag_emoji} {cnt.name}
                            </option>
                          ))
                        ) : (
                          COUNTRIES.map((cnt) => (
                            <option key={cnt} value={cnt}>
                              {cnt}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Preferred Language
                    </label>
                    <div className="relative">
                      <Languages className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={formData.language}
                        onChange={(e) => updateField('language', e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm text-slate-900 dark:text-white cursor-pointer"
                      >
                        {dbLanguages.length > 0 ? (
                          dbLanguages.map((lang) => (
                            <option key={lang.id} value={lang.name}>
                              {lang.name} {lang.native_name ? `(${lang.native_name})` : ''}
                            </option>
                          ))
                        ) : (
                          LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: SELECT / SEARCH EXAM */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                    <BookOpen className="w-3.5 h-3.5" /> Step 2: Select / Search Exam
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    What exam are you preparing for?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Search from 180+ verified global exams or enter any custom certification to resolve instantly.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.examSearchQuery}
                      onChange={(e) => updateField('examSearchQuery', e.target.value)}
                      placeholder="Type exam code or name (e.g. FMGE, USMLE, NEET PG, UPSC, CFA, PLAB)..."
                      className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                    />
                    {isSearchingExams && (
                      <Loader2 className="absolute right-4 top-3.5 w-4 h-4 text-[#6D5BFF] animate-spin" />
                    )}
                  </div>

                  {/* Instant Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {searchResults.map((ex) => {
                      const isSelected = formData.selectedExamId === ex.id || formData.selectedExamName === ex.name;
                      return (
                        <button
                          key={ex.id || ex.name}
                          type="button"
                          onClick={() => handleSelectExamItem(ex)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 ring-1 ring-[#6D5BFF] font-bold text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/40 text-slate-600 dark:text-gray-300 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-lg shrink-0 mt-0.5">{ex.flag || '🌐'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#6D5BFF] dark:text-[#00D4FF] font-extrabold uppercase truncate">
                                {ex.category || 'Exam Prep'}
                              </span>
                              {ex.short_name && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-gray-800 rounded font-mono font-bold text-slate-600 dark:text-gray-300">
                                  {ex.short_name}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-heading font-bold truncate mt-0.5">{ex.name}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#6D5BFF] shrink-0 mt-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Exam Input */}
                  <div className="pt-3 border-t border-slate-100 dark:border-gray-800/80 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Can&apos;t find your exam? Type custom exam name:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.customExamInput}
                        onChange={(e) => {
                          updateField('customExamInput', e.target.value);
                          if (e.target.value.trim()) {
                            updateField('isCustomExam', true);
                            updateField('selectedExamName', e.target.value.trim());
                            updateField('selectedExamShortName', e.target.value.trim().split(' ')[0]);
                          }
                        }}
                        placeholder="e.g. Royal College FRCS Part A, AWS Solutions Architect, MRCP..."
                        className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: EXAM CONFIRMATION */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <BadgeCheck className="w-3.5 h-3.5" /> Step 3: Exam Confirmation
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Confirm your Recognized Curriculum
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    NeoMCQ has recognized your target examination and aligned its official syllabus structure.
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 space-y-4 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <span className="text-3xl p-2 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-slate-100 dark:border-gray-700">
                      {formData.selectedExamFlag || '🌐'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#6D5BFF] dark:text-[#00D4FF] uppercase tracking-wider">
                          {formData.selectedExamCategory}
                        </span>
                        {formData.selectedExamShortName && (
                          <span className="text-[10px] px-2 py-0.5 bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] font-mono font-bold rounded-full border border-[#6D5BFF]/20">
                            {formData.selectedExamShortName}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 dark:text-white mt-1">
                        {formData.selectedExamName}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                        {formData.selectedExamDescription}
                      </p>
                    </div>
                  </div>

                  {/* Canonical Structure Summary */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 text-center">
                      <Layers className="w-4 h-4 text-[#6D5BFF] mx-auto mb-1" />
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {formData.resolvedCurriculumSummary?.subjectCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Subjects</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 text-center">
                      <FileText className="w-4 h-4 text-[#00D4FF] mx-auto mb-1" />
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {formData.resolvedCurriculumSummary?.topicCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Topics</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 text-center">
                      <BookmarkCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {formData.resolvedCurriculumSummary?.subtopicCount ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Subtopics</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>✓ Database-verified canonical syllabus & zero duplicate entity protection</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: STUDY INFORMATION */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                    <Calendar className="w-3.5 h-3.5" /> Step 4: Study Information
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Configure your Adaptive Study Strategy
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Set your target date (5-day lockout calculation) and daily study preferences.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Target Date & 5-Day Lockout */}
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                        Official Exam Date <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-xs font-extrabold text-[#6D5BFF] dark:text-[#00D4FF]">
                        {daysLeft} Days Remaining
                      </span>
                    </div>
                    <input
                      type="date"
                      required
                      value={formData.examDate}
                      onChange={(e) => updateField('examDate', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
                    />

                    <div className="p-3 rounded-2xl bg-[#6D5BFF]/5 border border-[#6D5BFF]/20 text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Phase 1: Full Syllabus Mastery:</span>
                        <strong className="text-[#00D4FF]">Days 1 to {learningPhaseDays}</strong>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Phase 2: 5-Day Rapid Recall Lockout:</span>
                        <strong className="text-[#A855F7]">Final 5 Days (Day {learningPhaseDays + 1} to {daysLeft})</strong>
                      </div>
                    </div>
                  </div>

                  {/* Daily Hours & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase">Daily Study Time</span>
                        <span className="text-[#6D5BFF] dark:text-[#00D4FF] font-extrabold">{formData.studyHours} Hours/Day</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={formData.studyHours}
                        onChange={(e) => updateField('studyHours', Number(e.target.value))}
                        className="w-full accent-[#6D5BFF] h-2 bg-slate-200 dark:bg-gray-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-3xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Peak Study Window</label>
                      <select
                        value={formData.studyTime}
                        onChange={(e) => updateField('studyTime', e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="Morning">Morning (06:00 – 12:00)</option>
                        <option value="Afternoon">Afternoon (12:00 – 17:00)</option>
                        <option value="Evening">Evening (17:00 – 21:00)</option>
                        <option value="Night">Night (21:00 – 02:00)</option>
                        <option value="Flexible">Flexible / Varied</option>
                      </select>
                    </div>
                  </div>

                  {/* Learning Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField('learningStyle', 'Balanced Study')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.learningStyle === 'Balanced Study'
                          ? 'border-[#00D4FF] bg-[#00D4FF]/10 ring-1 ring-[#00D4FF]'
                          : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[#00D4FF] font-bold text-xs">
                        <Clock className="w-3.5 h-3.5" /> Balanced Study
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Spaced repetition & continuous concept mastery.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField('learningStyle', 'Rapid Learning')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        formData.learningStyle === 'Rapid Learning'
                          ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 ring-1 ring-[#6D5BFF]'
                          : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[#6D5BFF] font-bold text-xs">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Rapid Learning
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Accelerated testing & high-yield diagnostic drills.
                      </p>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: PREPARING YOUR CURRICULUM (PROGRESS ANIMATION) */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 space-y-6 text-center"
              >
                <div className="space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center shadow-lg shadow-[#6D5BFF]/25">
                    <Sparkles className="w-7 h-7 text-white animate-spin" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Preparing Your Master Curriculum
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
                    Synchronizing <strong className="text-[#00D4FF]">{formData.selectedExamName}</strong> with your personalized study plan...
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-emerald-400"
                    initial={{ width: '10%' }}
                    animate={{ width: `${prepProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                {/* Step Item Checklist */}
                <div className="space-y-2.5 text-left max-w-md mx-auto pt-2">
                  {[
                    'Exam recognized & canonical validity verified',
                    'Curriculum framework resolved in database',
                    'Core subjects prepared & synchronized',
                    'Topics mapped to syllabus specifications',
                    'Subtopics & modules verified',
                    'Personalized study plan scheduled',
                  ].map((label, idx) => {
                    const isDone = activePrepIndex > idx;
                    const isCurrent = activePrepIndex === idx;
                    return (
                      <div
                        key={label}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                            : isCurrent
                            ? 'bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] font-bold border border-[#6D5BFF]/25 shadow-sm'
                            : 'text-slate-400 dark:text-gray-600'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-[#6D5BFF] animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-gray-700 shrink-0" />
                        )}
                        <span className="text-xs truncate">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation Controls (Steps 1 to 4) */}
          {step < 5 && (
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={isResolvingExam}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white text-xs sm:text-sm font-heading font-extrabold shadow-lg shadow-[#6D5BFF]/25 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isResolvingExam ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resolving Exam...</span>
                  </>
                ) : step === 4 ? (
                  <>
                    <span>Generate Curriculum & Deploy</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* BIG EXAM RESOLUTION ANIMATION MODAL */}
      <AnimatePresence>
        {isResolvingExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-[#6D5BFF]/40 shadow-2xl shadow-[#6D5BFF]/25 text-white overflow-hidden space-y-6"
            >
              {/* Glowing Background Radial Accents */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#6D5BFF]/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00D4FF]/25 rounded-full blur-3xl pointer-events-none" />

              {/* Top Header Badge */}
              <div className="text-center space-y-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#6D5BFF]/20 text-[#00D4FF] border border-[#6D5BFF]/40 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>
                    {resolvingExamType === 'EXISTING'
                      ? 'Validating Exam Intelligence'
                      : 'Synthesizing Official Exam Pattern'}
                  </span>
                </div>

                {/* Central Pulsing Holographic Orbital Ring */}
                <div className="relative w-20 h-20 mx-auto my-3 flex items-center justify-center">
                  {/* Outer Spinning Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00D4FF]/40 animate-[spin_8s_linear_infinite]" />
                  {/* Inner Reverse Spinning Ring */}
                  <div className="absolute inset-2 rounded-full border-2 border-[#6D5BFF]/60 animate-[spin_4s_linear_infinite_reverse]" />
                  {/* Glowing Core */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center shadow-lg shadow-[#6D5BFF]/50 animate-pulse">
                    {resolvingExamType === 'EXISTING' ? (
                      <Database className="w-6 h-6 text-white" />
                    ) : (
                      <Cpu className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                  {resolvingExamType === 'EXISTING'
                    ? 'Verifying Database Record'
                    : 'Collecting Exam Blueprint & Patterns'}
                </h2>

                {/* Selected Exam Highlight Pill */}
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70 text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
                  <span className="text-lg shrink-0">{formData.selectedExamFlag || '🌐'}</span>
                  <span className="font-bold text-white truncate max-w-[280px]">
                    {formData.selectedExamName || formData.customExamInput}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#6D5BFF]/20 text-[#00D4FF] text-[10px] font-mono font-bold uppercase">
                    {formData.selectedExamCategory || 'Global Standard'}
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex justify-between text-[11px] font-mono font-bold text-slate-400">
                  <span>
                    {resolvingStage < 4 ? `STAGE ${resolvingStage + 1} OF 5` : 'COMPLETE'}
                  </span>
                  <span className="text-[#00D4FF]">
                    {Math.min(100, Math.round(((resolvingStage + 1) / 5) * 100))}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-emerald-400"
                    animate={{ width: `${Math.min(100, ((resolvingStage + 1) / 5) * 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              {/* Dynamic Resolution Checklist Steps */}
              <div className="space-y-2 text-left relative z-10 text-xs font-medium">
                {(resolvingExamType === 'EXISTING'
                  ? [
                      { title: 'Database Identity Check', desc: `Locating exam record & canonical slug in 'exams' table` },
                      { title: 'Curriculum Hierarchy Audit', desc: `Validating 'exam_subjects', 'exam_topics' & 'exam_subtopics'` },
                      { title: 'Pattern & Rule Config', desc: `Checking duration, question count & marking rules in 'exam_style_configurations'` },
                      { title: 'Canonical Scope Guarantee', desc: `Verifying unique entity protection & active database status` },
                      { title: 'Database Verification Confirmed', desc: `Exam verified & persistent in Supabase DB` },
                    ]
                  : [
                      { title: 'AI Knowledge Engine Connection', desc: `Analyzing official syllabus specifications for '${formData.selectedExamName || formData.customExamInput}'` },
                      { title: 'Collecting Exam Pattern & Duration', desc: `Structuring subject weightage, duration & marking parameters` },
                      { title: 'Taxonomy Hierarchy Synthesis', desc: `Mapping main topics and high-yield cognitive subtopics` },
                      { title: 'Saving to Supabase Database', desc: `Inserting records into 'exams', 'exam_subjects', 'exam_topics', 'exam_subtopics' & 'exam_style_configurations'` },
                      { title: 'Syllabus Successfully Registered', desc: `Canonical exam structure stored & ready for study strategy` },
                    ]
                ).map((item, idx) => {
                  const isDone = resolvingStage > idx;
                  const isCurrent = resolvingStage === idx;
                  return (
                    <div
                      key={item.title}
                      className={`p-2.5 rounded-2xl transition-all duration-300 flex items-center gap-3 border ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : isCurrent
                          ? 'bg-[#6D5BFF]/20 text-[#00D4FF] border-[#6D5BFF]/50 shadow-md shadow-[#6D5BFF]/20'
                          : 'bg-slate-800/40 text-slate-500 border-slate-800/80'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-[#00D4FF] animate-spin shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold leading-none">{item.title}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Database Persistence Explicit Footnote */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center gap-2 justify-center">
                <Database className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />
                <span>
                  Persisting to Supabase DB: <strong className="text-slate-200">exams, exam_subjects, exam_topics, exam_subtopics, exam_style_configurations</strong>
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
