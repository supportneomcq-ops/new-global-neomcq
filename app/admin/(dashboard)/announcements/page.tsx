'use client';

import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  Send,
  AlertCircle,
  Megaphone,
} from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('published');
  const [targetAudience, setTargetAudience] = useState('All Platform Users');
  const [scheduledAt, setScheduledAt] = useState('');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      const json = await res.json();
      if (json.success) {
        setAnnouncements(json.announcements || []);
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          status,
          target_audience: targetAudience,
          scheduled_at: scheduledAt || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setTitle('');
        setMessage('');
        loadAnnouncements();
      } else {
        alert(json.error || 'Failed to create announcement');
      }
    } catch (err) {
      console.error('Create announcement error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        loadAnnouncements();
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'published':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Published</span>;
      case 'scheduled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20">Scheduled</span>;
      case 'draft':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-500 border border-blue-500/20">Draft</span>;
      case 'archived':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">Archived</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#6D5BFF]" />
            <span>Platform Announcements & Global Banners</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Publish site-wide popups, exam updates, feature launches, and promotional campaign banners.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="p-2.5 px-4 rounded-2xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white transition-colors flex items-center gap-2 text-xs font-bold shadow-lg shadow-[#6D5BFF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 font-bold">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
            <span>Loading announcements...</span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 font-bold bg-white dark:bg-[#090D1E] rounded-3xl border border-slate-200 dark:border-gray-800">
            No announcements created yet.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(a.status)}
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    {a.target_audience}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                  {a.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                  {a.message}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between text-xs font-medium text-slate-400">
                <div>
                  Created: {new Date(a.created_at).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem(a)}
                    className="p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-[#6D5BFF] hover:text-white transition-colors font-bold text-[11px] flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  {a.status === 'published' ? (
                    <button
                      onClick={() => handleUpdateStatus(a.id, 'archived')}
                      className="p-1.5 px-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors font-bold text-[11px] flex items-center gap-1"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(a.id, 'published')}
                      className="p-1.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors font-bold text-[11px] flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Now</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Create Platform Announcement</h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NeoMCQ 3.0 Platform Launch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Full announcement content..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="scheduled">Schedule</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white"
                  >
                    <option value="All Platform Users">All Platform Users</option>
                    <option value="NEET Aspirants">NEET Aspirants</option>
                    <option value="INICET Aspirants">INICET Aspirants</option>
                    <option value="Pro Pass Subscribers">Pro Pass Subscribers</option>
                    <option value="Free Tier Users">Free Tier Users</option>
                  </select>
                </div>
              </div>

              {status === 'scheduled' && (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-[#6D5BFF] text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

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
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] hover:bg-[#5b49ff] text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Save Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6D5BFF] uppercase tracking-wider">
              <Megaphone className="w-4 h-4" />
              <span>Live User Announcement Preview</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">{previewItem.title}</h2>
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">{previewItem.message}</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
