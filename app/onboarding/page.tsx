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
  Edit2
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import { AIExamGeneratorModal } from '@/components/ai-exam-generator-modal';
import Link from 'next/link';

interface OnboardingState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  language: string;
  examSearchQuery: string;
  selectedExam: string;
  customExamInput: string;
  examDate: string;
  learningStyle: 'Rapid Learning' | 'Balanced Study';
  studyHours: number;
  studyTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Flexible';
  studyGoals: string[];
  password: string;
}

const STORAGE_KEY = 'neomcq_onboarding_state';
const CURRENT_STEP_KEY = 'neomcq_onboarding_step';

const PRESET_EXAMS = [
  { name: 'USMLE Step 1 & 2 CK', category: 'Medical USA', code: 'USMLE' },
  { name: 'NEET PG / INI-CET', category: 'Medical India', code: 'NEETPG' },
  { name: 'PLAB 1 / UKMLA', category: 'Medical UK', code: 'PLAB' },
  { name: 'NCLEX-RN Nursing', category: 'Nursing USA/CA', code: 'NCLEX' },
  { name: 'FMGE Medical Licensing', category: 'Medical India', code: 'FMGE' },
  { name: 'AMC MCQ Exam', category: 'Medical Australia', code: 'AMC' },
  { name: 'UPSC Civil Services', category: 'Civil Services India', code: 'UPSC' },
  { name: 'CA Final / Inter', category: 'Accounting India', code: 'CA' },
  { name: 'CFA Level I / II / III', category: 'Finance Global', code: 'CFA' },
  { name: 'SAT / ACT College Entrance', category: 'Global High School', code: 'SAT' },
  { name: 'GRE General Test', category: 'Graduate Entrance', code: 'GRE' },
  { name: 'GMAT Focus Edition', category: 'MBA Entrance', code: 'GMAT' },
  { name: 'IELTS Academic', category: 'Language Global', code: 'IELTS' },
  { name: 'TOEFL iBT', category: 'Language Global', code: 'TOEFL' },
];

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
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
  'United States',
  'India',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingAI, setIsPreparingAI] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Core Form State
  const [formData, setFormData] = useState<OnboardingState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: '+1',
    country: 'United States',
    language: 'English (US/UK)',
    examSearchQuery: '',
    selectedExam: 'USMLE Step 1 & 2 CK',
    customExamInput: '',
    examDate: '',
    learningStyle: 'Balanced Study',
    studyHours: 4,
    studyTime: 'Morning',
    studyGoals: ['Pass Exam', 'High Score'],
    password: '',
  });

  // Refs for focusing elements on validation error
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const customExamRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // Set default date on mount if not loaded from cache
  useEffect(() => {
    const timer = setTimeout(() => {
      const d = new Date();
      d.setDate(d.getDate() + 100);
      const defaultDate = d.toISOString().split('T')[0];

      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        const savedStep = localStorage.getItem(CURRENT_STEP_KEY);
        
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            // Guarantee valid default date if cached is missing
            examDate: parsed.examDate || defaultDate,
          }));
        } else {
          setFormData((prev) => ({ ...prev, examDate: defaultDate }));
        }

        if (savedStep) {
          const stepNum = parseInt(savedStep, 10);
          if (stepNum >= 1 && stepNum <= 7) {
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
    if (!targetDateStr) return { days: 0, weeks: 0, months: 0 };
    const target = new Date(targetDateStr).getTime();
    const now = new Date().getTime();
    const diffMs = target - now;
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 3600 * 24)));
    const weeks = Math.max(0, Number((days / 7).toFixed(1)));
    const months = Math.max(0, Number((days / 30.4).toFixed(1)));
    return { days, weeks, months };
  };

  const { days: daysLeft, weeks: weeksLeft, months: monthsLeft } = calculateTimeLeft(formData.examDate);

  // 5-Day Rule calculations
  const learningPhaseDays = Math.max(0, daysLeft - 5);

  const activeExamName = formData.customExamInput.trim() || formData.selectedExam;

  const filteredExams = PRESET_EXAMS.filter(
    (e) =>
      e.name.toLowerCase().includes(formData.examSearchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(formData.examSearchQuery.toLowerCase())
  );

  // Form validations per step
  const validateStep = (currentStep: number): boolean => {
    setFormError('');
    if (currentStep === 1) {
      if (!formData.firstName.trim()) {
        setFormError('Please enter your first name.');
        setTimeout(() => firstNameRef.current?.focus(), 100);
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setFormError('Please enter a valid email address.');
        setTimeout(() => emailRef.current?.focus(), 100);
        return false;
      }
      if (!formData.password || formData.password.length < 8) {
        setFormError('Please create a secure password of at least 8 characters.');
        setTimeout(() => passwordRef.current?.focus(), 100);
        return false;
      }
      if (!formData.phone.trim()) {
        setFormError('Please enter your mobile phone number for high-priority study reminders.');
        setTimeout(() => phoneRef.current?.focus(), 100);
        return false;
      }
    } else if (currentStep === 2) {
      if (!activeExamName.trim()) {
        setFormError('Please select or write the official exam you are preparing for.');
        setTimeout(() => customExamRef.current?.focus(), 100);
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.examDate || daysLeft <= 0) {
        setFormError('Please choose a valid future official exam date.');
        setTimeout(() => dateRef.current?.focus(), 100);
        return false;
      }
    } else if (currentStep === 7) {
      // Review step re-validates step 1 credentials
      if (!formData.firstName.trim() || !formData.email.trim() || !formData.password || formData.password.length < 8) {
        setFormError('Credentials contain errors. Please edit personal details.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 7) {
        setStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleCompleteSignUp();
      }
    }
  };

  const handlePrev = () => {
    setFormError('');
    if (step > 1) {
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

  // Create account and trigger study plan generation
  const handleCompleteSignUp = async () => {
    if (!validateStep(7)) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const supabase = getSupabaseClient();

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
            exam: activeExamName,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      setIsPreparingAI(true);

      // 2. Map preferred time to DB Check constraint values ('morning', 'afternoon', 'evening', 'night')
      let dbPreferredTime: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
      const uiTimeLower = formData.studyTime.toLowerCase();
      if (['morning', 'afternoon', 'evening', 'night'].includes(uiTimeLower)) {
        dbPreferredTime = uiTimeLower as any;
      } else {
        dbPreferredTime = 'morning'; // Map 'flexible' -> 'morning' to pass database check constraints
      }

      // 3. Sync all data server-side via the secure onboarding API
      const response = await fetch('/api/onboarding', {
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
          examName: activeExamName,
          examDate: formData.examDate,
          daysLeft,
          learningStyle: formData.learningStyle === 'Rapid Learning' ? 'rapid' : 'balanced',
          studyHours: formData.studyHours,
          studyTime: dbPreferredTime,
          studyGoals: formData.studyGoals,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Server-side onboarding synchronisation failed');
      }

      // 4. Remove cached progress
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CURRENT_STEP_KEY);
      } catch {
        // Safe to ignore
      }

      setIsSubmitting(false);
      setIsPreparingAI(false);

      // 5. Navigate to verification screen
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Onboarding submission failed';
      setFormError(errMsg);
      setIsSubmitting(false);
      setIsPreparingAI(false);
    }
  };

  // Support Keyboard Navigation using Ref Pointers
  const nextRef = useRef(handleNext);
  const prevRef = useRef(handlePrev);
  useEffect(() => {
    nextRef.current = handleNext;
    prevRef.current = handlePrev;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Prevent default submit behaviors inside inputs
        e.preventDefault();
        nextRef.current();
      } else if (e.key === 'ArrowRight' && e.altKey) {
        nextRef.current();
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        prevRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
              Step {step} of 7
            </span>
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
              {Math.round((step / 7) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* Dynamic elegant progress bar */}
        <div className="w-full h-1 bg-slate-100 dark:bg-gray-900">
          <motion.div
            className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]"
            initial={{ width: '14.2%' }}
            animate={{ width: `${(step / 7) * 100}%` }}
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
            
            {/* STEP 1: PERSONAL DETAILS & CREDS */}
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
                    <User className="w-3.5 h-3.5" /> Personal Details
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Let&apos;s personalize your NeoMCQ AI Coach
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Create your profile to securely access your study program and synchronized curriculum.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={firstNameRef}
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
                        ref={emailRef}
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
                        ref={passwordRef}
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
                        onChange={(e) => updateField('countryCode', e.target.value)}
                        className="px-2.5 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          ref={phoneRef}
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="555-0199"
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
                        onChange={(e) => updateField('country', e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm text-slate-900 dark:text-white cursor-pointer"
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

            {/* STEP 2: EXAM SELECTION */}
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
                    <BookOpen className="w-3.5 h-3.5" /> Exam Selection
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    What exam are you preparing for?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    We support over 180+ global professional credentials. Select yours or define a custom target.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.examSearchQuery}
                      onChange={(e) => updateField('examSearchQuery', e.target.value)}
                      placeholder="Search credentials (e.g., USMLE, NEET, NCLEX, PLAB)..."
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredExams.map((ex) => {
                      const isSelected = formData.selectedExam === ex.name && !formData.customExamInput;
                      return (
                        <button
                          key={ex.name}
                          type="button"
                          onClick={() => {
                            updateField('selectedExam', ex.name);
                            updateField('customExamInput', '');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 ring-1 ring-[#6D5BFF] font-bold text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/40 text-slate-600 dark:text-gray-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[10px] text-[#6D5BFF] dark:text-[#00D4FF] font-extrabold">{ex.category}</div>
                          <div className="text-xs font-heading font-bold truncate mt-0.5">{ex.name}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-gray-800/80 space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Can&apos;t find your exam? Type Custom Name or launch AI Engine:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        ref={customExamRef}
                        type="text"
                        value={formData.customExamInput}
                        onChange={(e) => updateField('customExamInput', e.target.value)}
                        placeholder="e.g. European Board of Ophthalmology (EBO)"
                        className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-inner text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setIsAIModalOpen(true)}
                        className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white text-xs font-heading font-extrabold shadow-md hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>AI Engine Search</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: EXAM DATE & 5-DAY RULE */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                    <Calendar className="w-3.5 h-3.5" /> Exam Date
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    When is your official exam day?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Neo AI allocates study milestones using the <strong className="text-[#00D4FF]">5-Day Lockout Rule</strong>.
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-50/50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 space-y-4 shadow-sm pt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Select official date
                    </label>
                    <input
                      ref={dateRef}
                      type="date"
                      value={formData.examDate}
                      onChange={(e) => updateField('examDate', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm font-bold shadow-sm text-slate-900 dark:text-white cursor-pointer"
                    />
                  </div>

                  {/* Immediate Date Calculations */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-2xl bg-[#6D5BFF]/5 border border-[#6D5BFF]/25">
                      <div className="text-xl sm:text-2xl font-black text-[#6D5BFF] dark:text-[#8877FF]">{daysLeft}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Days Left</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#00D4FF]/5 border border-[#00D4FF]/25">
                      <div className="text-xl sm:text-2xl font-black text-[#00D4FF]">{weeksLeft}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Weeks Left</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#A855F7]/5 border border-[#A855F7]/25">
                      <div className="text-xl sm:text-2xl font-black text-[#A855F7]">{monthsLeft}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Months Left</div>
                    </div>
                  </div>

                  {/* 5-Day Rule visual breakdown */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800/80 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Syllabus Spacing Schedule</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-gray-300 pt-1">
                      <span>Phase 1: Full Syllabus Mastery & Practice</span>
                      <strong className="text-[#00D4FF]">Days 1 – {learningPhaseDays}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-gray-300">
                      <span>Phase 2: Final 5-Day Diagnostic Lockout</span>
                      <strong className="text-[#A855F7]">Days {learningPhaseDays + 1} – {daysLeft}</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: LEARNING STYLE */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Zap className="w-3.5 h-3.5" /> Study Methodology
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    How would you like to prepare?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Customize your study plan parameters. You can change this at any time.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => updateField('learningStyle', 'Rapid Learning')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between h-48 ${
                      formData.learningStyle === 'Rapid Learning'
                        ? 'border-[#6D5BFF] bg-[#6D5BFF]/5 ring-1 ring-[#6D5BFF]'
                        : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[#6D5BFF] font-heading font-extrabold text-sm">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Rapid Learning Mode</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-300 leading-relaxed mt-2 flex-1">
                      Ideal for candidates with upcoming test dates. Focuses heavily on high-yield, high-frequency core components and accelerated testing.
                    </p>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-2">Accelerated Track</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('learningStyle', 'Balanced Study')}
                    className={`p-5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between h-48 ${
                      formData.learningStyle === 'Balanced Study'
                        ? 'border-[#00D4FF] bg-[#00D4FF]/5 ring-1 ring-[#00D4FF]'
                        : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[#00D4FF] font-heading font-extrabold text-sm">
                      <Clock className="w-4 h-4 text-[#00D4FF] shrink-0" />
                      <span>Balanced Study Mode</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-300 leading-relaxed mt-2 flex-1">
                      Spaced repetition algorithm. Balanced focus on concept recall, comprehensive curriculum coverage, and continuous self-testing.
                    </p>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mt-2">Standard Track</div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: DAILY STUDY HOURS */}
            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" /> Study Commitment
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    How many hours can you dedicate daily?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Determine your daily window. We use this to balance mock diagnostic exams.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-800 space-y-4 pt-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-gray-400 uppercase tracking-wider">Commitment Level</span>
                    <span className="text-base font-extrabold text-[#6D5BFF] dark:text-[#00D4FF]">
                      {formData.studyHours} {formData.studyHours === 1 ? 'Hour' : 'Hours'} / Day
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={formData.studyHours}
                    onChange={(e) => updateField('studyHours', Number(e.target.value))}
                    className="w-full accent-[#6D5BFF] h-2 bg-slate-200 dark:bg-gray-800 rounded-lg cursor-pointer appearance-none"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>1 hr (Light)</span>
                    <span>6 hrs (Standard)</span>
                    <span>12 hrs (Full-time)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800/80 text-xs text-slate-500 dark:text-gray-300 leading-relaxed">
                    🎓 Based on your selected exam, dedicating <strong className="text-[#00D4FF]">{formData.studyHours} hours</strong> per day will provide adequate space to exhaustively cover your exam subject categories prior to review lockout.
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: PREFERRED STUDY TIME */}
            {step === 6 && (
              <motion.div
                key="step-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                    <Clock className="w-3.5 h-3.5" /> Study Windows
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    What is your peak study window?
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Select the period when you are most focused. Reminder notifications will align with this.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {([
                    { name: 'Morning', label: '06:00 – 12:00' },
                    { name: 'Afternoon', label: '12:00 – 17:00' },
                    { name: 'Evening', label: '17:00 – 21:00' },
                    { name: 'Night', label: '21:00 – 02:00' },
                    { name: 'Flexible', label: 'Varied hours' },
                  ] as const).map((t) => {
                    const isSelected = formData.studyTime === t.name;
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => updateField('studyTime', t.name)}
                        className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                          isSelected
                            ? 'border-[#6D5BFF] bg-[#6D5BFF]/5 ring-1 ring-[#6D5BFF]'
                            : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/30'
                        }`}
                      >
                        <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[#6D5BFF] dark:text-[#00D4FF]' : 'text-slate-700 dark:text-gray-200'}`}>
                          {t.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 7: REVIEW & GOALS */}
            {step === 7 && (
              <motion.div
                key="step-7"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                    <Target className="w-3.5 h-3.5" /> Confirm Study Plan
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
                    Review and Deploy Your Curriculum
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    Confirm your personalized learning parameters and register your premium account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Personal summary info card */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#050816]/40 border border-slate-200 dark:border-gray-800/80 space-y-2 text-xs relative">
                    <button
                      onClick={() => setStep(1)}
                      className="absolute right-3 top-3 p-1 rounded-lg bg-white dark:bg-gray-900 hover:opacity-80 transition-opacity border border-slate-100 dark:border-gray-800"
                      title="Edit Personal Info"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#6D5BFF]" />
                    </button>
                    <div className="font-bold text-slate-800 dark:text-gray-200 text-[10px] uppercase tracking-wider text-[#6D5BFF]">
                      1. Profile & Sync Details
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Name:</strong> {formData.firstName} {formData.lastName}
                    </div>
                    <div className="truncate">
                      <strong className="text-slate-400 font-semibold">Email:</strong> {formData.email}
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Phone:</strong> {formData.countryCode} {formData.phone}
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Region:</strong> {formData.country} ({formData.language})
                    </div>
                  </div>

                  {/* Exam plan summary card */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#050816]/40 border border-slate-200 dark:border-gray-800/80 space-y-2 text-xs relative">
                    <button
                      onClick={() => setStep(2)}
                      className="absolute right-3 top-3 p-1 rounded-lg bg-white dark:bg-gray-900 hover:opacity-80 transition-opacity border border-slate-100 dark:border-gray-800"
                      title="Edit Exam"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#6D5BFF]" />
                    </button>
                    <div className="font-bold text-slate-800 dark:text-gray-200 text-[10px] uppercase tracking-wider text-[#00D4FF]">
                      2. Exam Curriculum Target
                    </div>
                    <div className="font-bold truncate text-slate-800 dark:text-white">
                      {activeExamName}
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Test Date:</strong> {formData.examDate} ({daysLeft} Days)
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Track:</strong> {formData.learningStyle} ({formData.studyHours}h/day)
                    </div>
                    <div>
                      <strong className="text-slate-400 font-semibold">Peak Window:</strong> {formData.studyTime}
                    </div>
                  </div>

                  {/* Goal targets selector */}
                  <div className="sm:col-span-2 space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                      Specify Primary Preparation Goals:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Pass Exam', 'High Score', 'Top Rank', 'Revision Only', 'Weak Areas'].map((g) => {
                        const isSelected = formData.studyGoals.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleGoalToggle(g)}
                            className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/30 text-slate-400'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Bottom Step Navigation Area */}
          <footer className="mt-6 pt-5 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-gray-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-gray-900 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-slate-700 dark:text-gray-200"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#6D5BFF]/15 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteSignUp}
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white text-xs sm:text-sm font-extrabold shadow-xl shadow-[#6D5BFF]/25 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer ml-auto disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isPreparingAI ? 'Generating Study Plan...' : 'Deploying Profiles...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Deploy AI Study Plan & Create Account</span>
                  </>
                )}
              </button>
            )}
          </footer>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-slate-200/50 dark:border-gray-900/60 z-10 bg-white/20 dark:bg-transparent backdrop-blur-sm mt-8">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} NeoMCQ.com. Secured by Supabase Authed RLS engines.
        </p>
      </footer>

      {/* Global AI Exam Engine Resolution Modal */}
      <AIExamGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialQuery={formData.customExamInput || formData.examSearchQuery}
        onExamSelected={(exam) => {
          updateField('selectedExam', exam.name);
          updateField('customExamInput', '');
          setIsAIModalOpen(false);
        }}
      />
    </div>
  );
}
