'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { Users, ArrowLeft, BookOpen, Clock, Award, ShieldAlert, Key, Loader2, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminUserDetailPage() {
  const pathname = usePathname();
  const userId = pathname.split('/').pop();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [learningContext, setLearningContext] = useState<any | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const { data: r } = await supabase.from('user_roles').select('roles(name)').eq('user_id', userId);
        const { data: lc } = await supabase.from('user_learning_contexts').select('*').eq('user_id', userId).maybeSingle();

        setProfile(p);
        setUserRoles(r?.map((item: any) => item.roles?.name).filter(Boolean) || []);
        setLearningContext(lc);
      } catch (err) {
        console.error('Error fetching user detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
        <span>Loading profile context...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400 font-bold">User profile not found.</p>
        <Link href="/admin/users" className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold inline-block">
          Return to Users List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="p-2 rounded-xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Account Info</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-slate-900 dark:text-white">{profile.id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Country / Region</span>
              <span className="font-bold text-slate-900 dark:text-white">{profile.country || 'Global'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Assigned Roles</span>
              <div className="flex gap-1">
                {userRoles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded bg-[#6D5BFF]/10 text-[#6D5BFF] text-[10px] font-bold">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User-Specific Learning Context */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Selected Learning Context</h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
              <div className="text-[10px] text-slate-400 font-bold">Target Exam</div>
              <div className="text-sm font-black text-[#6D5BFF] mt-0.5">
                {learningContext?.selected_exam_id || profile.selected_exam || 'None Selected'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                <div className="text-[10px] text-slate-400 font-bold">Current Subject</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {learningContext?.selected_subject_id || profile.selected_subject || 'All Subjects'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                <div className="text-[10px] text-slate-400 font-bold">Active Topic</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {learningContext?.selected_topic_id || profile.selected_topic || 'All Topics'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
