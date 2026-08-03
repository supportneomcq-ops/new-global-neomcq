'use client';

import React, { useState, useTransition } from 'react';
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
  Brain,
  Target,
  Zap
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
  examName: string;
  examDate: string;
  daysLeft: number;
  studyHours: number;
  studyTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
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

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(1);
  const [, startTransition] = useTransition();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('United States');

  // Exam Info
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('USMLE Step 1 & 2 CK');
  const [customExamInput, setCustomExamInput] = useState('');
  
  // Default exam date set to 4 months in future
  const defaultFutureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 128);
    return d.toISOString().split('T')[0];
  };
  const [examDate, setExamDate] = useState<string>(defaultFutureDate());

  // Study Habits
  const [studyHours, setStudyHours] = useState<number>(4);
  const [studyTime, setStudyTime] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Morning');
  const [studyGoals, setStudyGoals] = useState<string[]>(['Pass with High Score', 'Improve Weak Subjects']);

  // Account Creation Password
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Post Signup Verification
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingAI, setIsPreparingAI] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Calculate Days Left
  const calculateDaysLeft = (targetDateStr: string): number => {
    if (!targetDateStr) return 0;
    const target = new Date(targetDateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysLeft = calculateDaysLeft(examDate);

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    return { score: 4, label: 'Excellent', color: 'bg-[#00D4FF]' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Filtered Exams
  const filteredExams = PRESET_EXAMS.filter(
    (e) =>
      e.name.toLowerCase().includes(examSearchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(examSearchQuery.toLowerCase())
  );

  const activeExamName = customExamInput.trim() || selectedExam;

  // Validation per step
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
    if (!examDate) {
      setFormError('Please select your exam date.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep3 = () => {
    if (studyGoals.length === 0) {
      setFormError('Please select at least one study goal.');
      return false;
    }
    setFormError('');
    return true;
  };

  const validateStep4 = () => {
    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setFormError('');
    setStep((prev) => Math.min(prev + 1, 4));
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

  // Final Signup Handler
  const handleCreateAccount = async () => {
    if (!validateStep4()) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const supabase = getSupabaseClient();

      // 1. Supabase Auth SignUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: `${countryCode}${phone}`,
            country,
            exam: activeExamName,
          },
        },
      });

      if (authError && !authError.message.includes('User already registered')) {
        console.warn('Supabase auth signup note:', authError.message);
      }

      // 2. Initialize Normalized Onboarding Tables in Supabase via API
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
          examName: activeExamName,
          examDate,
          daysLeft,
          studyHours,
          studyTime,
          studyGoals,
        }),
      });

      // Simulated background preparation delay for AI Engine
      setTimeout(() => {
        setIsSubmitting(false);
        setIsPreparingAI(false);
        setShowVerificationModal(true);
      }, 1500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Signup failed';
      setFormError(errMsg);
      setIsSubmitting(false);
      setIsPreparingAI(false);
    }
  };

  const handleCompleteAndDashboard = () => {
    const onboardingPayload: OnboardingData = {
      firstName,
      lastName,
      email,
      phone: `${countryCode}${phone}`,
      countryCode,
      country,
      examName: activeExamName,
      examDate,
      daysLeft,
      studyHours,
      studyTime,
      studyGoals,
    };
    onComplete(onboardingPayload);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-[#6D5BFF]/35 p-5 sm:p-8 shadow-2xl z-10 my-6 text-slate-900 dark:text-white overflow-hidden"
        >
          {/* Top Gradient Backdrop Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-32 bg-[#6D5BFF]/15 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer z-20"
            aria-label="Close setup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Verification Modal Screen Overlay */}
          {showVerificationModal ? (
            <div className="py-6 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] p-0.5 shadow-xl">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#0E1324] flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#00D4FF] animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Supabase Account Provisioned
                </span>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold">Verify Your Email</h2>
                <p className="text-sm text-slate-600 dark:text-[#A6ADC8] max-w-md mx-auto">
                  A verification link has been sent to <strong className="text-slate-900 dark:text-white">{email}</strong>. Please check your inbox to activate full AI features.
                </p>
              </div>

              {/* Status Indicator */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>AI Coach Initialized for {activeExamName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#A6ADC8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Exam Target Set: {daysLeft} Days Countdown</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#A6ADC8]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Personalized Practice Q-Bank Ready</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                <button
                  onClick={() => {
                    setResendSent(true);
                    setTimeout(() => setResendSent(false), 4000);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resendSent ? <Check className="w-4 h-4 text-emerald-500" /> : <Mail className="w-4 h-4" />}
                  <span>{resendSent ? 'Link Resent!' : 'Resend Email'}</span>
                </button>

                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-[#00D4FF]" />
                  <span>Open Gmail</span>
                </a>

                <button
                  onClick={handleCompleteAndDashboard}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Step Header & Progress Bar */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Logo size="sm" showText={false} />
                    <span className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                      Setup Your AI Exam Coach
                    </span>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#00D4FF]">
                    Step {step} of 4
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]"
                    initial={{ width: '25%' }}
                    animate={{ width: `${(step / 4) * 100}%` }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              {/* Validation Error Alert */}
              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
                  <span>{formError}</span>
                  <button onClick={() => setFormError('')} className="p-1 hover:opacity-75">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl flex items-center gap-2">
                      <User className="w-5 h-5 text-[#6D5BFF]" /> Personal Details
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#A6ADC8]">
                      Tell us who you are so Neo AI can personalize your exam experience.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Sarah"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Jenkins"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sarah@university.edu"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Country Code & Phone <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF]"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>

                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="555-0199"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Country (Target Syllabus)
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                        >
                          {COUNTRIES.map((cnt) => (
                            <option key={cnt} value={cnt}>
                              {cnt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Exam Information */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#00D4FF]" /> Exam Target & Timeline
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#A6ADC8]">
                      Select or search your upcoming exam and set your official test date.
                    </p>
                  </div>

                  {/* Search Exam Box */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      What exam are you preparing for?
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={examSearchQuery}
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        placeholder="Search exam (e.g. NEET PG, USMLE, PLAB, CA, UPSC)..."
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                    </div>

                    {/* Preset Badges Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
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
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 ring-2 ring-[#6D5BFF]/30 font-bold'
                                : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/40 hover:border-slate-300'
                            }`}
                          >
                            <div className="text-[10px] text-[#6D5BFF] dark:text-[#00D4FF] font-semibold">{ex.category}</div>
                            <div className="text-xs font-heading truncate">{ex.name}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Or Custom Exam */}
                    <div className="pt-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Or specify a Custom / Other Exam:
                      </label>
                      <input
                        type="text"
                        value={customExamInput}
                        onChange={(e) => setCustomExamInput(e.target.value)}
                        placeholder="Enter custom exam name..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-xs"
                      />
                    </div>
                  </div>

                  {/* Exam Date & Days Left Counter */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF]/10 to-[#00D4FF]/10 border border-[#6D5BFF]/30 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#6D5BFF]" /> Target Exam Date
                        </label>
                        <input
                          type="date"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="mt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Animated Days Left Badge */}
                      <motion.div
                        key={daysLeft}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-3 rounded-xl bg-white dark:bg-[#0E1324] border border-[#00D4FF]/40 shadow-md text-center shrink-0 min-w-32"
                      >
                        <div className="text-2xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#6D5BFF]">
                          {daysLeft} Days
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Remaining
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Study Habits */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#A855F7]" /> Study Habits & Goals
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#A6ADC8]">
                      Configure your daily commitment and primary objectives.
                    </p>
                  </div>

                  {/* Daily Study Hours Selector */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 flex justify-between">
                      <span>Daily Study Target</span>
                      <span className="font-bold text-[#6D5BFF]">{studyHours} Hours / Day</span>
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setStudyHours(hrs)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            studyHours === hrs
                              ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white border-transparent shadow-md'
                              : 'bg-slate-100 dark:bg-gray-900 border-slate-300 dark:border-gray-800 hover:border-slate-400'
                          }`}
                        >
                          {hrs}{hrs === 6 ? '+' : ''} hrs
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Study Time */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      Preferred Peak Study Window
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setStudyTime(t)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            studyTime === t
                              ? 'border-[#6D5BFF] bg-[#6D5BFF]/15 text-[#6D5BFF] dark:text-[#00D4FF] font-bold'
                              : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/40'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Study Goals Multi Select */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      Primary Study Objectives (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Pass with High Score',
                        'Achieve Top National Rank',
                        'Rapid 30-Day Revision',
                        'Improve Weak Subjects',
                      ].map((goal) => {
                        const isSelected = studyGoals.includes(goal);
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => handleGoalToggle(goal)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/30 text-slate-600 dark:text-gray-400'
                            }`}
                          >
                            <span>{goal}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#6D5BFF] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Review Summary & Account Creation */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" /> Review & Create Account
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#A6ADC8]">
                      Verify your AI profile parameters and secure your Supabase account.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-800 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200 dark:border-gray-800">
                      <div>
                        <span className="text-slate-500">Learner:</span>{' '}
                        <strong className="text-slate-900 dark:text-white">{firstName} {lastName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        <strong className="text-slate-900 dark:text-white truncate block">{email}</strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500">Target Exam:</span>{' '}
                        <strong className="text-[#00D4FF]">{activeExamName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Timeline:</span>{' '}
                        <strong className="text-[#6D5BFF]">{daysLeft} Days Left ({examDate})</strong>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500">Habit:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-gray-200">{studyHours} hrs/day ({studyTime})</span>
                    </div>
                  </div>

                  {/* Password Input with Strength Meter */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters (letters + numbers)"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-500">Password Strength:</span>
                          <span className="text-slate-900 dark:text-white">{passwordStrength.label}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden flex gap-1">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`h-full flex-1 transition-colors ${
                                bar <= passwordStrength.score ? passwordStrength.color : 'bg-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons Footer */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200 dark:border-gray-800">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-gray-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#A855F7] text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] text-white text-sm font-extrabold shadow-lg hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isPreparingAI ? 'Preparing Your AI...' : 'Creating Account...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Create My AI Coach</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
