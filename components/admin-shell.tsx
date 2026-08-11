'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  BookOpen,
  FolderTree,
  FileText,
  HelpCircle,
  StickyNote,
  CreditCard,
  Layers,
  Bot,
  ListTodo,
  Tags,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Settings,
  Cpu,
  Activity,
  History,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Search,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { getSupabaseClient } from '@/lib/supabase';

interface AdminShellProps {
  userEmail: string;
  roles: string[];
  children: React.ReactNode;
}

export function AdminShell({ userEmail, roles, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login';
  };

  const navGroups = [
    {
      title: 'CORE PLATFORM',
      items: [
        { label: 'Overview Dashboard', href: '/admin', icon: BarChart3 },
        { label: 'User Management', href: '/admin/users', icon: Users },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { label: 'Payments & Revenue', href: '/admin/payments', icon: BadgeDollarSign },
      ],
    },
    {
      title: 'EXAM & CONTENT HIERARCHY',
      items: [
        { label: 'Exams & Syllabi', href: '/admin/exams', icon: BookOpen },
        { label: 'Subjects', href: '/admin/subjects', icon: FolderTree },
        { label: 'Topics', href: '/admin/topics', icon: FileText },
        { label: 'Exam Aliases', href: '/admin/aliases', icon: Tags },
        { label: 'Content Queue', href: '/admin/content-queue', icon: ListTodo },
      ],
    },
    {
      title: 'LEARNING ASSETS',
      items: [
        { label: 'MCQs Bank', href: '/admin/mcqs', icon: HelpCircle },
        { label: 'Sticky Notes', href: '/admin/notes', icon: StickyNote },
        { label: 'Flashcards', href: '/admin/flashcards', icon: Layers },
        { label: 'Revision Sheets', href: '/admin/revision-sheets', icon: Sparkles },
      ],
    },
    {
      title: 'AI ENGINE & INTELLIGENCE',
      items: [
        { label: 'AI Tutor Control', href: '/admin/ai-tutor', icon: Bot },
        { label: 'AI Provider Settings', href: '/admin/ai-settings', icon: Cpu },
      ],
    },
    {
      title: 'SYSTEM & SECURITY',
      items: [
        { label: 'System Health', href: '/admin/system-health', icon: Activity },
        { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
        { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        { label: 'Admin Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  // Helper for active navigation
  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  // Format breadcrumb path
  const pathSegments = pathname?.split('/').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#050816] text-slate-900 dark:text-white flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="h-16 border-b border-slate-200 dark:border-gray-800 bg-white/80 dark:bg-[#0E1324]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20">
              Admin
            </span>
          </Link>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 pl-4 border-l border-slate-200 dark:border-gray-800">
            <Link href="/admin" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Admin
            </Link>
            {pathSegments.slice(1).map((seg, i) => (
              <React.Fragment key={seg}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-gray-600" />
                <span className={`capitalize ${i === pathSegments.length - 2 ? 'font-bold text-slate-800 dark:text-gray-200' : ''}`}>
                  {seg.replace(/-/g, ' ')}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs text-slate-500 dark:text-gray-400">
            <Search className="w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search admin tools..."
              className="bg-transparent focus:outline-none w-32 focus:w-48 transition-all text-xs text-slate-900 dark:text-white"
            />
          </div>

          <ThemeToggle />

          <div className="h-5 w-px bg-slate-200 dark:bg-gray-800 hidden sm:block" />

          {/* Admin User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {userEmail || 'Administrator'}
              </div>
              <div className="flex items-center gap-1 justify-end">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#6D5BFF]/10 text-[#6D5BFF]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Sign Out Admin Session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-[#090D1E] border-r border-slate-200 dark:border-gray-800 flex flex-col justify-between overflow-y-auto transition-transform duration-300 ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-gray-500 uppercase">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? 'bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white shadow-md shadow-[#6D5BFF]/20'
                          : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400 dark:text-gray-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer status inside sidebar */}
          <div className="p-4 border-t border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-[#050816]/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>NeoMCQ Admin Core v3.0</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
              Zero Trust Protected Route Boundary
            </p>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
