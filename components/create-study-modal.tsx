'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Globe,
  BookOpen,
  Search,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  Zap,
} from 'lucide-react';
import { useSelection } from '@/lib/context/selection-context';

interface CreateStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated?: (exam: any) => void;
}

const SUPPORTED_COUNTRIES = [
  { name: 'India', flag: '🇮🇳' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Other / Any Country', flag: '🌍' },
];

export function CreateStudyModal({ isOpen, onClose, onExamCreated }: CreateStudyModalProps) {
  const { setExam, refreshHierarchy } = useSelection();

  const [step, setStep] = useState<'input' | 'discovering' | 'curriculum'>('input');
  const [countryName, setCountryName] = useState('India');
  const [customCountry, setCustomCountry] = useState('');
  const [examName, setExamName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // AI Discovery Progress Messages
  const [discoveryStatus, setDiscoveryStatus] = useState('Researching government & regulatory bodies...');
  const [discoveredExam, setDiscoveredExam] = useState<any>(null);

  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalExamName = examName.trim();
    const finalCountry = countryName === 'Other / Any Country' ? customCountry.trim() : countryName;

    if (!finalExamName) {
      setErrorMsg('Please enter an examination name.');
      return;
    }
    if (countryName === 'Other / Any Country' && !finalCountry) {
      setErrorMsg('Please enter the country name.');
      return;
    }

    setErrorMsg('');
    setStep('discovering');

    // Simulate progressive status updates during AI synthesis
    const statusSteps = [
      'Researching government & regulatory examination boards...',
      'Verifying official syllabus & conducting authority...',
      'Normalizing subjects & high-yield topic blueprints...',
      'Building canonical study profile & syllabus tree...',
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < statusSteps.length) {
        setDiscoveryStatus(statusSteps[currentStepIdx]);
      }
    }, 1200);

    try {
      const res = await fetch('/api/exams/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_name: finalExamName,
          country_name: finalCountry,
        }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (data.success && data.exam) {
        setDiscoveredExam(data.exam);
        setStep('curriculum');
      } else {
        setErrorMsg(data.error || 'AI Discovery failed. Please try again.');
        setStep('input');
      }
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err.message || 'Connection error during AI discovery.');
      setStep('input');
    }
  };

  const handleLaunchStudyHub = async () => {
    if (!discoveredExam) return;

    try {
      await refreshHierarchy();
      setExam({
        id: discoveredExam.id,
        name: discoveredExam.name,
        slug: discoveredExam.slug,
      });

      if (onExamCreated) {
        onExamCreated(discoveredExam);
      }
      onClose();
    } catch (err) {
      console.error('Error launching study hub:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] border border-[#6D5BFF]/20">
              <Sparkles className="w-3.5 h-3.5" /> Global AI Exam Discovery System
            </div>
            <h2 className="text-2xl font-heading font-extrabold tracking-tight">
              Create / Discover Any Exam
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Enter any examination from ANY country. Neo AI will research official sources, extract the canonical syllabus, and generate your custom study hub.
            </p>
          </div>

          {/* STEP 1: INPUT FORM */}
          {step === 'input' && (
            <form onSubmit={handleStartDiscovery} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Country Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#6D5BFF]" /> Select Country
                </label>
                <select
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name} className="bg-white dark:bg-[#0E1324]">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>

                {countryName === 'Other / Any Country' && (
                  <input
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="Enter Country Name (e.g. Uganda, Nigeria, Colombia, Kenya...)"
                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm focus:outline-none focus:border-[#6D5BFF]"
                  />
                )}
              </div>

              {/* Exam Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#6D5BFF]" /> Examination Name
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. Uganda Advanced Certificate of Education, PLAB 1, USMLE Step 1..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-sm focus:outline-none focus:border-[#6D5BFF]"
                />
                <p className="text-[11px] text-slate-400">
                  Tip: You can enter acronyms or full names. AI will normalize and match official regulatory standards.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#00D4FF] hover:opacity-95 text-white font-heading font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Discovery & Build Study Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: DISCOVERY ANIMATION */}
          {step === 'discovering' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#6D5BFF] to-[#00D4FF] animate-pulse flex items-center justify-center text-white shadow-2xl">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="font-heading font-extrabold text-lg text-slate-900 dark:text-white">
                  Discovering "{examName}"
                </h3>
                <p className="text-xs font-bold text-[#6D5BFF] dark:text-[#00D4FF] animate-pulse">
                  {discoveryStatus}
                </p>
                <p className="text-[11px] text-slate-400">
                  AI is querying official government boards to structure your canonical subjects and high-yield topic syllabus.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: CURRICULUM PREVIEW */}
          {step === 'curriculum' && discoveredExam && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Exam Canonical Profile Created
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    Confidence: {Math.round((discoveredExam.confidence_score || 0.95) * 100)}%
                  </span>
                </div>
                <h3 className="text-lg font-heading font-black text-slate-900 dark:text-white">
                  {discoveredExam.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-300">
                  {discoveredExam.description}
                </p>
                {discoveredExam.authority_name && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-gray-400">
                    <Building2 className="w-3.5 h-3.5 text-[#6D5BFF]" />
                    <span>Authority: {discoveredExam.authority_name}</span>
                  </div>
                )}
              </div>

              {/* Subjects & Topics Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#6D5BFF]" /> Canonical Syllabus ({discoveredExam.subjects?.length || 0} Subjects)
                </h4>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {discoveredExam.subjects?.map((subj: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-1.5"
                    >
                      <h5 className="text-xs font-heading font-extrabold text-slate-900 dark:text-white">
                        {subj.name}
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {subj.exam_topics?.map((top: any, tidx: number) => (
                          <span
                            key={tidx}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 text-[10px] font-bold text-slate-600 dark:text-gray-300"
                          >
                            {top.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Button */}
              <button
                type="button"
                onClick={handleLaunchStudyHub}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#00D4FF] hover:opacity-95 text-white font-heading font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Launch My Custom Study Hub</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
