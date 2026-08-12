'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Printer,
  RotateCcw,
  BookOpen,
  Globe,
  Smartphone,
  CreditCard,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

export interface AnalyticsFilterState {
  timeframe: string;
  customStart?: string;
  customEnd?: string;
  examId?: string;
  subjectId?: string;
  topicId?: string;
  country?: string;
  platform?: string;
  subscriptionTier?: string;
  userType?: string;
}

interface FilterBarProps {
  filters: AnalyticsFilterState;
  onFilterChange: (newFilters: AnalyticsFilterState) => void;
  onRefresh: () => void;
  onExportCSV?: () => void;
  title?: string;
  loading?: boolean;
}

export default function AnalyticsFilterBar({
  filters,
  onFilterChange,
  onRefresh,
  onExportCSV,
  title,
  loading = false,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; iso2?: string }[]>([]);

  // Load Exams & Countries
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [examRes, userRes] = await Promise.all([
          fetch('/api/admin/exams?status=all'),
          fetch('/api/admin/users'),
        ]);

        if (examRes.ok) {
          const eJson = await examRes.json();
          setExams(eJson.exams?.map((e: any) => ({ id: e.id, name: e.name })) || []);
        }

        // Fetch countries list
        const countryRes = await fetch('/api/admin/analytics/overview?listCountries=true');
        if (countryRes.ok) {
          const cJson = await countryRes.json();
          if (cJson.countries) {
            setCountries(cJson.countries);
          }
        }
      } catch (err) {
        console.error('Error loading filter metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Load Subjects when Exam changes
  useEffect(() => {
    if (!filters.examId) {
      setSubjects([]);
      setTopics([]);
      return;
    }
    async function loadSubjects() {
      try {
        const res = await fetch(`/api/admin/hierarchy?examId=${filters.examId}`);
        if (res.ok) {
          const json = await res.json();
          setSubjects(json.subjects?.map((s: any) => ({ id: s.id, name: s.name })) || []);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    }
    loadSubjects();
  }, [filters.examId]);

  // Load Topics when Subject changes
  useEffect(() => {
    if (!filters.subjectId) {
      setTopics([]);
      return;
    }
    async function loadTopics() {
      try {
        const res = await fetch(`/api/admin/hierarchy?examId=${filters.examId}`);
        if (res.ok) {
          const json = await res.json();
          const filteredTopics = json.topics?.filter((t: any) => t.subject_id === filters.subjectId) || [];
          setTopics(filteredTopics.map((t: any) => ({ id: t.id, name: t.name })));
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    }
    loadTopics();
  }, [filters.subjectId, filters.examId]);

  const handleChange = (key: keyof AnalyticsFilterState, value: any) => {
    const updated = { ...filters, [key]: value };
    // Reset dependent subject/topic if exam changes
    if (key === 'examId') {
      updated.subjectId = '';
      updated.topicId = '';
    }
    if (key === 'subjectId') {
      updated.topicId = '';
    }
    onFilterChange(updated);
  };

  const handleReset = () => {
    onFilterChange({
      timeframe: '30d',
      examId: '',
      subjectId: '',
      topicId: '',
      country: '',
      platform: '',
      subscriptionTier: '',
      userType: '',
    });
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
      {/* Top row: Primary Timeframe & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Timeframe pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <Calendar className="w-4 h-4 text-[#6D5BFF] ml-1 mr-2 flex-shrink-0" />
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '90d', label: '90 Days' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom' },
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => handleChange('timeframe', tf.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filters.timeframe === tf.id
                  ? 'bg-[#6D5BFF] text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showAdvanced || filters.examId || filters.country || filters.platform
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filters</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Sync Analytics Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
              title="Export CSV Data"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all text-xs font-semibold hidden sm:flex items-center gap-1.5"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {filters.timeframe === 'custom' && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Start:</span>
            <input
              type="date"
              value={filters.customStart || ''}
              onChange={(e) => handleChange('customStart', e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">End:</span>
            <input
              type="date"
              value={filters.customEnd || ''}
              onChange={(e) => handleChange('customEnd', e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Advanced Filter Panel */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {/* Exam */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Exam</label>
            <select
              value={filters.examId || ''}
              onChange={(e) => handleChange('examId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Exams</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Subject</label>
            <select
              value={filters.subjectId || ''}
              disabled={!filters.examId}
              onChange={(e) => handleChange('subjectId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-medium"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Topic</label>
            <select
              value={filters.topicId || ''}
              disabled={!filters.subjectId}
              onChange={(e) => handleChange('topicId', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-medium"
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Country</label>
            <select
              value={filters.country || ''}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Platform */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Platform</label>
            <select
              value={filters.platform || ''}
              onChange={(e) => handleChange('platform', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Platforms</option>
              <option value="web">Web</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="api">API</option>
            </select>
          </div>

          {/* Subscription Tier */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Subscription</label>
            <select
              value={filters.subscriptionTier || ''}
              onChange={(e) => handleChange('subscriptionTier', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Tiers</option>
              <option value="free">Free Tier</option>
              <option value="monthly">Monthly Pro</option>
              <option value="yearly">Yearly Pass</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          {/* User Type */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">User Type</label>
            <div className="flex items-center gap-1">
              <select
                value={filters.userType || ''}
                onChange={(e) => handleChange('userType', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">All Users</option>
                <option value="student">Student</option>
                <option value="resident">Resident</option>
                <option value="doctor">Doctor</option>
                <option value="educator">Educator</option>
                <option value="admin">Admin</option>
              </select>

              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 hover:bg-slate-800"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
