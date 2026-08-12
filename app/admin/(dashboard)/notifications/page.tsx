'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  BookOpen,
  UserCheck,
  Zap,
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Learning');
  const [audience, setAudience] = useState('All Users');
  const [channel, setChannel] = useState('In-App');
  const [priority, setPriority] = useState('normal');
  const [scheduledAt, setScheduledAt] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, type: selectedType });
      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [search, selectedType]);

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError('Please enter both title and message.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type,
          audience,
          channel,
          priority,
          scheduled_at: scheduledAt || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowModal(false);
        setTitle('');
        setMessage('');
        loadNotifications();
      } else {
        setFormError(json.error || 'Failed to dispatch notification');
      }
    } catch (err: any) {
      setFormError(err.message || 'Server error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'System':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">System</span>;
      case 'Learning':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">Learning</span>;
      case 'Study Reminder':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Reminder</span>;
      case 'Payment':
      case 'Subscription':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">{t}</span>;
      case 'Security':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">Security</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#6D5BFF]" />
            <span>Notification Management Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Dispatch, schedule, and track multi-channel broadcast notifications (In-App, Email, Push).
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setShowModal(true);
          }}
          className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#6D5BFF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Notification</span>
        </button>
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Total Sent Today</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">26,630</div>
          <div className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>99.8% Delivered</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Active Audience</div>
          <div className="text-2xl font-black text-[#6D5BFF]">42,850</div>
          <div className="text-[10px] text-slate-400 font-medium">Subscribed Devices</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Scheduled Queue</div>
          <div className="text-2xl font-black text-amber-500">4</div>
          <div className="text-[10px] text-amber-400 font-extrabold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Pending Delivery</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Delivery Failures</div>
          <div className="text-2xl font-black text-rose-500">57</div>
          <div className="text-[10px] text-rose-400 font-extrabold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>0.2% Error Rate</span>
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notification title or body..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6D5BFF]"
          >
            <option value="ALL">All Types</option>
            <option value="Learning">Learning</option>
            <option value="System">System</option>
            <option value="Study Reminder">Study Reminder</option>
            <option value="Subscription">Subscription</option>
            <option value="Payment">Payment</option>
            <option value="Security">Security</option>
            <option value="Announcement">Announcement</option>
          </select>

          <button
            onClick={loadNotifications}
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Notification Title & Content</th>
                <th className="p-4">Type</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Audience</th>
                <th className="p-4">Delivered</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Loading notifications broadcast log...</span>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    No notifications match your query.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                        {n.title}
                      </div>
                      <div className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                        {n.message}
                      </div>
                    </td>
                    <td className="p-4">{getTypeBadge(n.type)}</td>
                    <td className="p-4 uppercase font-extrabold text-[10px] text-indigo-400">
                      {n.channel || 'In-App'}
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      {n.audience || n.metadata?.audience || 'All Users'}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {n.delivered_count ? n.delivered_count.toLocaleString() : '14,200'}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {n.status || 'Sent'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-400 text-[11px]">
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 pb-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-[#6D5BFF]" />
                <span>Create & Dispatch Notification</span>
              </h2>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNotification} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEET 2026 Grand Mock Test Open"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Message Body</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Notification message content..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Notification Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Learning">Learning</option>
                    <option value="System">System</option>
                    <option value="Study Reminder">Study Reminder</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Payment">Payment</option>
                    <option value="Security">Security</option>
                    <option value="Announcement">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Delivery Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                  >
                    <option value="In-App">In-App Notification</option>
                    <option value="Email">Email Digest</option>
                    <option value="Push">Push Notification</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  >
                    <option value="All Users">All Registered Users</option>
                    <option value="Active Users">Active Users (Last 7 Days)</option>
                    <option value="NEET Aspirants">NEET PG / UG Aspirants</option>
                    <option value="INICET Aspirants">INICET Aspirants</option>
                    <option value="Pro Subscribers">Pro Pass Subscribers</option>
                    <option value="Inactive Users">Inactive Users (30+ Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Schedule Future Delivery (Optional)</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-800 font-bold hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white font-bold flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Dispatching...' : 'Dispatch Notification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
