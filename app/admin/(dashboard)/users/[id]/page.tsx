'use client';

import React, { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  ShieldAlert,
  Key,
  Loader2,
  CheckCircle,
  CreditCard,
  History,
  Activity,
  Ban,
  Check,
  Mail,
  Calendar,
  Globe,
  Phone,
  Layers,
} from 'lucide-react';
import { getAdminUserDetailAction, toggleUserSuspensionAction, resetUserPasswordAction } from '@/app/actions/admin';
import Link from 'next/link';

export default function AdminUserDetailPage() {
  const pathname = usePathname();
  const userId = pathname.split('/').pop();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Password reset modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');

  const loadUserDetail = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUserDetailAction(userId);
      setData(res);
    } catch (err: any) {
      console.error('Error fetching user detail:', err);
      setError(err.message || 'Failed to fetch user profile details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetail();
  }, [userId]);

  const handleToggleSuspension = async () => {
    if (!data?.auth?.id) return;
    setActionLoading(true);
    try {
      await toggleUserSuspensionAction(data.auth.id, !data.auth.isSuspended);
      await loadUserDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle suspension status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newPassword) return;
    setActionLoading(true);
    setResetErr('');
    setResetMsg('');
    try {
      const res = await resetUserPasswordAction(userId, newPassword);
      if (res?.error) {
        setResetErr(res.error);
      } else {
        setResetMsg('Password successfully updated.');
        setNewPassword('');
        setTimeout(() => {
          setIsResetOpen(false);
          setResetMsg('');
        }, 1200);
      }
    } catch (err: any) {
      setResetErr(err.message || 'Failed to update user password');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#6D5BFF]" />
        <span className="text-xs font-semibold">Fetching production user profile telemetry...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-500 font-bold text-sm">{error || 'User profile not found.'}</p>
        <Link href="/admin/users" className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold inline-block">
          Return to User Directory
        </Link>
      </div>
    );
  }

  const { profile, auth, roles, learning, subscription, payments, activity } = data;

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                {profile.first_name || 'System'} {profile.last_name || 'User'}
              </h1>
              {auth.isSuspended ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
              <span>{profile.email}</span>
              <span className="text-slate-300 dark:text-gray-700">•</span>
              <span className="font-mono text-[11px]">{profile.id}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResetOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 text-xs font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>

          <button
            disabled={actionLoading}
            onClick={handleToggleSuspension}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              auth.isSuspended
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            {auth.isSuspended ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Reactivate User</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Suspend Account</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Questions Solved</div>
          <div className="text-2xl font-black text-[#6D5BFF]">{learning.stats.questionsSolved}</div>
          <div className="text-[10px] text-slate-400">Across active study sessions</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Accuracy Index</div>
          <div className="text-2xl font-black text-emerald-500">{learning.stats.accuracy}%</div>
          <div className="text-[10px] text-slate-400">Average score efficiency</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Study Time</div>
          <div className="text-2xl font-black text-amber-500">{learning.stats.studyTimeMins} Mins</div>
          <div className="text-[10px] text-slate-400">Logged preparation time</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Subscription Tier</div>
          <div className="text-lg font-black text-indigo-400 uppercase truncate">
            {subscription?.subscription_plans?.name || 'Free Tier'}
          </div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">
            Status: {subscription?.status || 'Free'}
          </div>
        </div>
      </div>

      {/* Profile Details & Learning Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6D5BFF]" />
            <span>Profile & Auth Security Context</span>
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Email Address</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {profile.email}
                {auth.emailConfirmed ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold">
                    Verified
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold">
                    Unverified
                  </span>
                )}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Country / Region</span>
              <span className="font-bold text-slate-900 dark:text-white">{profile.country || 'Global'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Account Created</span>
              <span className="font-mono text-slate-700 dark:text-gray-300">
                {new Date(profile.created_at).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Last Sign-In</span>
              <span className="font-mono text-slate-700 dark:text-gray-300">
                {auth.lastSignInAt ? new Date(auth.lastSignInAt).toLocaleString() : 'Never'}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-gray-800">
              <span className="text-slate-500">Assigned Roles</span>
              <div className="flex flex-wrap gap-1">
                {roles.map((r: any) => (
                  <span key={r.name} className="px-2 py-0.5 rounded bg-[#6D5BFF]/10 text-[#6D5BFF] text-[10px] font-bold uppercase">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Exam / Learning Context */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#6D5BFF]" />
            <span>Active Learning Catalog Context</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Target Exam</div>
              <div className="text-base font-black text-[#6D5BFF]">
                {learning.exam?.name || 'No Exam Selected'}
              </div>
              {learning.exam?.code && (
                <div className="text-[10px] font-mono text-slate-400">Code: {learning.exam.code}</div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Exam Locks & Switches</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Exam Locked:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {profile.exam_locked ? 'Yes (Locked)' : 'No (Unlocked)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Switch Count:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {profile.exam_switch_count || 0} times
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#6D5BFF]" />
          <span>Payment & Exam Switch Transactions</span>
        </h2>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">No recorded transactions for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900 font-bold text-slate-500 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-3">Reference / ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30">
                    <td className="p-3 font-mono text-[11px] text-slate-900 dark:text-white">{p.id}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-indigo-400">{p.type || 'Payment'}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      ${p.amount} {p.currency?.toUpperCase() || 'USD'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[10px]">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Log Activity Stream for this user */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <History className="w-4 h-4 text-[#6D5BFF]" />
          <span>User Audit Activity Log Trail</span>
        </h2>

        {activity.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">No recorded audit log events for this user.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((act: any) => (
              <div
                key={act.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#6D5BFF] mr-2">[{act.action}]</span>
                  <span className="font-mono text-[10px] text-slate-500">{JSON.stringify(act.details || {})}</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {new Date(act.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <h3 className="font-heading font-black text-lg">Reset Password for {profile.first_name}</h3>

            {resetErr && <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 text-xs font-semibold">{resetErr}</div>}
            {resetMsg && <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 text-xs font-semibold">{resetMsg}</div>}

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold text-xs"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
