'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
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
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  Target,
  Languages,
  Award,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from './logo';
import { GLOBAL_COUNTRIES } from '@/lib/data/countries';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userData: OnboardingData) => void;
}

export interface OnboardingData {
  id?: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  language: string;
  examName: string;
  examDate: string;
  daysLeft: number;
  weeksLeft: number;
  monthsLeft: number;
  learningStyle: 'Rapid Learning' | 'Balanced Study';
  studyHours: number;
  studyTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Flexible';
  studyGoals: string[];
}

const COUNTRY_CODES = Array.from(
  new Map(
    GLOBAL_COUNTRIES.map((c) => {
      const code = c.phone_code.startsWith('+') ? c.phone_code : `+${c.phone_code}`;
      return [
        code,
        {
          code,
          flag: c.flag_emoji || '🌐',
          name: c.name,
        },
      ];
    })
  ).values()
).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

const COUNTRIES = GLOBAL_COUNTRIES.map((c) => c.name);

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

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(1);

  // 1. Personal Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'registered' | 'invalid'>('idle');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('United States');
  const [language, setLanguage] = useState('English (US/UK)');

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailStatus('invalid');
      setEmailMessage('Enter a valid email address');
      return;
    }

    setEmailStatus('checking');
    setEmailMessage('Checking...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = await res.json();
        if (data.status === 'available') {
          setEmailStatus('available');
          setEmailMessage('Email available');
        } else if (data.status === 'registered') {
          setEmailStatus('registered');
          setEmailMessage('Email already registered');
        } else if (data.status === 'invalid') {
          setEmailStatus('invalid');
          setEmailMessage('Enter a valid email address');
        } else {
          setEmailStatus('idle');
          setEmailMessage('');
        }
      } catch {
        setEmailStatus('idle');
        setEmailMessage('');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  const handleCountrySelect = (newCountryName: string) => {
    setCountry(newCountryName);
    const matched = GLOBAL_COUNTRIES.find((c) => c.name === newCountryName);
    if (matched && matched.phone_code) {
      const formattedCode = matched.phone_code.startsWith('+')
        ? matched.phone_code
        : `+${matched.phone_code}`;
      setCountryCode(formattedCode);
    }
  };

  // 2. Exam Discovery & Selection
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExamCountry, setSelectedExamCountry] = useState('India');
  const [selectedExamFlag, setSelectedExamFlag] = useState('🇮🇳');
  const [selectedExamCategory, setSelectedExamCategory] = useState('Medical & Healthcare Licensing');
  const [customExamInput, setCustomExamInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingExams, setIsSearchingExams] = useState(false);
  const [fuzzyMatchProposal, setFuzzyMatchProposal] = useState<any | null>(null);
  const [pendingExamConfirmation, setPendingExamConfirmation] = useState<{
    id?: string;
    name: string;
    country?: string;
    flag?: string;
    category?: string;
    in_database?: boolean;
  } | null>(null);
  const [nameConfirmationProposal, setNameConfirmationProposal] = useState<{
    original: string;
    proposed: string;
  } | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load default featured exams from Registry / API on mount
  useEffect(() => {
    const fetchDefaultExams = async () => {
      try {
        const res = await fetch('/api/exams/search?featured=true');
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setSearchResults(data.exams);
        }
      } catch (err) {
        console.error('Failed to fetch default exams:', err);
        setSearchResults([]);
      }
    };
    fetchDefaultExams();
  }, []);

  // Handle Search Input Change with Debounce
  const handleSearchChange = (query: string) => {
    setExamSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingExams(true);
      try {
        const res = await fetch(`/api/exams/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.exams)) {
          setSearchResults(data.exams);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearchingExams(false);
      }
    }, 250);
  };

  // 3. Exam Date
  const defaultFutureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 100);
    return d.toISOString().split('T')[0];
  };
  const [examDate, setExamDate] = useState<string>(defaultFutureDate());

  // 4. Learning Style
  const [learningStyle, setLearningStyle] = useState<'Rapid Learning' | 'Balanced Study'>('Balanced Study');

  // 5. Study Hours & Time
  const [studyHours, setStudyHours] = useState<number>(4);
  const [studyTime, setStudyTime] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Flexible'>('Morning');

  // 6. Goals & Password
  const [studyGoals, setStudyGoals] = useState<string[]>([
    'Pass with High Score',
    'Improve Weak Areas',
    'High-Yield Revision',
  ]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingAI, setIsPreparingAI] = useState(false);
  const [isResolvingExam, setIsResolvingExam] = useState(false);
  const [resolutionStage, setResolutionStage] = useState('Understanding your exam...');
  const [resolvedExamInfo, setResolvedExamInfo] = useState<any>(null);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);

  // Time calculations
  const calculateTimeLeft = (targetDateStr: string) => {
    if (!targetDateStr) return { days: 0, weeks: 0, months: 0 };
    const target = new Date(targetDateStr).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 3600 * 24)));
    const weeks = Math.max(0, Number((days / 7).toFixed(1)));
    const months = Math.max(0, Number((days / 30.4).toFixed(1)));
    return { days, weeks, months };
  };

  const { days: daysLeft, weeks: weeksLeft, months: monthsLeft } = calculateTimeLeft(examDate);

  // 5-Day Rule calculations
  const learningPhaseDays = Math.max(0, daysLeft - 5);
  const finalRevisionDays = Math.min(5, daysLeft);

  const activeExamName = customExamInput.trim() || selectedExam;

  // Step Validations
  const validateStep1 = () => {
    if (!firstName.trim()) {
      setFormError('Please enter your first name.');
      return false;
    }
    if (!email.trim() || !email.includes('@') || emailStatus === 'invalid') {
      setFormError('Enter a valid email address.');
      return false;
    }
    if (emailStatus === 'registered') {
      setFormError('This email is already registered. Please sign in or use another email.');
      return false;
    }
    if (emailStatus === 'checking') {
      setFormError('Please wait while email availability is verified.');
      return false;
    }
    if (!phone.trim()) {
      setFormError('Please enter your mobile phone number.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep2 = () => {
    const rawExam = activeExamName.trim().toLowerCase();
    if (!rawExam) {
      setFormError('Please select or search for your exam.');
      return false;
    }
    // Country name guard: do not allow pure country name as exam
    if (
      rawExam === 'india' ||
      rawExam === 'united states' ||
      rawExam === 'usa' ||
      rawExam === 'uk' ||
      rawExam === 'canada' ||
      rawExam === 'australia'
    ) {
      setFormError(`"${activeExamName}" is a country name, not an examination. Please select a recognized exam (e.g. FMGE, NEET PG, USMLE, UPSC, CFA, NCLEX, AWS).`);
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep3 = () => {
    if (!examDate || daysLeft <= 0) {
      setFormError('Please select a valid future exam date.');
      return false;
    }
    if (daysLeft < 6) {
      setFormError('The 5-Day Lockout Rule requires an exam date at least 6 days in the future.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep4 = () => {
    setFormError('');
    return true;
  };

  const validateStep5 = () => {
    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return false;
    }
    if (studyGoals.length === 0) {
      setFormError('Please select at least one study goal.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleDirectResolve = async (queryToResolve: string) => {
    setIsResolvingExam(true);
    setResolutionStage('Resolving canonical exam curriculum...');

    const stageTimer1 = setTimeout(() => setResolutionStage('Checking database structure...'), 800);
    const stageTimer2 = setTimeout(() => setResolutionStage('Loading canonical subjects & topics...'), 1800);
    const stageTimer3 = setTimeout(() => setResolutionStage('Preparing learning environment...'), 2800);

    try {
      const res = await fetch('/api/exams/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examQuery: queryToResolve,
          country: selectedExamCountry,
          category: selectedExamCategory,
        }),
      });

      const data = await res.json();
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resolve examination curriculum');
      }

      if (data.exam) {
        setSelectedExamId(data.exam.id);
        setSelectedExam(data.exam.name);
        if (data.exam.country) setSelectedExamCountry(data.exam.country);
        if (data.exam.flag) setSelectedExamFlag(data.exam.flag);
        setResolvedExamInfo(data.exam);
      }

      setFuzzyMatchProposal(null);
      setNameConfirmationProposal(null);
      setFormError('');
      setIsResolvingExam(false);
      setStep(3);
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsResolvingExam(false);
      setFormError(err.message || 'Unable to resolve exam structure. Please check the name or try again.');
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setFormError('');
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setFormError('');

      // If user hasn't already confirmed a match proposal or name proposal, run verification first
      if (!fuzzyMatchProposal && !nameConfirmationProposal) {
        setIsResolvingExam(true);
        setResolutionStage('Checking database exam registry...');
        try {
          const verifyRes = await fetch('/api/exams/verify-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              examQuery: activeExamName,
              country: selectedExamCountry,
              category: selectedExamCategory,
            }),
          });
          const verifyData = await verifyRes.json();
          setIsResolvingExam(false);

          if (verifyData.success && verifyData.status === 'FUZZY_MATCH_PROPOSAL' && verifyData.matchedExam) {
            setFuzzyMatchProposal(verifyData.matchedExam);
            return;
          }

          if (verifyData.success && verifyData.status === 'NEW_EXAM_CONFIRMATION' && verifyData.proposedName) {
            setNameConfirmationProposal({
              original: activeExamName,
              proposed: verifyData.proposedName,
            });
            return;
          }
        } catch (vErr) {
          console.warn('Verify name fallback note:', vErr);
          setIsResolvingExam(false);
        }
      }

      const queryToResolve = nameConfirmationProposal?.proposed || activeExamName;
      await handleDirectResolve(queryToResolve);
      return;
    }

    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    setFormError('');
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setFormError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGoalToggle = (goal: string) => {
    if (studyGoals.includes(goal)) {
      setStudyGoals(studyGoals.filter((g) => g !== goal));
    } else {
      setStudyGoals([...studyGoals, goal]);
    }
  };

  // Final Account Creation & Onboarding Submission
  const handleCreateAccount = async () => {
    if (!validateStep5()) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const supabase = getSupabaseClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: `${countryCode}${phone}`,
            country,
            language,
            exam: activeExamName,
          },
        },
      });

      if (authError && !authError.message.includes('User already registered')) {
        console.warn('Supabase auth signup note:', authError.message);
      }

      setIsPreparingAI(true);

      // Registration waits for canonical exam resolution and curriculum completeness.
      // Do not launch a second resolver in the background: it can duplicate AI work.
      const onboardingResponse = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authData?.user?.id || null,
          firstName,
          lastName,
          email,
          phone: `${countryCode}${phone}`,
          country,
          examCountry: selectedExamCountry,
          examCategory: selectedExamCategory,
          language,
          examName: activeExamName,
          examId: selectedExamId,
          examDate,
          daysLeft,
          weeksLeft,
          monthsLeft,
          learningStyle,
          studyHours,
          studyTime,
          studyGoals,
        }),
      });
      const onboardingResult = await onboardingResponse.json().catch(() => ({}));
      if (!onboardingResponse.ok || onboardingResult?.success !== true) {
        throw new Error(
          onboardingResult?.error ||
          'We could not finish exam verification and curriculum setup. Please try again.'
        );
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setIsPreparingAI(false);
        setShowVerificationScreen(true);
      }, 900);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Account creation failed';
      setFormError(errMsg);
      setIsSubmitting(false);
      setIsPreparingAI(false);
    }
  };

  const handleCompleteAndDashboard = () => {
    onComplete({
      firstName,
      lastName,
      email,
      phone: `${countryCode}${phone}`,
      countryCode,
      country,
      language,
      examName: activeExamName,
      examDate,
      daysLeft,
      weeksLeft,
      monthsLeft,
      learningStyle,
      studyHours,
      studyTime,
      studyGoals,
    });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[99990] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden text-slate-900 dark:text-white select-none antialiased transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {pendingExamConfirmation && (
        <div className="absolute inset-0 z-[100000] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="exam-confirm-title">
          <div className="w-full max-w-md rounded-3xl border border-indigo-300/30 bg-white p-6 text-slate-900 shadow-2xl dark:bg-[#0E1324] dark:text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"><ShieldCheck className="h-6 w-6" /></div>
              <div><h2 id="exam-confirm-title" className="text-lg font-extrabold">Confirm your exam</h2><p className="text-xs text-slate-500 dark:text-slate-400">Please verify before continuing.</p></div>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
              <p className="text-xl font-extrabold">{pendingExamConfirmation.name}</p>
              {pendingExamConfirmation.country && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{pendingExamConfirmation.country}</p>}
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Is this exactly the examination you are preparing for?</p>
            </div>
            <button type="button" className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700" onClick={() => {
              const ex = pendingExamConfirmation;
              setSelectedExam(ex.name);
              setSelectedExamId(ex.in_database ? (ex.id ?? null) : null);
              setSelectedExamCountry(ex.country || 'Global');
              setSelectedExamFlag(ex.flag || '🌐');
              setSelectedExamCategory(ex.category || 'Professional Licensure');
              setCustomExamInput('');
              setExamSearchQuery(ex.name);
              setPendingExamConfirmation(null);
              setFormError('');
            }}>Yes, this is my exam</button>
            <button type="button" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => {
              setPendingExamConfirmation(null);
              setSelectedExamId(null);
              setSelectedExam('');
              setCustomExamInput('');
              setExamSearchQuery('');
              setFormError('Please paste the exact official exam name or search again.');
            }}>No, enter the exact exam name</button>
          </div>
        </div>
      )}
      {/* Backdrop overlay click */}
      <div onClick={onClose} className="absolute inset-0 bg-transparent cursor-pointer" />

      {/* Centered Responsive Modal Card */}
      <div
        className={`relative w-full max-w-2xl sm:max-w-3xl h-[min(90dvh,700px)] max-h-[90dvh] flex flex-col rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/30 shadow-2xl overflow-hidden z-10 my-auto transition-all duration-300 transform ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* HEADER & PROGRESS BAR */}
        <header className="shrink-0 bg-white/95 dark:bg-[#0E1324]/95 border-b border-slate-200/90 dark:border-gray-800/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && !showVerificationScreen ? (
                <button
                  onClick={handlePrevStep}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 transition-colors cursor-pointer"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <Logo size="sm" />
              )}
            </div>

            {!showVerificationScreen && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-extrabold px-3 py-1 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] border border-[#6D5BFF]/20">
                  Step {step} of 5
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              aria-label="Exit onboarding"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!showVerificationScreen && (
            <div className="max-w-3xl mx-auto mt-3 w-full h-1.5 rounded-full bg-slate-200 dark:bg-gray-800/80 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]"
                initial={{ width: '20%' }}
                animate={{ width: `${(step / 5) * 100}%` }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              />
            </div>
          )}
        </header>

        {/* MAIN FORM STEP CONTENT */}
        <main className="flex-1 min-h-0 overflow-y-auto w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-start">
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center justify-between"
            >
              <span>{formError}</span>
              <button onClick={() => setFormError('')} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showVerificationScreen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 space-y-6 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] p-0.5 shadow-xl">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#0E1324] flex items-center justify-center">
                  <Mail className="w-10 h-10 text-[#00D4FF] animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Global Curriculum Initialized
                </span>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold">Welcome to NeoMCQ</h2>
                <p className="text-sm text-slate-600 dark:text-[#A6ADC8] max-w-md mx-auto">
                  Configured personalized curriculum for <strong className="text-slate-900 dark:text-white">{activeExamName}</strong>.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-left max-w-md mx-auto space-y-2.5 text-xs sm:text-sm shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Curriculum Blueprint: {activeExamName} ({selectedExamCountry})</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-[#A6ADC8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>5-Day Rule Active: {learningPhaseDays} Days Learning + {finalRevisionDays} Days Revision Buffer</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
                <button
                  onClick={handleCompleteAndDashboard}
                  className="w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white text-xs sm:text-sm font-bold shadow-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Launch Personalized Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {/* STEP 1: PERSONAL DETAILS */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                      <User className="w-3.5 h-3.5" /> Personal Details
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      Let&apos;s personalize your AI Coach
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Enter your details to synchronize your learning profile across all devices.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Sarah"
                        className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Connor"
                        className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sarah@university.edu"
                          className={`w-full pl-11 pr-10 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border text-sm shadow-sm focus:outline-none ${
                            emailStatus === 'available'
                              ? 'border-emerald-500 focus:border-emerald-600'
                              : emailStatus === 'registered' || emailStatus === 'invalid'
                              ? 'border-rose-500 focus:border-rose-600'
                              : 'border-slate-300 dark:border-gray-800 focus:border-[#6D5BFF]'
                          }`}
                        />
                        <div className="absolute right-3.5 top-3 flex items-center">
                          {emailStatus === 'checking' && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                          {emailStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {(emailStatus === 'registered' || emailStatus === 'invalid') && (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                      </div>
                      {emailMessage && (
                        <div
                          className={`mt-1 text-xs font-semibold flex items-center gap-1.5 ${
                            emailStatus === 'available'
                              ? 'text-emerald-500'
                              : emailStatus === 'checking'
                              ? 'text-slate-400'
                              : 'text-rose-500'
                          }`}
                        >
                          {emailMessage}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Country Code & Mobile <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2.5 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF] shadow-sm"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>

                        <div className="relative flex-1">
                          <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="555-0199"
                            className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <select
                          value={country}
                          onChange={(e) => handleCountrySelect(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                        >
                          {COUNTRIES.map((cnt) => (
                            <option key={cnt} value={cnt}>
                              {cnt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Preferred Learning Language
                      </label>
                      <div className="relative">
                        <Languages className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: GLOBAL EXAM DISCOVERY & SELECTION */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                      <BookOpen className="w-3.5 h-3.5" /> Worldwide Exam Discovery
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      What exam are you preparing for?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Search the global exam registry or select from top recognized licensing & entrance boards.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Live Search Input */}
                    <div className="relative">
                      <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={examSearchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search exam (e.g. FMGE, NEET PG, USMLE, NCLEX, UPSC, CFA, AWS, PLAB)..."
                        className="w-full pl-11 pr-10 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                      {isSearchingExams && (
                        <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-[#6D5BFF] animate-spin" />
                      )}
                    </div>

                    {/* Active Selected Exam Card */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#6D5BFF]/10 via-[#00D4FF]/10 to-transparent border border-[#6D5BFF]/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedExamFlag}</span>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-[#6D5BFF] dark:text-[#00D4FF]">
                            {selectedExamCategory} • {selectedExamCountry}
                          </div>
                          <div className="text-sm font-heading font-bold text-slate-900 dark:text-white">
                            {activeExamName}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    </div>

                    {/* FUZZY MATCH CONFIRMATION MODAL CARD */}
                    {fuzzyMatchProposal && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#6D5BFF]/15 via-[#00D4FF]/15 to-purple-500/10 border-2 border-[#6D5BFF] shadow-lg space-y-3"
                      >
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-heading font-extrabold text-[#6D5BFF] dark:text-[#00D4FF]">
                          <Sparkles className="w-4 h-4 shrink-0" />
                          <span>Database Examination Match Found</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          Did you mean <span className="text-[#6D5BFF] dark:text-[#00D4FF] underline decoration-[#6D5BFF]/40 font-black">{fuzzyMatchProposal.name}</span>?
                        </p>
                        <div className="text-xs text-slate-600 dark:text-gray-300 flex items-center gap-2">
                          <span>{fuzzyMatchProposal.flag}</span>
                          <span>{fuzzyMatchProposal.category} • {fuzzyMatchProposal.country}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExam(fuzzyMatchProposal.name);
                              setSelectedExamId(fuzzyMatchProposal.id);
                              setSelectedExamCountry(fuzzyMatchProposal.country || 'Global');
                              setSelectedExamFlag(fuzzyMatchProposal.flag || '🌐');
                              setCustomExamInput('');
                              const targetName = fuzzyMatchProposal.name;
                              setFuzzyMatchProposal(null);
                              handleDirectResolve(targetName);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#6D5BFF] hover:bg-[#5C4AE4] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Yes, this is my exam
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFuzzyMatchProposal(null);
                              setCustomExamInput('');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            No, choose another exam
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* EXAM NAME NORMALIZATION CONFIRMATION CARD */}
                    {nameConfirmationProposal && !fuzzyMatchProposal && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#6D5BFF]/15 via-[#00D4FF]/15 to-purple-500/10 border-2 border-[#6D5BFF] shadow-lg space-y-3"
                      >
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-heading font-extrabold text-[#6D5BFF] dark:text-[#00D4FF]">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>Confirm Canonical Examination Name</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600 dark:text-gray-300">
                          <div>You entered: <code className="px-2 py-0.5 rounded bg-slate-200 dark:bg-gray-800 text-slate-900 dark:text-white font-mono font-bold">{nameConfirmationProposal.original}</code></div>
                          <div>System proposes: <strong className="text-sm text-[#6D5BFF] dark:text-[#00D4FF] block mt-1 font-heading">{nameConfirmationProposal.proposed}</strong></div>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-gray-200">
                          Is this the correct examination name?
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const proposed = nameConfirmationProposal.proposed;
                              setSelectedExam(proposed);
                              setCustomExamInput(proposed);
                              setNameConfirmationProposal(null);
                              handleDirectResolve(proposed);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#6D5BFF] hover:bg-[#5C4AE4] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Yes, continue
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNameConfirmationProposal(null);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            No, enter the correct name
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Results / Recommended Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {searchResults.map((ex) => {
                        const isSelected = selectedExam === ex.name && !customExamInput;
                        const flag =
                          ex.flag ||
                          (ex.country === 'India'
                            ? '🇮🇳'
                            : ex.country === 'United States'
                            ? '🇺🇸'
                            : ex.country === 'United Kingdom'
                            ? '🇬🇧'
                            : ex.country === 'Canada'
                            ? '🇨🇦'
                            : ex.country === 'Australia'
                            ? '🇦🇺'
                            : '🌐');

                        return (
                          <button
                            key={ex.id || ex.slug || ex.name}
                            type="button"
                            onClick={() => {
                              // Never silently select an exam: require explicit learner confirmation.
                              setPendingExamConfirmation(ex);
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 ring-2 ring-[#6D5BFF]/30 font-bold'
                                : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-slate-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg shrink-0">{flag}</span>
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                                  {ex.category} • {ex.country}
                                </div>
                                <div className="text-xs font-heading font-bold truncate text-slate-900 dark:text-white">
                                  {ex.name}
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#6D5BFF] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Exam Input */}
                    <div className="pt-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                        Can&apos;t find your exam? Enter custom name:
                      </label>
                      <input
                        type="text"
                        value={customExamInput}
                        onChange={(e) => {
                          setCustomExamInput(e.target.value);
                          if (e.target.value.trim()) {
                            setSelectedExamId(null);
                          }
                        }}
                        placeholder="e.g. FRCR Part 1, MRCOG Part 2, DNB General Surgery..."
                        className="w-full px-4 py-2 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-xs shadow-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: EXAM DATE & TIMELINE */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Calendar className="w-3.5 h-3.5" /> Exam Date & 5-Day Rule
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      When is your target exam date?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      NeoMCQ automatically locks the final 5 days before your exam exclusively for revision and active recall.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Resolved Exam Intelligence Card */}
                    {resolvedExamInfo && (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/70 border border-slate-200 dark:border-gray-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{selectedExamFlag}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-heading font-bold text-slate-900 dark:text-white truncate">
                              {resolvedExamInfo.name || activeExamName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-2">
                              <span>{resolvedExamInfo.subjectCount || 0} Subjects</span>
                              <span>•</span>
                              <span>{resolvedExamInfo.topicCount || 0} Topics</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {resolvedExamInfo.verification_status === 'verified' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Official Syllabus Verified
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> AI Inferred ({resolvedExamInfo.coverage_percentage || 0}% Coverage)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Select Target Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                        <div className="text-2xl font-black text-[#6D5BFF]">{daysLeft}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Days</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                        <div className="text-2xl font-black text-[#00D4FF]">{weeksLeft}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Weeks</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                        <div className="text-2xl font-black text-amber-400">{monthsLeft}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Months</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> 5-Day Lockout Protocol
                      </div>
                      <div className="text-slate-600 dark:text-gray-300">
                        • <strong>{learningPhaseDays} Days</strong> of Active Learning & Topic Completion
                      </div>
                      <div className="text-slate-600 dark:text-gray-300">
                        • <strong>{finalRevisionDays} Days</strong> Final High-Yield Lockout & Mock Exams
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: STUDY PREFERENCES */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Study Habits
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      Customize your daily cadence
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Align your AI Coach reminders and question quotas with your daily schedule.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Daily Study Target (Hours/Day): <span className="text-[#6D5BFF]">{studyHours} hrs</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={studyHours}
                        onChange={(e) => setStudyHours(parseFloat(e.target.value))}
                        className="w-full accent-[#6D5BFF]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>1 Hour</span>
                        <span>4 Hours</span>
                        <span>8 Hours</span>
                        <span>12 Hours</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Peak Study Time
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {(['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setStudyTime(t)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              studyTime === t
                                ? 'bg-[#6D5BFF] text-white border-[#6D5BFF]'
                                : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Learning Pace
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Rapid Learning', 'Balanced Study'] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setLearningStyle(style)}
                            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                              learningStyle === style
                                ? 'bg-[#6D5BFF]/15 border-[#6D5BFF] text-[#6D5BFF] dark:text-[#00D4FF]'
                                : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400'
                            }`}
                          >
                            <div className="text-xs font-bold">{style}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {style === 'Rapid Learning' ? 'High-density MCQs & quick reviews' : 'In-depth notes, flashcards & mastery'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: GOALS & ACCOUNT PASSWORD */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Lock className="w-3.5 h-3.5" /> Secure Password & Goals
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      Finalize your learning account
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Set a password to securely protect your curriculum progress and exam analytics.
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Select Study Goals <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'Pass with High Score',
                          'Improve Weak Areas',
                          'High-Yield Revision',
                          'Master Timed Exam Simulations',
                        ].map((goal) => {
                          const active = studyGoals.includes(goal);
                          return (
                            <button
                              key={goal}
                              type="button"
                              onClick={() => handleGoalToggle(goal)}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                                active
                                  ? 'bg-[#6D5BFF]/15 border-[#6D5BFF] text-[#6D5BFF] dark:text-[#00D4FF]'
                                  : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400'
                              }`}
                            >
                              <span>{goal}</span>
                              {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Account Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full pl-11 pr-11 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* FOOTER ACTIONS */}
        {!showVerificationScreen && (
          <footer className="shrink-0 px-4 sm:px-8 py-3.5 bg-white/95 dark:bg-[#0E1324]/95 border-t border-slate-200/90 dark:border-gray-800/80 backdrop-blur-xl flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={step === 1 || isSubmitting || isResolvingExam}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                step === 1 || isResolvingExam ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isResolvingExam || isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-[#6D5BFF] hover:bg-[#5C4AE4] disabled:opacity-80 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isResolvingExam ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="truncate max-w-[200px]">{resolutionStage}</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white text-xs sm:text-sm font-bold shadow-lg hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isPreparingAI ? 'Initializing Curriculum...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Complete & Launch</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
