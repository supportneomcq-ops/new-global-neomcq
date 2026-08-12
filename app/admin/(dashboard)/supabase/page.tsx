'use client';

import React from 'react';
import Link from 'next/link';
import {
  CloudIcon,
  ShieldCheck,
  Users,
  Database,
  Lock,
  Activity,
  HardDrive,
  Workflow,
  CheckCircle2,
  ArrowRight,
  FileCode,
} from 'lucide-react';

export default function AdminSupabaseOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <CloudIcon className="w-6 h-6 text-[#3ECF8E]" />
            <span>Supabase Infrastructure Operations Hub</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Safe operational summary of Supabase Authentication, PostgreSQL Database, Storage Buckets, Realtime Engine, Edge Functions, and RLS Policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/supabase/auth"
            className="p-2.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Users className="w-4 h-4" />
            <span>Auth Operations</span>
          </Link>

          <Link
            href="/admin/supabase/rls"
            className="p-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Lock className="w-4 h-4" />
            <span>RLS Security Overview</span>
          </Link>
        </div>
      </div>

      {/* Supabase Core Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Auth */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Operational
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Authentication Service</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              GoTrue JWT Auth with Email/Password & Google OAuth credentials.
            </p>
          </div>

          <Link
            href="/admin/supabase/auth"
            className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-emerald-400 hover:underline flex items-center justify-between"
          >
            <span>Inspect Auth Metrics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 2: Database */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Operational
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">PostgreSQL Database</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              PostgreSQL 15 cluster with connection pooling & 21 canonical tables.
            </p>
          </div>

          <Link
            href="/admin/database"
            className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-blue-400 hover:underline flex items-center justify-between"
          >
            <span>Database Management</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 3: Storage */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Operational
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Object Storage</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Media, exam PDFs, and audio flashcards bucket storage.
            </p>
          </div>

          <Link
            href="/admin/storage"
            className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-purple-400 hover:underline flex items-center justify-between"
          >
            <span>Storage Manager</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 4: Realtime */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
                <Activity className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Operational
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Realtime Subscriptions</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              WebSocket channels for live notifications & support messaging.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-mono text-slate-400">
            Active Listeners: 8 Channels
          </div>
        </div>

        {/* Module 5: Edge Functions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <FileCode className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Operational
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Edge Functions</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Deno edge functions for webhooks & background AI queue triggers.
            </p>
          </div>

          <Link
            href="/admin/edge-functions"
            className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-indigo-400 hover:underline flex items-center justify-between"
          >
            <span>Edge Functions Manager</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Module 6: RLS Security */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400">
                <Lock className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Enforced
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Row Level Security</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Declarative security policies enforced on all 21 database tables.
            </p>
          </div>

          <Link
            href="/admin/supabase/rls"
            className="pt-3 border-t border-slate-200 dark:border-gray-800 text-xs font-bold text-rose-400 hover:underline flex items-center justify-between"
          >
            <span>Audit RLS Policies</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
