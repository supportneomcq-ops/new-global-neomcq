'use client';

import React, { useState } from 'react';
import { OnboardingData } from './onboarding-flow';
import { UserProfileModal } from './user-profile-modal';
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
import { WeaknessRadarView } from './learning-workspace/weakness-radar-view';
import { TopicPreparationModal } from './learning-workspace/topic-preparation-modal';

interface DashboardViewProps {
  user: OnboardingData;
  onSignOut: () => void;
  onOpenPractice: () => void;
}

export function DashboardView({ user, onSignOut, onOpenPractice }: DashboardViewProps) {
  const [completedHours, setCompletedHours] = useState<number>(1.5);
  const [streakDays, setStreakDays] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [studySubTab, setStudySubTab] = useState<StudySubTab>('notes');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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

  const { fetchTopicContent } = useTopicContent();

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. Unified Workspace Header */}
      <WorkspaceHeader
        user={user}
        streakDays={streakDays}
        completedHours={completedHours}
        onSignOut={onSignOut}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenExamSwitch={() => setIsExamSwitchModalOpen(true)}
        onOpenAddTopic={() => setIsAddTopicModalOpen(true)}
        onOpenDiscoverExam={() => setIsCreateStudyModalOpen(true)}
      />

      {/* 2. Workspace Body (Sidebar + Content Canvas) */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop / Tablet Sidebar */}
        <WorkspaceSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
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
            />
          )}

          {activeTab === 'study' && (
            <StudyHubView user={user} initialSubTab={studySubTab} />
          )}

          {activeTab === 'tutor' && (
            <AiTutorWhiteboardView user={user} />
          )}

          {activeTab === 'radar' && (
            <WeaknessRadarView user={user} onSelectTab={handleSelectTab} />
          )}
        </main>
      </div>

      {/* 3. Floating Mobile Bottom Nav */}
      <WorkspaceMobileNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* 4. Interactive Modals */}
      {isProfileOpen && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
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
              fetchTopicContent({
                exam_id: selection.exam.id,
                subject_id: subject.id,
                topic_id: topic.id,
                exam_name: selection.exam.name,
                subject_name: subject.name,
                topic_name: topic.name,
              });
            }
          }}
        />
      )}

      {isCreateStudyModalOpen && (
        <CreateStudyModal
          isOpen={isCreateStudyModalOpen}
          onClose={() => setIsCreateStudyModalOpen(false)}
          onExamCreated={async (newExamId, examName) => {
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
