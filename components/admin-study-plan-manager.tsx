'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';

export default function AdminStudyPlanManager() {
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [examFilter, setExamFilter] = useState('all');

  useEffect(() => {
    fetchExams();
    fetchPlans();
  }, [search, examFilter]);

  async function fetchExams() {
    try {
      const res = await fetch('/api/admin/exams');
      const data = await res.json();
      if (data.exams) setExams(data.exams);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPlans() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/study-plans?search=${search}&exam_id=${examFilter}`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.study_plans || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#6D5BFF]" />
            <span>Structured Study Plans & Timelines</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            View and manage high-yield exam preparation schedules and study trajectories for candidates.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exam or candidate email..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold"
          >
            <option value="all">All Exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <button onClick={fetchPlans} className="p-2 rounded-2xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading Study Plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No active study plans found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Target Exam</th>
                  <th className="p-4">Candidate</th>
                  <th className="p-4">Start Date</th>
                  <th className="p-4">End Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">{p.exams?.name || 'Exam'}</td>
                    <td className="p-4 text-slate-600 dark:text-gray-300">{p.profiles?.email || 'General Plan'}</td>
                    <td className="p-4 text-slate-500">{new Date(p.start_date).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-500">{new Date(p.end_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {p.is_active ? 'Active' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
