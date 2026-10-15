'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { OnboardingData } from '@/components/onboarding-flow';
import { DashboardView } from '@/components/dashboard-view';
import { FuturisticLoader } from '@/components/futuristic-loader';
import { stopGlobalLoading } from '@/components/global-loading-provider';

const STORAGE_KEY = 'neomcq_user_session';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<OnboardingData | null>(null);
  const [curriculumStatus, setCurriculumStatus] = useState<'pending' | 'needs_retry' | null>(null);
  const [retryingCurriculum, setRetryingCurriculum] = useState(false);
  const [curriculumRetryError, setCurriculumRetryError] = useState('');

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const initialCurriculumStatus = user.user_metadata?.neo_curriculum_status;
          if (initialCurriculumStatus === 'pending' || initialCurriculumStatus === 'needs_retry') {
            setCurriculumStatus(initialCurriculumStatus);
            setLoading(false);
            stopGlobalLoading();
            return;
          }

          // 1. Fetch profile details
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          let profileCountry = '';
          if (profile?.country_id) {
            const { data: countryRecord } = await supabase
              .from('countries')
              .select('name')
              .eq('id', profile.country_id)
              .maybeSingle();
            profileCountry = countryRecord?.name || '';
          }

          let profileLanguage = 'English (US/UK)';
          if (profile?.language_id) {
            const { data: languageRecord } = await supabase
              .from('languages')
              .select('name')
              .eq('id', profile.language_id)
              .maybeSingle();
            profileLanguage = languageRecord?.name || profileLanguage;
          }

          // 2. Fetch the user's selected exam. A user can have historical exam links,
          // so never use maybeSingle() across all links without limiting/filtering.
          let userExamQuery = supabase
            .from('user_exams')
            .select('*, exams(*)')
            .eq('user_id', user.id);
          if (profile?.current_exam_id) {
            userExamQuery = userExamQuery.eq('exam_id', profile.current_exam_id);
          }
          const { data: userExam } = await userExamQuery.limit(1).maybeSingle();

          // 3. Fetch study preferences
          const { data: studyPref } = await supabase
            .from('study_preferences')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          const examDateStr = (userExam as any)?.target_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          // Calendar date math with 00:00 midnight normalization
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const targetDate = new Date(examDateStr);
          targetDate.setHours(0, 0, 0, 0);
          const diffTime = targetDate.getTime() - todayDate.getTime();
          const daysLeftVal = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

          const fullUser: OnboardingData = {
            userId: user.id,
            firstName: profile?.first_name || user.email?.split('@')[0] || 'Learner',
            lastName: profile?.last_name || '',
            email: user.email || '',
            phone: profile?.phone || '',
            countryCode: '',
            country: profileCountry,
            language: profileLanguage,
            examName: (userExam as any)?.exams?.name || 'Not Selected',
            examDate: examDateStr,
            daysLeft: daysLeftVal,
            weeksLeft: Math.ceil(daysLeftVal / 7),
            monthsLeft: Math.ceil(daysLeftVal / 30),
            learningStyle: (studyPref?.learning_mode === 'rapid' || studyPref?.learning_mode === 'Rapid Learning') ? 'Rapid Learning' : 'Balanced Study',
            studyHours: studyPref?.daily_hours || 2,
            studyTime: studyPref?.preferred_time ? (studyPref.preferred_time.charAt(0).toUpperCase() + studyPref.preferred_time.slice(1) as any) : 'Morning',
            studyGoals: ['Pass Exam', 'High Score'],
          };

          setCurrentUser(fullUser);

        } else {
          // No user, middleware should catch but we double guard
          router.push('/auth/sign-in');
        }
      } catch (err) {
        console.error('Error loading dashboard session:', err);
        router.push('/auth/sign-in');
      } finally {
        setLoading(false);
        stopGlobalLoading();
      }
    };

    fetchSessionAndProfile();
  }, [router]);

  useEffect(() => {
    if (!curriculumStatus) return;

    const checkCurriculumStatus = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const status = user?.user_metadata?.neo_curriculum_status;
        if (status === 'ready') {
          window.location.reload();
          return;
        }
        if (status === 'needs_retry') setCurriculumStatus('needs_retry');
        if (status === 'pending') setCurriculumStatus('pending');
      } catch (error) {
        console.warn('Could not refresh curriculum validation status:', error);
      }
    };

    const intervalId = window.setInterval(() => { void checkCurriculumStatus(); }, 4000);
    void checkCurriculumStatus();
    return () => window.clearInterval(intervalId);
  }, [curriculumStatus]);

  const handleRetryCurriculum = async () => {
    setRetryingCurriculum(true);
    setCurriculumRetryError('');
    try {
      const response = await fetch('/api/curriculum/retry', { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setCurriculumRetryError(result?.error || 'We could not retry curriculum validation right now.');
        return;
      }
      window.location.reload();
    } catch {
      setCurriculumRetryError('We could not connect to curriculum validation. Please try again.');
    } finally {
      setRetryingCurriculum(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE_KEY);
      router.push('/auth/sign-in');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return <FuturisticLoader onComplete={() => {}} />;
  }

  if (curriculumStatus) {
    const needsRetry = curriculumStatus === 'needs_retry';
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-5 text-slate-900 dark:bg-[#060914] dark:text-slate-100">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-[#0E1324] sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            {needsRetry ? <span className="text-2xl">!</span> : <span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 dark:border-violet-900 dark:border-t-violet-300" />}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {needsRetry ? 'Curriculum validation needs another attempt' : 'Validating your exam curriculum'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            {needsRetry
              ? 'Your account is saved, but we could not finish validating the syllabus yet. Your study workspace will open once the curriculum is successfully checked.'
              : 'Your account is ready. NeoMCQ is checking the exam-specific subjects, topics, and subtopics in the background. This page will update automatically when validation is complete.'}
          </p>
          {!needsRetry && <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">You can keep this page open; there is no need to start setup again.</p>}
          {needsRetry && (
            <>
              {curriculumRetryError && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{curriculumRetryError}</p>}
              <button
                type="button"
                disabled={retryingCurriculum}
                onClick={() => { void handleRetryCurriculum(); }}
                className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryingCurriculum ? 'Retrying validation…' : 'Retry curriculum validation'}
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardView
      user={currentUser}
      onSignOut={handleSignOut}
      onOpenPractice={() => { router.push('/exams'); }}
      onUpdateProfile={(updated) => {
        setCurrentUser((current) => current ? { ...current, ...updated } : current);
      }}
    />
  );
}
