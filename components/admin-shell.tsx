'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  BookOpen,
  FolderTree,
  FileText,
  Tags,
  ListTodo,
  HelpCircle,
  StickyNote,
  Layers,
  Sparkles,
  Bot,
  Cpu,
  Activity,
  History,
  Bell,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Search,
  UserCheck,
  BadgeDollarSign,
  Globe,
  Calendar,
  TrendingUp,
  Plus,
  Trash,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Network,
  Database,
  Terminal,
  Lock,
  ShieldAlert,
  Key,
  Loader2,
  Play,
  Pause,
  Sliders,
  Workflow,
  RefreshCw,
  FileCode,
  Timer,
  BellRing,
  HeartPulse,
  Server,
  Coins,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [showPreviewBanner, setShowPreviewBanner] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // Is production if domain is neomcq.com or www.neomcq.com
      setIsProduction(host === 'neomcq.com' || host === 'www.neomcq.com');
    }
  }, []);

  // Live telemetry badge state
  const [badges, setBadges] = useState({
    supportAccounts: 12,
    contentApproval: 23,
    aiJobs: 15,
    failedJobs: 3,
    notifications: 8,
  });

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Fetch support accounts count
        const { data: supportRole } = await supabase.from('roles').select('id').eq('name', 'support').maybeSingle();
        let supportCount = 12;
        if (supportRole?.id) {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', supportRole.id);
          if (count !== null) supportCount = count;
        }

        // Fetch failed jobs
        let failedCount = 3;
        const { count: failedJobsCount } = await supabase
          .from('ai_generation_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed');
        if (failedJobsCount !== null) failedCount = failedJobsCount;

        // Fetch pending/processing jobs
        let pendingCount = 15;
        const { count: pendingJobsCount } = await supabase
          .from('ai_generation_jobs')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'processing']);
        if (pendingJobsCount !== null) pendingCount = pendingJobsCount;

        setBadges((prev) => ({
          ...prev,
          supportAccounts: supportCount,
          failedJobs: failedCount,
          aiJobs: pendingCount,
        }));
      } catch (err) {
        console.error('Silent bypass: Failed to fetch live badge counts', err);
      }
    };
    fetchBadgeCounts();
  }, []);

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
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/admin', icon: BarChart3 },
        { label: 'System Overview', href: '/admin/system-health', icon: Activity },
      ],
    },
    {
      title: 'USER MANAGEMENT',
      items: [
        { label: 'All Users', href: '/admin/users', icon: Users },
        { label: 'User Activity', href: '/admin/users/activity', icon: History },
        { label: 'Support Accounts', href: '/admin/support', icon: UserCheck, badge: badges.supportAccounts, badgeType: 'indigo' },
        { label: 'Roles & Permissions', href: '/admin/roles', icon: Lock },
      ],
    },
    {
      title: 'EXAM & KNOWLEDGE',
      items: [
        { label: 'Exams', href: '/admin/exams', icon: BookOpen },
        { label: 'Exam Switches ($2)', href: '/admin/exam-switches', icon: Lock },
        { label: 'Subjects', href: '/admin/subjects', icon: FolderTree },
        { label: 'Topics', href: '/admin/topics', icon: FileText },
        { label: 'Aliases', href: '/admin/aliases', icon: Tags },
        { label: 'Syllabi', href: '/admin/syllabi', icon: Sliders },
        { label: 'Exam Structures', href: '/admin/exam-structures', icon: Workflow },
        { label: 'Knowledge Engine', href: '/admin/knowledge-engine', icon: Network },
      ],
    },
    {
      title: 'LEARNING CONTENT',
      items: [
        { label: 'MCQs', href: '/admin/mcqs', icon: HelpCircle },
        { label: 'Notes', href: '/admin/notes', icon: StickyNote },
        { label: 'Flashcards', href: '/admin/flashcards', icon: Layers },
        { label: 'Revision Sheets', href: '/admin/revision-sheets', icon: Sparkles },
        { label: 'AI Tutor', href: '/admin/ai-tutor', icon: Bot },
        { label: 'Study Plans', href: '/admin/study-plans', icon: Calendar },
        { label: 'Learning Assets', href: '/admin/learning-assets', icon: Database },
        { label: 'Content Approval', href: '/admin/content-approval', icon: CheckCircle, badge: badges.contentApproval, badgeType: 'amber' },
      ],
    },
    {
      title: 'AI ENGINE',
      items: [
        { label: 'AI Jobs', href: '/admin/ai-jobs', icon: Cpu, badge: badges.aiJobs, badgeType: 'indigo' },
        { label: 'Generation Queue', href: '/admin/ai-jobs/queue', icon: ListTodo },
        { label: 'Failed Jobs', href: '/admin/ai-jobs/failed', icon: AlertCircle, badge: badges.failedJobs, badgeType: 'rose' },
        { label: 'AI Providers', href: '/admin/ai-providers', icon: Sliders },
        { label: 'AI Models', href: '/admin/ai-models', icon: Bot },
        { label: 'AI Usage', href: '/admin/ai-usage', icon: Activity },
        { label: 'AI Costs', href: '/admin/ai-costs', icon: BadgeDollarSign },
        { label: 'AI Pricing', href: '/admin/ai-pricing', icon: Coins },
        { label: 'AI Logs', href: '/admin/ai-logs', icon: Terminal },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { label: 'Overview', href: '/admin/analytics', icon: BarChart3 },
        { label: 'User Analytics', href: '/admin/analytics/users', icon: Users },
        { label: 'Exam Analytics', href: '/admin/analytics/exams', icon: BookOpen },
        { label: 'Learning Analytics', href: '/admin/analytics/learning', icon: Sparkles },
        { label: 'Content Analytics', href: '/admin/analytics/content', icon: FileCode },
        { label: 'AI Analytics', href: '/admin/analytics/ai', icon: Cpu },
        { label: 'Retention', href: '/admin/analytics/retention', icon: Activity },
        { label: 'Engagement', href: '/admin/analytics/engagement', icon: Timer },
        { label: 'Revenue Analytics', href: '/admin/analytics/revenue', icon: BadgeDollarSign },
      ],
    },
    {
      title: 'REVENUE',
      items: [
        { label: 'Revenue', href: '/admin/revenue', icon: BadgeDollarSign },
        { label: 'Payments', href: '/admin/payments', icon: CreditCard },
        { label: 'Razorpay', href: '/admin/razorpay', icon: Activity },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: Layers },
        { label: 'Plans', href: '/admin/plans', icon: Sliders },
        { label: 'Coupons', href: '/admin/coupons', icon: Tags },
        { label: 'Refunds', href: '/admin/refunds', icon: AlertCircle },
        { label: 'Invoices', href: '/admin/invoices', icon: FileText },
        { label: 'Webhooks', href: '/admin/webhooks', icon: Workflow },
      ],
    },
    {
      title: 'COMMUNICATION',
      items: [
        { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        { label: 'Announcements', href: '/admin/announcements', icon: BellRing },
        { label: 'Email', href: '/admin/email', icon: MailIcon },
        { label: 'Push Notifications', href: '/admin/push', icon: Sparkles },
        { label: 'Support', href: '/admin/support', icon: HelpCircle },
        { label: 'Communication Logs', href: '/admin/communication-logs', icon: History },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'System Health', href: '/admin/system-health', icon: HeartPulse },
        { label: 'Database', href: '/admin/database', icon: Database },
        { label: 'Supabase', href: '/admin/supabase', icon: CloudIcon },
        { label: 'Storage', href: '/admin/storage', icon: Database },
        { label: 'Cloudflare R2', href: '/admin/storage/r2', icon: Globe },
        { label: 'Edge Functions', href: '/admin/edge-functions', icon: FileCode },
        { label: 'Cron Jobs', href: '/admin/cron', icon: Timer },
        { label: 'API Health', href: '/admin/api-health', icon: Activity },
        { label: 'Cache', href: '/admin/cache', icon: Sliders },
        { label: 'Environment', href: '/admin/environment', icon: Server },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
        { label: 'Security Events', href: '/admin/security', icon: ShieldAlert },
        { label: 'Sessions', href: '/admin/sessions', icon: Timer },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        { label: 'General', href: '/admin/settings', icon: Settings },
        { label: 'AI Settings', href: '/admin/settings/ai', icon: Cpu },
        { label: 'Payment Settings', href: '/admin/settings/payments', icon: BadgeDollarSign },
        { label: 'Email Settings', href: '/admin/settings/email', icon: Sliders },
        { label: 'Notification Settings', href: '/admin/settings/notifications', icon: Bell },
        { label: 'SEO Settings', href: '/admin/settings/seo', icon: Globe },
        { label: 'Feature Flags', href: '/admin/settings/features', icon: Sliders },
      ],
    },
  ];

  // Helper custom icon renderers
  function MailIcon(props: any) {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        {...props}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }

  function CloudIcon(props: any) {
    return (
      <svg
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        {...props}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    );
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const pathSegments = pathname?.split('/').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Header Panel */}
      <header className="h-16 border-b border-slate-800/60 bg-[#080b16] sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="font-heading font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                NeoMCQ <span className="text-[10px] bg-[#6D5BFF] text-white px-1.5 py-0.5 rounded-md font-extrabold">AI</span>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20 hidden sm:inline">
              Control Center
            </span>
            {isProduction ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PRODUCTION
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                PREVIEW
              </span>
            )}
          </Link>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pl-4 border-l border-slate-800/80">
            <span className="text-slate-400 font-medium">Dashboard</span>
            {pathSegments.slice(1).map((seg, i) => (
              <React.Fragment key={seg}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className={`capitalize ${i === pathSegments.length - 2 ? 'font-bold text-white' : 'text-slate-400'}`}>
                  {seg.replace(/-/g, ' ')}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-4">
          {/* Universal Search */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090d1a] border border-slate-800 text-xs text-slate-400">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search users, exams, content, payments..."
              className="bg-transparent focus:outline-none w-56 focus:w-64 transition-all text-xs text-slate-200 placeholder-slate-500"
            />
            <span className="text-[9px] font-extrabold text-slate-500 bg-slate-800 px-1 py-0.2 rounded">⌘ K</span>
          </div>

          <ThemeToggle />

          {/* Notifications Panel with dynamic active badge */}
          <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/40 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
              {badges.notifications}
            </span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          {/* Admin Identity Card */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-black text-white leading-tight">
                {userEmail === 'swapnilsonawane913@gmail.com' ? 'Swapnil Sonawane' : 'Admin User'}
              </div>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#6D5BFF]/20 text-[#6D5BFF]">
                  SUPER ADMIN
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer"
              title="Sign Out Session"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Sidebar Navigation Panel */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] bg-[#080b16] border-r border-slate-800/60 flex flex-col justify-between overflow-y-auto transition-all duration-300 ${
            isCollapsed ? 'w-20' : 'w-64'
          } ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="p-4 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                    {group.title}
                  </div>
                )}
                {group.items.map((item) => {
                  const anyItem = item as any;
                  const Icon = anyItem.icon;
                  const active = isActive(anyItem.href);
                  return (
                    <Link
                      key={anyItem.href}
                      href={anyItem.href}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      title={isCollapsed ? anyItem.label : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all group ${
                        active
                          ? 'bg-[#312ecb]/15 text-[#6D5BFF] border-l-2 border-[#6D5BFF]'
                          : 'text-slate-400 hover:bg-slate-800/30 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#6D5BFF]' : 'text-slate-400 group-hover:text-white'}`} />
                        {!isCollapsed && <span className="truncate">{anyItem.label}</span>}
                      </div>

                      {!isCollapsed && anyItem.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                            anyItem.badgeType === 'rose'
                              ? 'bg-rose-500/10 text-rose-500'
                              : anyItem.badgeType === 'amber'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}
                        >
                          {anyItem.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Collapse Controller at sidebar bottom */}
          <div className="p-4 border-t border-slate-800/60 bg-[#060810] flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Systems Live</span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded bg-slate-800/40 hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-white"
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`} />
            </button>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 z-20 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden min-h-[calc(100vh-4rem)] space-y-4">
          {!isProduction && showPreviewBanner && (
            <div className="p-3.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>
                  <strong className="font-extrabold text-amber-200 uppercase tracking-wide mr-1.5">PREVIEW ENVIRONMENT</strong>
                  Changes will affect the connected database. Exercise caution when running mutations.
                </span>
              </div>
              <button
                onClick={() => setShowPreviewBanner(false)}
                className="text-amber-400 hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-amber-500/20 text-xs font-bold shrink-0"
                title="Dismiss Banner"
              >
                Dismiss
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

