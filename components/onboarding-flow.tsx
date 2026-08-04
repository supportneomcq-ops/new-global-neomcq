'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  Target,
  Languages
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from './logo';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userData: OnboardingData) => void;
}

export interface OnboardingData {
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

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(1);

  // 1. Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('United States');
  const [language, setLanguage] = useState('English (US/UK)');

  // 2. Exam
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('USMLE Step 1 & 2 CK');
  const [customExamInput, setCustomExamInput] = useState('');

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
  const [studyGoals, setStudyGoals] = useState<string[]>(['Pass with High Score', 'Improve Weak Areas']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingAI, setIsPreparingAI] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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

  const filteredExams = PRESET_EXAMS.filter(
    (e) =>
      e.name.toLowerCase().includes(examSearchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(examSearchQuery.toLowerCase())
  );

  // Step Validations
  const validateStep1 = () => {
    if (!firstName.trim()) {
      setFormError('Please enter your first name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
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
    if (!activeExamName) {
      setFormError('Please select or specify your exam name.');
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

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
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

  // Final Account Creation
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
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authId: authData?.user?.id || null,
          firstName,
          lastName,
          email,
          phone: `${countryCode}${phone}`,
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
        }),
      });

      setTimeout(() => {
        setIsSubmitting(false);
        setIsPreparingAI(false);
        setShowVerificationScreen(true);
      }, 1000);
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
      {/* Backdrop overlay click */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-transparent cursor-pointer"
      />

      {/* Centered Responsive Modal Card */}
      <div
        className={`relative w-full max-w-2xl sm:max-w-3xl h-[min(88dvh,660px)] max-h-[88dvh] flex flex-col rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/30 shadow-2xl overflow-hidden z-10 my-auto transition-all duration-300 transform ${
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

          {/* MAIN FORM STEP CONTENT - SCROLLABLE INSIDE CARD */}
          <main className="flex-1 min-h-0 overflow-y-auto w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-start">
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center justify-between"
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
                  Supabase Backend Profile Active
                </span>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold">Verify Your Email</h2>
                <p className="text-sm text-slate-600 dark:text-[#A6ADC8] max-w-md mx-auto">
                  We sent a confirmation link to <strong className="text-slate-900 dark:text-white">{email}</strong>.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-left max-w-md mx-auto space-y-2.5 text-xs sm:text-sm shadow-sm">
                <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AI Learning Engine Configured for {activeExamName}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600 dark:text-[#A6ADC8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>5-Day Rule Syllabus Lock: {learningPhaseDays} Days Learning + {finalRevisionDays} Days Lockout Revision</span>
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
                  className="space-y-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                      <User className="w-3.5 h-3.5" /> Personal Details
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      Let&apos;s personalize your AI Coach
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Enter your details to synchronize your learning profile across all devices.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Sarah"
                        className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Connor"
                        className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sarah@university.edu"
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Country Code & Mobile <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2.5 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF] shadow-sm"
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
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="555-0199"
                            className="w-full pl-10 pr-3 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Country
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
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
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Preferred Learning Language
                      </label>
                      <div className="relative">
                        <Languages className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
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
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                      <BookOpen className="w-3.5 h-3.5" /> Exam Selection
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      What exam are you preparing for?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Select from 180+ global exam blueprints or specify your custom curriculum.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={examSearchQuery}
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        placeholder="Search exam (e.g. USMLE, NEET, PLAB, NCLEX, CA, GRE)..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {filteredExams.map((ex) => {
                        const isSelected = selectedExam === ex.name && !customExamInput;
                        return (
                          <button
                            key={ex.name}
                            type="button"
                            onClick={() => {
                              setSelectedExam(ex.name);
                              setCustomExamInput('');
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 ring-2 ring-[#6D5BFF]/30 font-bold'
                                : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-slate-300'
                            }`}
                          >
                            <div className="text-[10px] text-[#6D5BFF] dark:text-[#00D4FF] font-semibold">{ex.category}</div>
                            <div className="text-xs font-heading font-bold truncate mt-0.5">{ex.name}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Not in the list? Custom Exam Entry:
                      </label>
                      <input
                        type="text"
                        value={customExamInput}
                        onChange={(e) => setCustomExamInput(e.target.value)}
                        placeholder="Type custom exam name..."
                        className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-xs shadow-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: EXAM DATE & 5-DAY RULE CALCULATION */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                      <Calendar className="w-3.5 h-3.5" /> Exam Date
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      When is your official exam day?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Neo AI enforces the <strong className="text-[#00D4FF]">5-Day Lockout Rule</strong>: complete the full syllabus before the final 5 days.
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-4 shadow-sm">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                        Select Exam Date
                      </label>
                      <input
                        type="date"
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 text-sm font-bold shadow-sm"
                      />
                    </div>

                    {/* Instant Time Calculations */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-[#6D5BFF]/10 border border-[#6D5BFF]/30">
                        <div className="text-xl sm:text-2xl font-black text-[#6D5BFF]">{daysLeft}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Days Left</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/30">
                        <div className="text-xl sm:text-2xl font-black text-[#00D4FF]">{weeksLeft}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Weeks Left</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/30">
                        <div className="text-xl sm:text-2xl font-black text-[#A855F7]">{monthsLeft}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Months Left</div>
                      </div>
                    </div>

                    {/* 5-Day Rule Breakdown */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Syllabus Allocation (5-Day Rule Applied)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-gray-300 pt-1">
                        <span>Phase 1: Full Syllabus & Q-Bank</span>
                        <strong className="text-[#00D4FF]">Days 1 – {learningPhaseDays}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-gray-300">
                        <span>Phase 2: Final 5-Day Revision Only</span>
                        <strong className="text-[#A855F7]">Days {learningPhaseDays + 1} – {daysLeft}</strong>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: LEARNING STYLE & STUDY HOURS */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Zap className="w-3.5 h-3.5" /> Learning Style & Hours
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      How would you like to prepare?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Configure your preferred learning style and daily study window.
                    </p>
                  </div>

                  {/* Option A vs Option B Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLearningStyle('Rapid Learning')}
                      className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
                        learningStyle === 'Rapid Learning'
                          ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 ring-2 ring-[#6D5BFF]/30 font-bold'
                          : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[#6D5BFF] font-heading font-extrabold text-sm">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Rapid Learning</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 leading-relaxed">
                        Fast-paced preparation focused on completing the syllabus quickly with high-yield focus.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLearningStyle('Balanced Study')}
                      className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
                        learningStyle === 'Balanced Study'
                          ? 'border-[#00D4FF] bg-[#00D4FF]/15 ring-2 ring-[#00D4FF]/30 font-bold'
                          : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[#00D4FF] font-heading font-extrabold text-sm">
                        <Clock className="w-4 h-4 text-[#00D4FF]" />
                        <span>Balanced Study</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 leading-relaxed">
                        Steady learning with balanced revision, spaced repetition, and deep concept practice.
                      </p>
                    </button>
                  </div>

                  {/* Study Hours Slider (1 to 12) */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-gray-300">Daily Study Target</span>
                      <span className="text-sm font-extrabold text-[#00D4FF]">{studyHours} Hours / Day</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={studyHours}
                      onChange={(e) => setStudyHours(Number(e.target.value))}
                      className="w-full accent-[#6D5BFF] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>1 hr (Light)</span>
                      <span>6 hrs (Standard)</span>
                      <span>12 hrs (Full-time)</span>
                    </div>
                  </div>

                  {/* Peak Time */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                      Preferred Study Time Window
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setStudyTime(t)}
                          className={`p-2.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                            studyTime === t
                              ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#00D4FF] font-extrabold shadow-sm'
                              : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/40'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: GOAL & PASSWORD CREATION */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-500 border border-amber-400/20">
                      <Target className="w-3.5 h-3.5" /> Goals & Account
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight">
                      Final Step: Set Password & Goals
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A6ADC8]">
                      Secure your Supabase profile and choose your primary preparation target.
                    </p>
                  </div>

                  {/* Primary Target Goal */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                      Target Goal
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        'Pass Exam',
                        'High Score',
                        'Top Rank',
                        'Revision Only',
                        'Improve Weak Areas',
                      ].map((goal) => {
                        const isSelected = studyGoals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => handleGoalToggle(goal)}
                            className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 text-slate-900 dark:text-white shadow-sm'
                                : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 text-slate-600 dark:text-gray-400'
                            }`}
                          >
                            <span>{goal}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#6D5BFF] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Password Creation */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters..."
                        className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* BOTTOM STEP NAVIGATION */}
        {!showVerificationScreen && (
          <footer className="shrink-0 bg-white dark:bg-[#0E1324] border-t border-slate-200/90 dark:border-gray-800/80 px-4 sm:px-8 py-3.5 z-20">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-gray-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#6D5BFF]/30 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white text-xs sm:text-sm font-extrabold shadow-xl shadow-[#6D5BFF]/35 hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isPreparingAI ? 'Generating Study Plan...' : 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Study Plan</span>
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
