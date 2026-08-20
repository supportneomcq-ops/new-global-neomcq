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
  ChevronDown,
  Coins,
  DollarSign,
  History,
  Loader2,
  Lock,
} from 'lucide-react';
import { OnboardingData } from './onboarding-flow';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { LearningContentEngine } from './learning-content-engine';
import { UserProfileModal } from './user-profile-modal';
import { ExamSwitchModal } from './exam-switch-modal';
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
  const [activeTab, setActiveTab] = useState<'learning' | 'overview' | 'analytics' | 'qbank' | 'coach' | 'credits'>('learning');
  
  // Credits & Wallet state
  const [creditsData, setCreditsData] = useState<any>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  const fetchCredits = async () => {
    try {
      setLoadingCredits(true);
      const res = await fetch('/api/credits');
      const data = await res.json();
      if (data.success) {
        setCreditsData(data);
      }
    } catch (err) {
      console.error('Error querying credits account:', err);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handlePurchasePack = async (packId: string) => {
    try {
      setPurchasingPackId(packId);
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchCredits();
      } else {
        alert(data.error || 'Checkout error');
      }
    } catch (err) {
      alert('Failed to connect to secure billing engine.');
    } finally {
      setPurchasingPackId(null);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'credits') {
      fetchCredits();
    }
  }, [activeTab]);

  // Profile Modal
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExamSwitchModalOpen, setIsExamSwitchModalOpen] = useState(false);

  // Selection Context
  const {
    selection,
    setSubject,
    setTopic,
    availableSubjects,
    availableTopics,
    isExamLocked,
    examSwitchCount,
    refreshHierarchy,
  } = useSelection();

  const handleCreateSubject = async () => {
    if (!selection.exam?.id) {
      alert('Please select an active exam first.');
      return;
    }
    const name = window.prompt(`Enter new subject name for ${selection.exam.name}:`);
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/subjects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selection.exam.id,
          subjectName: name.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.subject) {
        await refreshHierarchy();
        setSubject({
          id: data.subject.id,
          name: data.subject.name,
          slug: data.subject.slug,
        });
      } else {
        alert(data.error || 'Failed to create subject');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating subject');
    }
  };

  const handleCreateTopic = async () => {
    if (!selection.subject?.id) {
      alert('Please select an active subject first.');
      return;
    }
    const name = window.prompt(`Enter new topic name under ${selection.subject.name}:`);
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/topics/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: selection.subject.id,
          topicName: name.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.topic) {
        await refreshHierarchy();
        setTopic({
          id: data.topic.id,
          name: data.topic.name,
          slug: data.topic.slug,
        });
      } else {
        alert(data.error || 'Failed to create topic');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating topic');
    }
  };

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

          {/* Quick Active Exam Display in Header */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-gray-900/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-xs font-bold">
            <span className="text-slate-400">Exam:</span>
            <span className="flex items-center gap-1 text-[#6D5BFF] dark:text-[#00D4FF] font-black">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {selection.exam?.name || user.examName}
            </span>
            <button
              type="button"
              onClick={() => setIsExamSwitchModalOpen(true)}
              className="ml-1 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-500 underline font-extrabold cursor-pointer"
            >
              Switch ($2)
            </button>
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
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs">
                {/* Locked Primary Exam Display with Switch Button */}
                <div className="flex items-center gap-2 bg-white/10 dark:bg-black/30 border border-white/15 px-3 py-1.5 rounded-2xl shadow-sm">
                  <span className="text-[11px] uppercase font-bold text-slate-300">Your Exam:</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-gradient-to-r from-[#6D5BFF]/30 to-[#00D4FF]/20 border border-[#6D5BFF]/40 text-white font-extrabold text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{selection.exam?.name || user.examName}</span>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    {isExamLocked ? 'LOCKED (FREE PLAN)' : 'ACTIVE'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsExamSwitchModalOpen(true)}
                    className="ml-1 px-3 py-1 rounded-xl bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#00D4FF] hover:opacity-90 text-white text-[11px] font-heading font-extrabold flex items-center gap-1 shadow-md cursor-pointer transition-all shrink-0"
                    title="Switch your official exam for $2 USD"
                  >
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>Switch Exam ($2 USD)</span>
                  </button>
                </div>

                <span className="text-slate-400 font-semibold">Subject:</span>
                <div className="flex items-center gap-1">
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
                        {selection.subject?.name || 'Select Subject'}
                      </option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateSubject}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[#00D4FF] rounded-lg text-[10px] font-bold border border-white/10 cursor-pointer"
                    title="Create custom subject"
                  >
                    + Subject
                  </button>
                </div>

                <span className="text-slate-400 font-semibold">Topic:</span>
                <div className="flex items-center gap-1">
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
                        {selection.topic?.name || 'Select Topic'}
                      </option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateTopic}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-emerald-400 rounded-lg text-[10px] font-bold border border-white/10 cursor-pointer"
                    title="Create custom topic"
                  >
                    + Topic
                  </button>
                </div>
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
            { id: 'credits', label: 'My AI Wallet 💎' },
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

        {/* MY AI WALLET TAB CONTENT */}
        {activeTab === 'credits' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Wallet Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#10142A] to-[#1D2447] text-white border border-[#6D5BFF]/30 space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00D4FF]">Current Balance</span>
                    <h3 className="text-4xl font-heading font-black mt-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                      {loadingCredits ? '...' : (Number(creditsData?.wallet?.credit_balance || 0).toFixed(1))}
                    </h3>
                  </div>
                  <div className="bg-[#6D5BFF]/30 text-[#00D4FF] rounded-full p-2.5">
                    <Coins className="h-6 w-6" />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex justify-between text-xs text-slate-400">
                  <span>Reserved credits:</span>
                  <span className="font-bold text-white">{creditsData?.wallet?.reserved_credits || 0}</span>
                </div>

                {creditsData?.subscription ? (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-[11px] space-y-1">
                    <span className="font-bold text-slate-200 block">Plan: {creditsData.subscription.subscription_plans?.name}</span>
                    <span className="text-slate-400">Monthly AI credits allocation automatically refreshed.</span>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 text-[11px] text-amber-300">
                    No active subscription. Standard rates apply. Purchase credit packs below to power your adaptive AI tools.
                  </div>
                )}
              </div>

              {/* Warnings and predictability guide */}
              <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 space-y-4">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#6D5BFF]" /> Predictive AI Value Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  AI generations on NeoMCQ utilize advanced LLMs mapped to custom task routing rules. Know your estimated consumption in advance:
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border border-slate-100 dark:border-gray-800 rounded-2xl">
                    <span className="font-bold block text-[#6D5BFF]">Adaptive MCQ generation</span>
                    <span className="text-slate-400">~1.5 credits per block</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-gray-800 rounded-2xl">
                    <span className="font-bold block text-emerald-500">AI Tutor Chat consultation</span>
                    <span className="text-slate-400">~1.0 credits per turn</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-gray-800 rounded-2xl">
                    <span className="font-bold block text-purple-500">Study Guide / Revision sheets</span>
                    <span className="text-slate-400">~2.5 credits per guide</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-gray-800 rounded-2xl">
                    <span className="font-bold block text-amber-500">Concept explanation lookup</span>
                    <span className="text-slate-400">~0.5 credits per lookup</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buy Credit Packs Section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white">Purchase Additional AI Credits</h3>
                <p className="text-xs text-slate-500">Instant top-up to unleash premium AI high-yield features.</p>
              </div>

              {loadingCredits ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6D5BFF]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {(creditsData?.creditPacks && creditsData.creditPacks.length > 0) ? (
                    creditsData.creditPacks.map((pack: any) => (
                      <div
                        key={pack.id}
                        className="p-5 border border-slate-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-[#0E1324] hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{pack.name}</h4>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-[#6D5BFF]">
                              {Number(pack.credits) + Number(pack.bonus_credits || 0)}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">credits</span>
                          </div>
                          {Number(pack.bonus_credits) > 0 && (
                            <span className="inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 border border-emerald-500/20">
                              Includes {pack.bonus_credits} bonus credits!
                            </span>
                          )}
                        </div>

                        <button
                          disabled={purchasingPackId !== null}
                          onClick={() => handlePurchasePack(pack.id)}
                          className="w-full mt-5 py-2.5 bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-extrabold text-xs rounded-xl shadow transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          {purchasingPackId === pack.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>Purchase Pack • ${Number(pack.price_usd).toFixed(2)}</>
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    // Fallback visual cards
                    [
                      { id: '1', name: 'Standard Boost', credits: 50, price: 5.00, bonus: 0 },
                      { id: '2', name: 'Professional Tier', credits: 120, price: 9.99, bonus: 20 },
                      { id: '3', name: 'Ultimate Powerpack', credits: 300, price: 19.99, bonus: 50 },
                    ].map((pack) => (
                      <div
                        key={pack.id}
                        className="p-5 border border-slate-200 dark:border-gray-800 rounded-3xl bg-white dark:bg-[#0E1324] hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{pack.name}</h4>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-3xl font-black text-[#6D5BFF]">
                              {pack.credits + pack.bonus}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">credits</span>
                          </div>
                          {pack.bonus > 0 && (
                            <span className="inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 border border-emerald-500/20">
                              Includes {pack.bonus} bonus credits!
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => alert('Checkout initiated for standard sandbox booster.')}
                          className="w-full mt-5 py-2.5 bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-extrabold text-xs rounded-xl shadow transition-colors cursor-pointer"
                        >
                          Purchase Pack • ${pack.price.toFixed(2)}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Audit History / Transaction Ledger */}
            <div className="space-y-4">
              <h3 className="font-heading font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5 text-[#6D5BFF]" /> Wallet Transaction History
              </h3>

              <div className="border border-slate-200 dark:border-gray-800 rounded-3xl overflow-hidden bg-white dark:bg-[#0E1324]">
                {creditsData?.ledger && creditsData.ledger.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800 text-xs">
                      <thead className="bg-slate-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Transaction Type</th>
                          <th className="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Credits</th>
                          <th className="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Balance Before/After</th>
                          <th className="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                        {creditsData.ledger.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition">
                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 dark:text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.transaction_type === 'PURCHASE' || log.transaction_type === 'SUBSCRIPTION_GRANT'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : log.transaction_type === 'RESERVATION'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {log.transaction_type}
                              </span>
                            </td>
                            <td className={`px-6 py-3.5 whitespace-nowrap font-bold ${
                              log.transaction_type === 'PURCHASE' || log.transaction_type === 'SUBSCRIPTION_GRANT' || log.transaction_type === 'RELEASE'
                                ? 'text-emerald-500'
                                : 'text-rose-500'
                            }`}>
                              {log.transaction_type === 'PURCHASE' || log.transaction_type === 'SUBSCRIPTION_GRANT' || log.transaction_type === 'RELEASE' ? '+' : '-'}
                              {log.credits}
                            </td>
                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-400">
                              {log.balance_before} → {log.balance_after}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 dark:text-gray-300">
                              {log.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No transactions recorded on this wallet yet. Play with adaptive features to record usage logs!
                  </div>
                )}
              </div>
            </div>
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

      {/* Exam Switch Modal ($2 USD Razorpay Flow) */}
      <ExamSwitchModal
        isOpen={isExamSwitchModalOpen}
        onClose={() => setIsExamSwitchModalOpen(false)}
        currentExam={selection.exam}
        onSwitchSuccess={() => {
          refreshHierarchy();
        }}
      />
    </div>
  );
}
