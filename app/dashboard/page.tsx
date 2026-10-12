'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { OnboardingData } from '@/components/onboarding-flow';
import { DashboardView } from '@/components/dashboard-view';
import { FuturisticLoader } from '@/components/futuristic-loader';

const STORAGE_KEY = 'neomcq_user_session';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<OnboardingData | null>(null);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
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

          // Ensure every selected exam has a persisted, exam-specific study plan.
          // This also repairs older accounts whose curriculum was never generated.
          void fetch('/api/study-plans/current', { method: 'GET', cache: 'no-store' })
            .then(async (response) => {
              if (!response.ok && response.status !== 202) {
                console.warn('[Dashboard] Study plan setup is not ready yet:', response.status);
              }
            })
            .catch((error) => {
              console.warn('[Dashboard] Study plan setup could not start:', error);
            });
        } else {
          // No user, middleware should catch but we double guard
          router.push('/auth/sign-in');
        }
      } catch (err) {
        console.error('Error loading dashboard session:', err);
        router.push('/auth/sign-in');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();
  }, [router]);

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
