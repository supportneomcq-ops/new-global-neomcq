'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  PauseCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  Layers,
  Eye,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type {
  TutorAnalyticsData,
  TutorAnalyticsTimeframe,
} from '@/lib/types/ai-tutor-analytics';

export function AdminAITutorAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<TutorAnalyticsTimeframe>('30d');
  const [examId, setExamId] = useState<string>('all');
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<TutorAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Exams list for filter
  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch('/api/admin/exams');
        const json = await res.json();
        if (json.exams) {
          setExams(json.exams);
        }
      } catch (err) {
        console.error('Failed to load exams list for analytics filter:', err);
      }
    }
    loadExams();
  }, []);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('range', timeframe);
      if (examId && examId !== 'all') {
        params.set('exam_id', examId);
      }

      const res = await fetch(`/api/admin/ai-tutor/analytics?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Unable to load Tutor analytics.');
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unable to load Tutor analytics.');
      }

      setData(json.data);
    } catch (err: any) {
      console.error('Error fetching AI Tutor analytics:', err);
      setError('Unable to load Tutor analytics.');
    } finally {
      setLoading(false);
    }
  }, [timeframe, examId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const m = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-black text-slate-800 dark:text-white">AI Tutor Analytics</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Date Range Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold">
            {(['7d', '30d', '90d', 'all'] as TutorAnalyticsTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf === '7d'
                  ? '7 Days'
                  : tf === '30d'
                  ? '30 Days'
                  : tf === '90d'
                  ? '90 Days'
                  : 'All Time'}
              </button>
            ))}
          </div>

          {/* Exam Scope Filter */}
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold text-slate-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Loading Tutor analytics…</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : !m || data.totalEventCount === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-gray-200">No Tutor activity found for this period.</p>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Student interactions, lesson playback, and doubts asked will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Tutor Starts"
              value={m.engagement.totalStarts}
              subtext={`${m.engagement.uniqueLearners} unique learners`}
              icon={Users}
              color="indigo"
            />
            <MetricCard
              label="Tutor Completions"
              value={m.engagement.totalCompletions}
              subtext={`${m.engagement.totalOpens} total opens`}
              icon={CheckCircle2}
              color="emerald"
            />
            <MetricCard
              label="Completion Rate"
              value={`${m.engagement.completionRate}%`}
              subtext="Started to completed ratio"
              icon={TrendingUp}
              color="violet"
            />
            <MetricCard
              label="Average Engagement"
              value={`${m.engagement.avgCompletionPercentage}%`}
              subtext="Avg lesson progress"
              icon={Clock}
              color="sky"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="FAQ Reuse Rate"
              value={`${m.faqDoubt.canonicalFaqReuseRate}%`}
              subtext="$0 credit savings rate"
              icon={ShieldCheck}
              color="emerald"
            />
            <MetricCard
              label="Doubts Asked"
              value={m.faqDoubt.doubtsAsked}
              subtext={`${m.faqDoubt.faqViewed} FAQ views`}
              icon={HelpCircle}
              color="amber"
            />
            <MetricCard
              label="New Answers Generated"
              value={m.faqDoubt.newDoubtAnswersGenerated}
              subtext="Grounding AI responses"
              icon={Sparkles}
              color="indigo"
            />
            <MetricCard
              label="Playback Friction"
              value={m.playback.pauseCount + m.playback.seekCount}
              subtext={`${m.playback.exitBeforeCompletionCount} exits before completion`}
              icon={PauseCircle}
              color="rose"
            />
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Playback & Engagement Breakdown */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Lesson Playback & Engagement</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Opened vs Started</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.engagement.totalOpens} opens → {m.engagement.totalStarts} starts
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Scene Progression</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.lesson.sceneCompletions} / {m.lesson.sceneStarts} scenes ({m.lesson.sceneCompletionRate}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Pauses & Seeks</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.playback.pauseCount} pauses, {m.playback.seekCount} seeks
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Exits Before Completion</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {m.playback.exitBeforeCompletionCount} learner exits
                  </span>
                </div>
              </div>
            </div>

            {/* Socratic Doubts & FAQ Reuse */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Socratic Doubts & Canonical FAQ Reuse</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Canonical FAQ Reused ($0 Credit)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {m.faqDoubt.canonicalFaqReused} reuses
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">New Doubt Answers Generated</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {m.faqDoubt.newDoubtAnswersGenerated} generated
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">FAQ Opened & Viewed</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {m.faqDoubt.faqOpened} opened, {m.faqDoubt.faqViewed} viewed
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800">
                  <span className="font-semibold text-slate-600 dark:text-gray-300">Canonical Reuse Efficiency</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {m.faqDoubt.canonicalFaqReuseRate}% reuse rate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Highest-Friction Scenes & Scopes Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Highest-Friction Topics & Content Scopes</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                Neutral friction signals
              </span>
            </div>

            {data.highFrictionItems.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-gray-400 text-center py-6">
                No high-friction topics detected for this period. Learners are moving smoothly through lessons.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                    <tr>
                      <th className="p-3">Scope / Topic</th>
                      <th className="p-3 text-center">Starts</th>
                      <th className="p-3 text-center">Completions</th>
                      <th className="p-3 text-center">Exits</th>
                      <th className="p-3 text-center">Doubts</th>
                      <th className="p-3">Friction Signals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                    {data.highFrictionItems.map((item) => (
                      <tr key={item.scopeKey} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <div>{item.topicName || item.topicId}</div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                            {item.examName} • {item.subjectName}
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700 dark:text-gray-300">
                          {item.startsCount}
                        </td>
                        <td className="p-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.completionsCount}
                        </td>
                        <td className="p-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                          {item.dropOffCount}
                        </td>
                        <td className="p-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                          {item.doubtsCount}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {item.frictionSignals.map((sig, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              >
                                {sig}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'indigo',
}: {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 text-xs font-bold">
        <span>{label}</span>
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
      <div className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">{subtext}</div>
    </div>
  );
}
