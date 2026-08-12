'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, HelpCircle, Clock, BookOpen, Layers, CheckCircle2, TrendingUp, Cpu, Calendar } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function LearningAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeframe: '30d',
    examId: '',
    subjectId: '',
    topicId: '',
    country: '',
    platform: '',
    subscriptionTier: '',
    userType: '',
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLearningAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.timeframe) queryParams.set('timeframe', filters.timeframe);
      if (filters.customStart) queryParams.set('customStart', filters.customStart);
      if (filters.customEnd) queryParams.set('customEnd', filters.customEnd);
      if (filters.examId) queryParams.set('examId', filters.examId);

      const res = await fetch(`/api/admin/analytics/learning?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch learning analytics');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading learning analytics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLearningAnalytics();
  }, [fetchLearningAnalytics]);

  const handleExport = () => {
    if (!data?.trends) return;
    const headers = ['Date', 'Questions Attempted', 'Questions Solved', 'Accuracy %', 'Study Mins'];
    const rows = data.trends.map((t: any) => [t.date, t.attempted, t.correct, `${t.accuracy}%`, t.studyMins]);
    exportToCSV('learning_analytics_trends', headers, rows);
  };

  const m = data?.metrics;
  const diff = data?.difficultyPerformance;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="w-7 h-7 text-[#6D5BFF]" />
          <span>Learning Analytics & Study Time</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          Study session tracking, question attempts, solving accuracy, difficulty tiers, notes, and flashcard usage.
        </p>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchLearningAnalytics}
        onExportCSV={handleExport}
        loading={loading}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : !m ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
          No learning data available for this period.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricTile title="Questions Attempted" value={m.totalAttempted.toLocaleString()} icon={HelpCircle} color="indigo" />
            <MetricTile title="Solving Accuracy" value={`${m.accuracy}%`} subtitle={`${m.totalCorrect} Correct`} icon={CheckCircle2} color="emerald" />
            <MetricTile title="Total Study Time" value={`${m.totalStudyTimeMins} mins`} icon={Clock} color="amber" />
            <MetricTile title="Avg Time / Question" value={`${m.avgSecsPerQuestion}s`} icon={Clock} color="purple" />
            <MetricTile title="Active Learners" value={m.activeLearners.toLocaleString()} icon={Sparkles} color="cyan" />
          </div>

          {/* Secondary Assets Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricTile title="Notes Viewed" value={m.notesViewed.toLocaleString()} icon={BookOpen} color="blue" />
            <MetricTile title="Flashcards Studied" value={m.flashcardsStudied.toLocaleString()} icon={Layers} color="violet" />
            <MetricTile title="Revision Sheets" value={m.revisionSheetsUsed.toLocaleString()} icon={Sparkles} color="emerald" />
            <MetricTile title="AI Tutor Sessions" value={m.aiTutorSessions.toLocaleString()} icon={Cpu} color="cyan" />
            <MetricTile title="Study Plans Active" value={m.studyPlans.toLocaleString()} icon={Calendar} color="indigo" />
          </div>

          {/* Difficulty Performance Cards */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>MCQ Accuracy by Difficulty Level</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400">EASY QUESTIONS</span>
                  <span className="text-xs font-bold text-slate-400">{diff?.easy?.attempted || 0} attempted</span>
                </div>
                <div className="text-2xl font-black text-white">{diff?.easy?.accuracy || 0}%</div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${diff?.easy?.accuracy || 0}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400">MEDIUM QUESTIONS</span>
                  <span className="text-xs font-bold text-slate-400">{diff?.medium?.attempted || 0} attempted</span>
                </div>
                <div className="text-2xl font-black text-white">{diff?.medium?.accuracy || 0}%</div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${diff?.medium?.accuracy || 0}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-400">HARD QUESTIONS</span>
                  <span className="text-xs font-bold text-slate-400">{diff?.hard?.attempted || 0} attempted</span>
                </div>
                <div className="text-2xl font-black text-white">{diff?.hard?.accuracy || 0}%</div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${diff?.hard?.accuracy || 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trends Visualization */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Daily Question Attempt Volume & Accuracy Trend</span>
            </h3>

            {data?.trends?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No daily learning history in this period.</div>
            ) : (
              <div className="h-44 flex items-end gap-1 pt-6 overflow-x-auto scrollbar-none">
                {data?.trends?.map((item: any, idx: number) => {
                  const maxVal = Math.max(...data.trends.map((t: any) => t.attempted), 1);
                  const pct = Math.round((item.attempted / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-8 hidden group-hover:flex bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                        {item.date}: {item.attempted} attempts ({item.accuracy}% acc)
                      </div>
                      <div
                        style={{ height: `${Math.max(pct, 6)}%` }}
                        className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all"
                      />
                      <span className="text-[9px] text-slate-500 truncate w-full text-center">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
      <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
        <span>{title}</span>
        <Icon className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="text-xl font-black text-white">{value}</div>
      {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
