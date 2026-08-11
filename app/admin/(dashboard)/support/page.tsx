'use client';

import React, { useState, useEffect } from 'react';
import {
  Loader2,
  UserCheck,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  getAllUsersAction,
  createSupportAccountAction,
  toggleSupportRoleAction,
} from '@/app/actions/admin';

export default function AdminSupportStaffPage() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [supportAccounts, setSupportAccounts] = useState<any[]>([]);
  const [newSupportForm, setNewSupportForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [supportFormError, setSupportFormError] = useState<string | null>(null);
  const [supportFormSuccess, setSupportFormSuccess] = useState(false);

  useEffect(() => {
    const loadSupportStaff = async () => {
      setLoading(true);
      try {
        const allUsers = await getAllUsersAction();
        const reps = allUsers.filter((u) => u.roles?.includes('support') || u.roles?.includes('admin'));
        setSupportAccounts(reps);
      } catch (err) {
        console.error('Error fetching support staff list:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSupportStaff();
  }, [refreshKey]);

  const handleCreateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportFormError(null);
    setSupportFormSuccess(false);

    if (!newSupportForm.email || !newSupportForm.password || !newSupportForm.firstName || !newSupportForm.lastName) {
      setSupportFormError('Please supply all support staff profile details.');
      return;
    }

    try {
      const res = await createSupportAccountAction(newSupportForm);
      if (res.error) {
        setSupportFormError(res.error);
      } else {
        setSupportFormSuccess(true);
        setNewSupportForm({ email: '', password: '', firstName: '', lastName: '' });
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err: any) {
      setSupportFormError(err.message || 'Internal transmission exception');
    }
  };

  const handleRemoveSupportRole = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke Support credentials for this member?')) return;
    try {
      const res = await toggleSupportRoleAction(userId, false);
      if (res.error) {
        alert(res.error);
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400 min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#6D5BFF]">
          Synchronizing Support Staff list...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#6D5BFF]" />
            <span>Support & Administration Staff</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Promote platform users, create official support representatives, and assign organizational roles.
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((prev) => prev + 1)}
          className="px-4 py-2 bg-slate-900 border border-slate-800 text-xs font-bold rounded-xl text-slate-300 hover:text-white flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#6D5BFF]" />
          <span>Refresh Staff List</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Support accounts list */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-black text-white">Active Representatives</h3>

          <div className="space-y-3">
            {supportAccounts.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] flex items-center justify-center font-bold text-xs">
                    {rep.firstName ? rep.firstName[0] : 'S'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{rep.firstName} {rep.lastName}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{rep.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {rep.roles?.map((role: string) => (
                      <span key={role} className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                        {role}
                      </span>
                    ))}
                  </div>

                  {rep.roles?.includes('support') && !rep.roles?.includes('admin') && (
                    <button
                      onClick={() => handleRemoveSupportRole(rep.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Revoke Credentials"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {supportAccounts.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs font-semibold">
                No support or admin representatives recorded.
              </div>
            )}
          </div>
        </div>

        {/* Create support staff credential */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-[#090d1a] border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-black text-white">Issue Official Credentials</h3>

          {supportFormError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{supportFormError}</span>
            </div>
          )}

          {supportFormSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Support staff account initialized successfully.</span>
            </div>
          )}

          <form onSubmit={handleCreateSupport} className="space-y-3.5 text-xs font-bold text-slate-400">
            <div className="space-y-1">
              <label>First Name</label>
              <input
                type="text"
                required
                value={newSupportForm.firstName}
                onChange={(e) => setNewSupportForm({ ...newSupportForm, firstName: e.target.value })}
                placeholder="e.g., Jane"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium placeholder-slate-600 focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div className="space-y-1">
              <label>Last Name</label>
              <input
                type="text"
                required
                value={newSupportForm.lastName}
                onChange={(e) => setNewSupportForm({ ...newSupportForm, lastName: e.target.value })}
                placeholder="e.g., Doe"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium placeholder-slate-600 focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div className="space-y-1">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={newSupportForm.email}
                onChange={(e) => setNewSupportForm({ ...newSupportForm, email: e.target.value })}
                placeholder="support@neomcq.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium placeholder-slate-600 focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <div className="space-y-1">
              <label>Password</label>
              <input
                type="password"
                required
                value={newSupportForm.password}
                onChange={(e) => setNewSupportForm({ ...newSupportForm, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium placeholder-slate-600 focus:outline-none focus:border-[#6D5BFF]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#6D5BFF] text-white text-xs font-black hover:bg-[#5b4be6] transition-colors"
            >
              Provision Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
