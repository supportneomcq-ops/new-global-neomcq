'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ArrowRight,
  Filter,
  UserCheck,
  Plus,
  MessageSquare,
  Send,
  X,
  Loader2,
  Check,
  Shield,
} from 'lucide-react';
import { createSupportAccountAction } from '@/app/actions/admin';

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [supportStaff, setSupportStaff] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    open: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  // Selected Ticket Modal State
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketStatus, setTicketStatus] = useState('');
  const [ticketPriority, setTicketPriority] = useState('');
  const [ticketResponse, setTicketResponse] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');

  // Support Staff Provision Modal
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPassword, setSupportPassword] = useState('');
  const [supportFirstName, setSupportFirstName] = useState('');
  const [supportLastName, setSupportLastName] = useState('');
  const [provisionError, setProvisionError] = useState('');
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  const loadSupportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: selectedStatus,
        priority: selectedPriority,
      });
      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.tickets || []);
        setSupportStaff(json.supportStaff || []);
        if (json.metrics) {
          setMetrics(json.metrics);
        }
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportData();
  }, [search, selectedStatus, selectedPriority]);

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    setActionLoading(true);
    setUpdateMsg('');

    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: activeTicket.id,
          status: ticketStatus,
          priority: ticketPriority,
          responseMessage: ticketResponse,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setUpdateMsg('Ticket successfully updated.');
        await loadSupportData();
        setTimeout(() => {
          setActiveTicket(null);
          setUpdateMsg('');
        }, 1200);
      } else {
        alert(json.error || 'Failed to update ticket');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating support ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProvisionSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setProvisionError('');
    setProvisionSuccess(false);

    try {
      const res = await createSupportAccountAction({
        email: supportEmail,
        password: supportPassword,
        firstName: supportFirstName,
        lastName: supportLastName,
      });

      if (res?.error) {
        setProvisionError(res.error);
      } else {
        setProvisionSuccess(true);
        setSupportEmail('');
        setSupportPassword('');
        setSupportFirstName('');
        setSupportLastName('');
        await loadSupportData();
        setTimeout(() => {
          setIsProvisionOpen(false);
          setProvisionSuccess(false);
        }, 1200);
      }
    } catch (err: any) {
      setProvisionError(err.message || 'Failed to provision support staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (st: string) => {
    const s = (st || '').toLowerCase();
    if (s === 'open') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">Open</span>;
    }
    if (s === 'in_progress' || s === 'in progress') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>;
    }
    if (s === 'pending') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">Pending</span>;
    }
    if (s === 'resolved') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/20">{st || 'Closed'}</span>;
  };

  const getPriorityBadge = (p: string) => {
    const pr = (p || '').toLowerCase();
    if (pr === 'urgent') return <span className="text-[10px] font-black uppercase text-rose-500">Urgent</span>;
    if (pr === 'high') return <span className="text-[10px] font-black uppercase text-amber-500">High</span>;
    return <span className="text-[10px] font-black uppercase text-slate-400">Normal</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#6D5BFF]" />
            <span>Support Accounts & Helpdesk</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Manage real customer support tickets, provision support team accounts, and resolve user issues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSupportData}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors"
            title="Refresh Tickets"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsProvisionOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Support Staff</span>
          </button>
        </div>
      </div>

      {/* Real Metrics Cards from Database */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Open Tickets</div>
          <div className="text-2xl font-black text-blue-500">{metrics.open}</div>
          <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Awaiting Response</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">In Progress</div>
          <div className="text-2xl font-black text-amber-500">{metrics.inProgress}</div>
          <div className="text-[10px] text-amber-400 font-bold">Active Investigations</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Resolved Tickets</div>
          <div className="text-2xl font-black text-emerald-500">{metrics.resolved}</div>
          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Closed & Verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400">Support Staff Members</div>
          <div className="text-2xl font-black text-[#6D5BFF]">{supportStaff.length}</div>
          <div className="text-[10px] text-slate-400 font-bold">Assigned Support Agents</div>
        </div>
      </div>

      {/* Active Support Staff Roster */}
      {supportStaff.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="font-extrabold text-xs text-slate-700 dark:text-gray-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#6D5BFF]" />
            <span>Active Support Staff Members</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {supportStaff.map((agent: any) => (
              <div
                key={agent.id}
                className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 flex items-center gap-2 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#6D5BFF]/10 text-[#6D5BFF] font-black text-[10px] flex items-center justify-center">
                  {(agent.first_name?.[0] || agent.email?.[0] || 'S').toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                    {agent.first_name} {agent.last_name}
                  </div>
                  <div className="text-[9px] text-slate-400">{agent.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 w-full sm:w-80 text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search ticket #, email, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent focus:outline-none w-full text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none focus:border-[#6D5BFF]"
          >
            <option value="ALL">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl bg-white dark:bg-[#090D1E] border border-slate-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-gray-900/80 border-b border-slate-200 dark:border-gray-800 font-extrabold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">Ticket ID & Subject</th>
                <th className="p-4">User Details</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6D5BFF]" />
                    <span>Fetching support queue...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    No tickets currently recorded in database.
                  </td>
                </tr>
              ) : (
                tickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="font-mono text-[#6D5BFF] text-[11px]">{t.ticket_number || t.id.substring(0, 8)}</span>
                        <span>{t.subject || 'Support Request'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.message || t.description}</div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-gray-200">{t.user_email || 'User Inquiry'}</div>
                    </td>

                    <td className="p-4">{getPriorityBadge(t.priority)}</td>

                    <td className="p-4">{getStatusBadge(t.status)}</td>

                    <td className="p-4 text-slate-400 font-mono text-[10px]">
                      {t.updated_at ? new Date(t.updated_at).toLocaleString() : 'N/A'}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setActiveTicket(t);
                          setTicketStatus(t.status || 'open');
                          setTicketPriority(t.priority || 'normal');
                          setTicketResponse(t.admin_response || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#6D5BFF] text-white text-[10px] font-bold hover:bg-[#5b49f0] transition-colors cursor-pointer"
                      >
                        Manage Ticket
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Resolution Modal Drawer */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-black text-[#6D5BFF]">
                  Ticket #{activeTicket.ticket_number || activeTicket.id.substring(0, 8)}
                </span>
                <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  {activeTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400">User Inquiry ({activeTicket.user_email}):</div>
              <p className="text-slate-700 dark:text-gray-300 leading-relaxed">{activeTicket.message || activeTicket.description}</p>
            </div>

            {updateMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 text-xs font-semibold">
                {updateMsg}
              </div>
            )}

            <form onSubmit={handleUpdateTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Status</label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Admin Response Note</label>
                <textarea
                  rows={3}
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  placeholder="Enter official resolution response or internal notes..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold text-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Support Staff Modal */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1324] rounded-3xl border border-slate-200 dark:border-gray-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-lg">Provision Support Staff Account</h3>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Create an operational support account with permission to manage ticket queues and user analytics.
            </p>

            {provisionError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{provisionError}</span>
              </div>
            )}

            {provisionSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Support staff provisioned successfully!</span>
              </div>
            )}

            <form onSubmit={handleProvisionSupport} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={supportFirstName}
                    onChange={(e) => setSupportFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={supportLastName}
                    onChange={(e) => setSupportLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Support Email</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support.agent@neomcq.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={supportPassword}
                  onChange={(e) => setSupportPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold text-xs"
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
