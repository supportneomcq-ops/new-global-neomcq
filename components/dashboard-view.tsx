'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Target,
  Clock,
  Zap,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Send,
  User,
  LogOut,
  Flame,
  HelpCircle,
  Database,
  Layers,
  ChevronDown
} from 'lucide-react';
import { OnboardingData } from './onboarding-flow';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { LearningContentEngine } from './learning-content-engine';
import { UserProfileModal } from './user-profile-modal';
import { useSelection } from '@/lib/context/selection-context';

interface DashboardViewProps {
  user: OnboardingData;
  onSignOut: () => void;
  onOpenPractice: () => void;
}

// Framer Motion Staggered Variants for Widgets
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

export function DashboardView({ user, onSignOut, onOpenPractice }: DashboardViewProps) {
  const [completedHours, setCompletedHours] = useState<number>(1.5);
  const [streakDays, setStreakDays] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'learning' | 'overview' | 'analytics' | 'qbank' | 'coach'>('learning');
  
  // Profile Modal
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Selection Context
  const {
    selection,
    setExam,
    setSubject,
    setTopic,
    availableExams,
    availableSubjects,
    availableTopics
  } = useSelection();

  // Quick AI Chat prompt state
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello ${user.firstName}! I am your Neo AI Coach initialized for ${selection.exam?.name || user.examName}. You have ${user.daysLeft} days until your exam. What subject should we review today?`,
    },
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');
    setChatLog((prev) => [...prev, { sender: 'user', text: userText }]);

    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Got it! For ${selection.exam?.name || user.examName}, mastering key high-yield concepts in ${userText} is crucial. I've prepared practice questions targeting common distractors in ${selection.topic?.name || 'this topic'}. Ready to test yourself?`,
        },
      ]);
    }, 700);
  };

  const progressPercentage = Math.min(100, Math.round((completedHours / user.studyHours) * 100));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-[#050816]/80 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="md" />

          {/* Quick Active Exam Selector in Header */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-gray-900/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-xs font-bold">
            <span className="text-slate-400">Exam:</span>
            <select
              value={selection.exam?.id || ''}
              onChange={(e) => {
                const target = availableExams.find((ex) => ex.id === e.target.value);
                if (target) setExam(target);
              }}
              className="bg-transparent text-[#6D5BFF] dark:text-[#00D4FF] focus:outline-none font-black cursor-pointer"
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id} className="bg-white dark:bg-[#0E1324] text-slate-900 dark:text-white">
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Database className="w-3.5 h-3.5" />
              <span>Supabase Synced</span>
            </div>

            <ThemeToggle />

            {/* User Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
              title="Open Account Profile"
            >
              <User className="w-4 h-4 text-[#6D5BFF]" />
              <span className="hidden sm:inline">{user.firstName}</span>
            </button>

            <button
              onClick={onSignOut}
              className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl bg-gradient-to-r from-[#0E1324] via-[#141A33] to-[#0E1324] border border-[#6D5BFF]/30 p-6 sm:p-8 text-white shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6D5BFF]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#00D4FF]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#6D5BFF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
                <Sparkles className="w-3.5 h-3.5" /> Neo AI Active Sync
              </div>
              <h1 className="text-2xl sm:text-4xl font-heading font-extrabold tracking-tight">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-sm text-[#A6ADC8] max-w-xl">
                Currently preparing for <span className="text-white font-bold">{selection.exam?.name || user.examName}</span> ({user.country}). Target date: <span className="text-white font-bold">{user.examDate}</span>.
              </p>

              {/* Dynamic Exam, Subject & Topic Selector Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-slate-400 font-semibold">Exam:</span>
                <select
                  value={selection.exam?.id || ''}
                  onChange={(e) => {
                    const target = availableExams.find((ex) => ex.id === e.target.value);
                    if (target) setExam(target);
                  }}
                  className="bg-white/10 hover:bg-white/15 transition-colors text-white rounded-xl px-3 py-1 font-bold border border-white/15 focus:outline-none cursor-pointer"
                >
                  {availableExams.length > 0 ? (
                    availableExams.map((ex) => (
                      <option key={ex.id} value={ex.id} className="bg-[#0E1324] text-white">
                        {ex.name}
                      </option>
                    ))
                  ) : (
                    <option value={selection.exam?.id || ''} className="bg-[#0E1324] text-white">
                      {selection.exam?.name || user.examName}
                    </option>
                  )}
                </select>

                <span className="text-slate-400 font-semibold">Subject:</span>
                <select
                  value={selection.subject?.id || ''}
                  onChange={(e) => {
                    const target = availableSubjects.find((s) => s.id === e.target.value);
                    if (target) setSubject(target);
                  }}
                  className="bg-white/10 hover:bg-white/15 transition-colors text-[#00D4FF] rounded-xl px-3 py-1 font-bold border border-white/15 focus:outline-none cursor-pointer"
                >
                  {availableSubjects.length > 0 ? (
                    availableSubjects.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#0E1324] text-white">
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value={selection.subject?.id || ''} className="bg-[#0E1324] text-white">
                      {selection.subject?.name || 'Human Anatomy'}
                    </option>
                  )}
                </select>

                <span className="text-slate-400 font-semibold">Topic:</span>
                <select
                  value={selection.topic?.id || ''}
                  onChange={(e) => {
                    const target = availableTopics.find((t) => t.id === e.target.value);
                    if (target) setTopic(target);
                  }}
                  className="bg-white/10 hover:bg-white/15 transition-colors text-emerald-400 rounded-xl px-3 py-1 font-bold border border-white/15 focus:outline-none cursor-pointer"
                >
                  {availableTopics.length > 0 ? (
                    availableTopics.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#0E1324] text-white">
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <option value={selection.topic?.id || ''} className="bg-[#0E1324] text-white">
                      {selection.topic?.name || 'Cardiovascular Anatomy'}
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Days Countdown Widget */}
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#A855F7]">
                  {user.daysLeft}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  Days Left
                </div>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-heading font-black text-amber-400 flex items-center justify-center gap-1">
                  <Flame className="w-6 h-6 fill-amber-400" /> {streakDays}
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  Day Streak
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-2 overflow-x-auto">
          {[
            { id: 'learning', label: 'Neo Learning Engine ✨' },
            { id: 'overview', label: 'Dashboard Overview' },
            { id: 'analytics', label: 'Weakness Radar' },
            { id: 'qbank', label: 'Adaptive Q-Bank' },
            { id: 'coach', label: 'AI Coach Chat' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#6D5BFF] text-white shadow-md'
                  : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200/50 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* LEARNING CONTENT ENGINE TAB */}
        {activeTab === 'learning' && (
          <LearningContentEngine
            initialExamName={selection.exam?.name || user.examName}
            initialSubjectName={selection.subject?.name || 'Human Anatomy'}
          />
        )}

        {/* OVERVIEW TAB CONTENT WITH STAGGERED REVEAL ANIMATIONS */}
        {activeTab === 'overview' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Daily Progress Tracker Card */}
              <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#6D5BFF]" /> Daily Study Goal
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Target: {user.studyHours} hours today ({user.studyTime} preference)
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-[#6D5BFF]">
                    {completedHours} / {user.studyHours} hrs ({progressPercentage}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    onClick={() => setCompletedHours((prev) => Math.min(user.studyHours, prev + 0.5))}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-xs font-bold text-[#6D5BFF] transition-colors cursor-pointer"
                  >
                    + Log 30 Mins Study
                  </button>
                  <span className="text-slate-400">Goals: {user.studyGoals.join(', ')}</span>
                </div>
              </motion.div>

              {/* Quick Launch Q-Bank */}
              <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-gradient-to-br from-[#6D5BFF]/10 to-[#00D4FF]/10 border border-[#6D5BFF]/30 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#6D5BFF] text-white">
                      High Yield Adaptive Q-Bank
                    </span>
                    <h3 className="font-heading font-extrabold text-xl">Start Exam Practice Session</h3>
                    <p className="text-xs text-slate-600 dark:text-gray-300">
                      Generates non-repetitive vignettes customized to {selection.exam?.name || user.examName} standards.
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#6D5BFF] text-white flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={onOpenPractice}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" /> Start 10-Question Sprint <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right Column: AI Assistant & Quick Diagnostics */}
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Interactive AI Coach Widget */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between h-96">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#6D5BFF]/20 flex items-center justify-center text-[#6D5BFF] font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-sm">Neo AI Exam Assistant</h4>
                      <p className="text-[10px] text-emerald-500 font-bold">Online & Listening</p>
                    </div>
                  </div>
                </div>

                {/* Chat Log Window */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {chatLog.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-[#6D5BFF] text-white ml-6 rounded-tr-none'
                          : 'bg-slate-100 dark:bg-gray-900 text-slate-800 dark:text-gray-200 mr-6 rounded-tl-none border border-slate-200 dark:border-gray-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-200 dark:border-gray-800">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask Neo AI any question..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#6D5BFF] text-white hover:bg-[#5b4aee] transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ANALYTICS TAB CONTENT */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-6"
          >
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-xl">Knowledge Weakness Radar</h3>
              <p className="text-xs text-slate-500">
                Calculated by Neo AI based on global blueprint weightings for {selection.exam?.name || user.examName}.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { subject: 'Clinical & Technical Diagnostics', mastery: 84, color: 'bg-emerald-500' },
                { subject: 'Pharmacology & High Yield Formulas', mastery: 62, color: 'bg-amber-500' },
                { subject: 'Anatomy & System Pathology', mastery: 91, color: 'bg-[#00D4FF]' },
                { subject: 'Ethics & Behavioral Sciences', mastery: 75, color: 'bg-[#6D5BFF]' },
              ].map((sub, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{sub.subject}</span>
                    <span>{sub.mastery}% Mastery</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full ${sub.color}`} style={{ width: `${sub.mastery}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Q-BANK TAB CONTENT */}
        {activeTab === 'qbank' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-6 text-center"
          >
            <Brain className="w-12 h-12 mx-auto text-[#6D5BFF] animate-pulse" />
            <div className="space-y-2">
              <h3 className="font-heading font-bold text-xl">Adaptive Q-Bank Practice Engine</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ready to practice questions tailored for {selection.exam?.name || user.examName}?
              </p>
            </div>
            <button
              onClick={onOpenPractice}
              className="px-6 py-3 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold shadow-md hover:opacity-95 cursor-pointer"
            >
              Open Interactive Practice Window
            </button>
          </motion.div>
        )}

        {/* COACH TAB CONTENT */}
        {activeTab === 'coach' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4"
          >
            <h3 className="font-heading font-bold text-lg">Detailed AI Coach Consultation</h3>
            <p className="text-xs text-slate-500">
              Neo AI has indexed official guidelines for {selection.exam?.name || user.examName} ({user.country}). Target: {user.examDate} ({user.daysLeft} days remaining).
            </p>
          </motion.div>
        )}
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          country: user.country,
        }}
      />
    </div>
  );
}
