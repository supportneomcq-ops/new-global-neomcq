'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#6D5BFF]" />
            <span>Platform Usage Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time learner retention, daily active users (DAU), question attempt volume, and AI tutor interactions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Daily Active Learners</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">3,840</div>
          <div className="text-[10px] text-emerald-500 font-bold">+12% vs last week</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Questions Solved Today</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">42,910</div>
          <div className="text-[10px] text-emerald-500 font-bold">84.2% Avg Accuracy</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">AI Tutor Prompts</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">12,450</div>
          <div className="text-[10px] text-indigo-500 font-bold">98.9% Success Rate</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-2">
          <div className="text-xs font-bold text-slate-400">Avg Session Length</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">48 mins</div>
          <div className="text-[10px] text-emerald-500 font-bold">High Engagement</div>
        </div>
      </div>
    </div>
  );
}
