'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ArrowLeft,
  Send,
  Lock,
  User,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

export default function AdminSupportDetailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  // Form State
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Status & Priority State
  const [status, setStatus] = useState('In Progress');
  const [priority, setPriority] = useState('high');

  const loadTicketDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`);
      const json = await res.json();
      if (json.success) {
        setTicket(json.ticket);
        setMessages(json.messages || []);
        if (json.ticket) {
          setStatus(json.ticket.status || 'In Progress');
          setPriority(json.ticket.priority || 'high');
        }
      }
    } catch (err) {
      console.error('Error loading ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          is_internal: isInternalNote,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setReplyText('');
        setIsInternalNote(false);
        loadTicketDetails();
      } else {
        alert(json.error || 'Failed to post message');
      }
    } catch (err) {
      console.error('Post message error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMetadata = async (newStatus?: string, newPriority?: string) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus || status,
          priority: newPriority || priority,
        }),
      });

      const json = await res.json();
      if (json.success) {
        loadTicketDetails();
      }
    } catch (err) {
      console.error('Update metadata error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
        <span>Loading support ticket thread...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/support"
            className="p-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#6D5BFF] bg-[#6D5BFF]/10 px-2 py-0.5 rounded-md">
                {ticket?.ticket_number || ticketId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400">
                {ticket?.category || 'General Support'}
              </span>
            </div>
            <h1 className="text-xl font-heading font-black text-slate-900 dark:text-white mt-1">
              {ticket?.subject}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              handleUpdateMetadata(e.target.value, undefined);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              handleUpdateMetadata(undefined, e.target.value);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation Thread */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-gray-800 pb-3">
              <MessageSquare className="w-4 h-4 text-[#6D5BFF]" />
              <span>Support Conversation Thread</span>
            </h2>

            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border ${
                    m.is_internal
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : m.sender_type === 'admin'
                      ? 'bg-[#6D5BFF]/10 border-[#6D5BFF]/30 text-slate-100'
                      : 'bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{m.sender_name || m.sender_email}</span>
                      {m.is_internal && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Internal Admin Note</span>
                        </span>
                      )}
                      {!m.is_internal && m.sender_type === 'admin' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#6D5BFF]/20 text-[#6D5BFF]">
                          Official Support Reply
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handlePostMessage} className="pt-4 border-t border-slate-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400">
                  {isInternalNote ? 'Add Internal Note (Hidden from User)' : 'Reply to Customer'}
                </label>

                <button
                  type="button"
                  onClick={() => setIsInternalNote(!isInternalNote)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-colors ${
                    isInternalNote
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-100 dark:bg-gray-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>{isInternalNote ? 'Internal Mode ON' : 'Switch to Internal Note'}</span>
                </button>
              </div>

              <textarea
                rows={4}
                required
                placeholder={isInternalNote ? 'Write internal note for fellow admins...' : 'Type public reply to user...'}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className={`w-full p-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                  isInternalNote
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 placeholder-amber-400/50 focus:ring-1 focus:ring-amber-500'
                    : 'bg-slate-100 dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#6D5BFF]'
                }`}
              />

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                    isInternalNote
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                      : 'bg-[#6D5BFF] hover:bg-[#5b49ff] text-white shadow-[#6D5BFF]/20'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending...' : isInternalNote ? 'Save Internal Note' : 'Send Reply to User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Metadata Card */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 space-y-4 shadow-sm text-xs">
            <h3 className="font-black text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-gray-800 pb-2">
              Requester Information
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">User Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{ticket?.user_name || 'Dr. Anil Kumar'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                <span className="font-mono text-indigo-400 font-bold">{ticket?.user_email}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">User ID</span>
                <span className="font-mono text-slate-400">{ticket?.user_id || 'usr-101'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-gray-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Admin</span>
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#6D5BFF]" />
                <span>{ticket?.assigned_admin_email || 'support@neomcq.com'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
