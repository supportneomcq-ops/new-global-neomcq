'use client';

import React, { useEffect, useState } from 'react';
import { Bookmark, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { OnboardingData } from './onboarding-flow';
import { UserProfileModal, type UserProfileTab } from './user-profile-modal';
import { ExamSwitchModal } from './exam-switch-modal';
import { AddTopicModal } from './add-topic-modal';
import { CreateStudyModal } from './create-study-modal';
import { useSelection } from '@/lib/context/selection-context';
import { useTopicContent } from '@/lib/context/topic-content-context';
import { WorkspaceTab, StudySubTab } from './learning-workspace/types';
import { WorkspaceHeader } from './learning-workspace/workspace-header';
import { WorkspaceSidebar } from './learning-workspace/workspace-sidebar';
import { WorkspaceMobileNav } from './learning-workspace/workspace-mobile-nav';
import { DashboardHomeView } from './learning-workspace/dashboard-home-view';
import { PracticeCbtView } from './learning-workspace/practice-cbt-view';
import { StudyHubView } from './learning-workspace/study-hub-view';
import { AiTutorWhiteboardView } from './learning-workspace/ai-tutor-whiteboard-view';
import { ActiveRecallWorkspaceView } from './active-recall/active-recall-workspace-view';
import { WeaknessRadarView } from './learning-workspace/weakness-radar-view';
import { StudyPlanWorkspaceView } from './learning-workspace/study-plan-workspace-view';
import { TopicPreparationModal } from './learning-workspace/topic-preparation-modal';
import { LearningContextBar } from './learning-workspace/learning-context-bar';

interface DashboardViewProps {
  user: OnboardingData;
  onSignOut: () => void;
  onOpenPractice: () => void;
  onUpdateProfile?: (updatedData: Partial<OnboardingData>) => void;
}

type SavedBookmark = {
  id: string;
  item_type: string;
  item_id: string;
  notes: string | null;
  created_at: string;
};

function SavedBookmarksView({ userId }: { userId?: string }) {
  const [items, setItems] = useState<SavedBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadBookmarks = async () => {
      setLoading(true);
      setError('');
      if (!userId) {
        setError('Your signed-in profile could not be identified. Please sign in again.');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/user/bookmarks?limit=100', { cache: 'no-store' });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) throw new Error(result?.error || 'Could not load saved items.');
        if (active) setItems((result.bookmarks || []) as SavedBookmark[]);
      } catch (err) {
        console.error('Unable to load saved bookmarks:', err);
        if (active) setError('Saved items could not be loaded. Please retry.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadBookmarks();
    return () => { active = false; };
  }, [userId, reloadToken]);

  const removeBookmark = async (id: string) => {
    if (!userId) return;
    setDeletingId(id);
    setError('');
    try {
      const response = await fetch('/api/user/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || 'Could not remove saved item.');
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Unable to remove saved bookmark:', err);
      setError('This saved item could not be removed. Please retry.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Your library</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Bookmarks</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review the questions and learning resources you have saved.</p>
        </div>
        <button type="button" onClick={() => setReloadToken((n) => n + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" /> Loading your bookmarks…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center dark:border-violet-800/70 dark:bg-slate-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
            <Bookmark className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">When you bookmark a question or learning resource, it will appear here for quick revision.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold capitalize text-violet-700 dark:bg-violet-950/70 dark:text-violet-200">{item.item_type.replace(/[_-]+/g, ' ')}</span>
                  <p className="mt-3 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">Item ID: {item.item_id}</p>
                  {item.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{item.notes}</p>}
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Saved {new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <button type="button" onClick={() => void removeBookmark(item.id)} disabled={deletingId === item.id} aria-label="Remove bookmark" className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300">
                  {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardView({ user, onSignOut, onOpenPractice, onUpdateProfile }: DashboardViewProps) {
  const [completedHours, setCompletedHours] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [studySubTab, setStudySubTab] = useState<StudySubTab>('notes');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<UserProfileTab>('profile');
  const [isExamSwitchModalOpen, setIsExamSwitchModalOpen] = useState(false);
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [isCreateStudyModalOpen, setIsCreateStudyModalOpen] = useState(false);

  // Selection & Topic Content Context
  const {
    selection,
    setSubject,
    setTopic,
    refreshHierarchy,
  } = useSelection();

  const { content, refreshTopicContent } = useTopicContent();

  const handleLogStudyTime = (hours: number) => {
    setCompletedHours((prev) => Math.min(Math.max(1, user.studyHours), +(prev + hours).toFixed(1)));
  };

  const handleSelectTab = (tab: WorkspaceTab, subTab?: StudySubTab) => {
    setActiveTab(tab);
    if (subTab) {
      setStudySubTab(subTab);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070B19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. Unified Workspace Header */}
      <WorkspaceHeader
        user={user}
        activeTab={activeTab}
        streakDays={streakDays}
        completedHours={completedHours}
        onSignOut={onSignOut}
        onOpenProfile={(tab) => {
          setProfileTab((tab as UserProfileTab) || 'profile');
          setIsProfileOpen(true);
        }}
        onSelectTab={handleSelectTab}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenExamSwitch={() => setIsExamSwitchModalOpen(true)}
        onOpenAddTopic={() => setIsAddTopicModalOpen(true)}
        onOpenDiscoverExam={() => setIsCreateStudyModalOpen(true)}
      />

      {/* 2. Workspace Body (Sidebar + Content Canvas) */}
      <div className="flex-1 flex w-full max-w-[1536px] mx-auto">
        {/* Desktop / Tablet Sidebar */}
        <WorkspaceSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          questionCount={content?.mcqs?.length}
          quizCount={content?.quiz_a?.length}
          flashcardCount={content?.flashcards?.length}
          user={user}
          onOpenExamSwitch={() => setIsExamSwitchModalOpen(true)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8 min-w-0 space-y-4 sm:space-y-6">
          {/* Unified Subject & Topic selection bar rendered across all learning tabs */}
          {activeTab !== 'dashboard' && activeTab !== 'radar' && activeTab !== 'plan' && activeTab !== 'saved' && (
            <LearningContextBar onShowClick={() => handleSelectTab('dashboard')} />
          )}

          {activeTab === 'dashboard' && (
            <DashboardHomeView
              user={user}
              streakDays={streakDays}
              completedHours={completedHours}
              onLogStudyTime={handleLogStudyTime}
              onSelectTab={handleSelectTab}
              onOpenAddTopic={() => setIsAddTopicModalOpen(true)}
              onOpenExamSwitch={() => setIsExamSwitchModalOpen(true)}
            />
          )}

          {activeTab === 'practice' && (
            <PracticeCbtView
              user={user}
              topicId={selection.topic?.id}
              topicName={selection.topic?.name}
              isQuizMode={false}
            />
          )}

          {activeTab === 'quizzes' && (
            <PracticeCbtView
              user={user}
              topicId={selection.topic?.id}
              topicName={selection.topic?.name}
              isQuizMode={true}
            />
          )}

          {activeTab === 'flashcards' && (
            <StudyHubView user={user} initialSubTab="flashcards" />
          )}

          {activeTab === 'blanks' && (
            <ActiveRecallWorkspaceView user={user} />
          )}

          {(activeTab === 'notes' || activeTab === 'sticky') && (
            <StudyHubView user={user} initialSubTab={activeTab === 'sticky' ? 'sticky' : studySubTab} />
          )}

          {activeTab === 'tutor' && (
            <AiTutorWhiteboardView user={user} />
          )}

          {activeTab === 'radar' && (
            <WeaknessRadarView user={user} onSelectTab={handleSelectTab} />
          )}

          {activeTab === 'plan' && (
            <StudyPlanWorkspaceView user={user} onSelectTab={handleSelectTab} />
          )}

          {activeTab === 'saved' && (
            <SavedBookmarksView userId={user.userId || user.id} />
          )}
        </main>
      </div>

      {/* 3. Floating Mobile Bottom Nav */}
      <WorkspaceMobileNav
        activeTab={activeTab}
        studySubTab={studySubTab}
        onSelectTab={handleSelectTab}
        onOpenSettings={() => setIsProfileOpen(true)}
      />

      {/* 4. Interactive Modals */}
      {isProfileOpen && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          initialTab={profileTab}
          onUpdateProfile={onUpdateProfile}
        />
      )}

      {isExamSwitchModalOpen && (
        <ExamSwitchModal
          isOpen={isExamSwitchModalOpen}
          onClose={() => setIsExamSwitchModalOpen(false)}
          currentExam={selection.exam}
          onSwitchSuccess={(newExam) => {
            setIsExamSwitchModalOpen(false);
            refreshHierarchy();
          }}
        />
      )}

      {isAddTopicModalOpen && (
        <AddTopicModal
          isOpen={isAddTopicModalOpen}
          onClose={() => setIsAddTopicModalOpen(false)}
          onTopicSelected={(subject, topic) => {
            setSubject(subject);
            setTopic(topic);
            setIsAddTopicModalOpen(false);
            if (selection.exam) {
              refreshTopicContent(true);
            }
          }}
        />
      )}

      {isCreateStudyModalOpen && (
        <CreateStudyModal
          isOpen={isCreateStudyModalOpen}
          onClose={() => setIsCreateStudyModalOpen(false)}
          onExamCreated={async (exam) => {
            setIsCreateStudyModalOpen(false);
            await refreshHierarchy();
          }}
        />
      )}

      {/* 5. Topic Knowledge Preparation Progress Stepper */}
      <TopicPreparationModal />
    </div>
  );
}
