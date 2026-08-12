'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, AlertCircle, ChevronRight, CheckCircle2, Award, Clock, ArrowLeft } from 'lucide-react';
import AnalyticsFilterBar, { AnalyticsFilterState } from '@/components/admin/analytics/analytics-filter-bar';
import { exportToCSV } from '@/lib/analytics-utils';

export default function ExamAnalyticsPage() {
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
  const [exams, setExams] = useState<any[]>([]);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchExamAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filters.examId) queryParams.set('examId', filters.examId);
      if (filters.subjectId) queryParams.set('subjectId', filters.subjectId);

      const res = await fetch(`/api/admin/analytics/exams?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch exam analytics');
      const json = await res.json();

      if (filters.examId) {
        setDrilldownData(json);
      } else {
        setDrilldownData(null);
        setExams(json.exams || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading exam analytics');
    } finally {
      setLoading(false);
    }
  }, [filters.examId, filters.subjectId]);

  useEffect(() => {
    fetchExamAnalytics();
  }, [fetchExamAnalytics]);

  const handleExport = () => {
    if (drilldownData) {
      const headers = ['Subject', 'Attempted', 'Solved', 'Accuracy %', 'Active Users'];
      const rows = drilldownData.subjects.map((s: any) => [s.name, s.questionsAttempted, s.questionsSolved, `${s.accuracy}%`, s.activeUsers]);
      exportToCSV(`exam_${filters.examId}_subjects`, headers, rows);
    } else {
      const headers = ['Exam ID', 'Exam Name', 'Active Users', 'Attempted', 'Accuracy %', 'Study Time (Mins)'];
      const rows = exams.map((e: any) => [e.id, e.name, e.activeUsers, e.questionsAttempted, `${e.accuracy}%`, e.studyTimeMins]);
      exportToCSV('canonical_exam_rankings', headers, rows);
    }
  };

  const filteredExams = exams.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <BookOpen className="w-7 h-7 text-[#6D5BFF]" />
            <span>Exam & Knowledge Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Canonical exam ranking, active learner volume per exam, subject weighting, and weak area topic indicators.
          </p>
        </div>

        {filters.examId && (
          <button
            onClick={() => setFilters({ ...filters, examId: '', subjectId: '', topicId: '' })}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Back to All Exams</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchExamAnalytics}
        onExportCSV={handleExport}
        loading={loading}
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold">
          {error}
        </div>
      ) : drilldownData ? (
        /* Drilldown View for Specific Exam */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-xs font-medium flex items-center justify-between">
            <span>Viewing Subject & Topic Breakdown for Exam ID: <strong className="text-white">{filters.examId}</strong></span>
            <span className="text-indigo-400 font-bold">{drilldownData.subjects?.length || 0} Subjects</span>
          </div>

          {/* Subject Breakdown Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Subject Performance & Weak Area Indicator</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Subject Name</th>
                    <th className="py-3 px-3">Questions Attempted</th>
                    <th className="py-3 px-3">Solved</th>
                    <th className="py-3 px-3">Accuracy</th>
                    <th className="py-3 px-3">Active Learners</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {drilldownData.subjects?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                      <td className="py-3 px-3 text-slate-300 font-bold">{s.questionsAttempted}</td>
                      <td className="py-3 px-3 text-slate-300">{s.questionsSolved}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${s.accuracy >= 70 ? 'text-emerald-400' : s.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {s.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{s.activeUsers}</td>
                      <td className="py-3 px-3">
                        {s.isWeakArea ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            Weak Area
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Good Standing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Global Canonical Exam Ranking Table */
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Canonical Exam Ranking & Learner Activity</span>
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search canonical exam..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Exam ID</th>
                  <th className="py-3 px-3">Exam Name</th>
                  <th className="py-3 px-3">Active Learners</th>
                  <th className="py-3 px-3">Questions Attempted</th>
                  <th className="py-3 px-3">Accuracy</th>
                  <th className="py-3 px-3">Study Time</th>
                  <th className="py-3 px-3 text-right">Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching canonical exams found.
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{exam.id.slice(0, 8)}...</td>
                      <td className="py-3 px-3 font-semibold text-white">{exam.name}</td>
                      <td className="py-3 px-3 text-indigo-400 font-bold">{exam.activeUsers}</td>
                      <td className="py-3 px-3 text-slate-300 font-semibold">{exam.questionsAttempted}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{exam.accuracy}%</td>
                      <td className="py-3 px-3 text-slate-300">{exam.studyTimeMins} mins</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setFilters({ ...filters, examId: exam.id })}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
