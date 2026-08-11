'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Filter, Shield, User, Clock, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getUserActivitiesAction } from '@/app/actions/admin';
import Link from 'next/link';

export default function UserActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState('all');

  const loadActivities = async () => {
    setLoading(true);
    try {
      const res = await getUserActivitiesAction({
        page,
        pageSize,
        search,
        activityType,
      });
      setActivities(res.logs || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Failed to load user activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [page, activityType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadActivities();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <History className="w-6 h-6 text-[#6D5BFF]" />
            <span>User Activity & Audit Stream</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Real-time security logs, action histories, system events, and user activity traces.
          </p>
        </div>

        <button
          onClick={loadActivities}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors w-fit"
          title="Refresh Activity Log"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity, or user details..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Action Type:</span>
          </div>

          <select
            value={activityType}
            onChange={(e) => {
              setActivityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="all">All Action Types</option>
            <option value="USER_SIGNIN">User Sign In</option>
            <option value="EXAM_UPDATED">Exam Preference Updated</option>
            <option value="PERMISSION_TOGGLED">Permission Toggled</option>
            <option value="USER_ROLE_CHANGED">Role Modified</option>
            <option value="SUPPORT_ROLE_TOGGLED">Support Role Toggled</option>
            <option value="USER_SUSPENSION_TOGGLED">Suspension Status</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5BFF]" />
            <span>Fetching activity log records...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/60 font-bold text-slate-600 dark:text-gray-300 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User / Actor</th>
                  <th className="p-4">Action Performed</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No matching activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => {
                    const userMeta = act.profiles;
                    const actorName = userMeta ? `${userMeta.first_name || ''} ${userMeta.last_name || ''}`.trim() || userMeta.email : act.user_id || 'System';

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(act.created_at).toLocaleString()}
                          </div>
                        </td>

                        <td className="p-4">
                          <Link href={`/admin/users/${act.user_id}`} className="hover:underline">
                            <div className="font-bold text-slate-900 dark:text-white">{actorName}</div>
                            {userMeta?.email && (
                              <div className="text-[10px] text-slate-400">{userMeta.email}</div>
                            )}
                          </Link>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                            {act.action}
                          </span>
                        </td>

                        <td className="p-4 text-slate-700 dark:text-gray-300 font-mono text-[11px]">
                          {act.entity_type}: {act.entity_id ? `${act.entity_id.substring(0, 8)}...` : 'N/A'}
                        </td>

                        <td className="p-4">
                          <div className="max-w-md overflow-hidden text-ellipsis font-mono text-[10px] p-2 rounded-xl bg-slate-50 dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-800">
                            {JSON.stringify(act.details || {})}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{activities.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-gray-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
