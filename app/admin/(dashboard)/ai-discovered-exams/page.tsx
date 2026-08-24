'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Award,
  ExternalLink,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function AIDiscoveredExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAIDiscoveredExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai-discovered-exams');
      const data = await res.json();
      if (data.success) {
        setExams(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching AI discovered exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIDiscoveredExams();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string, promoteToPlatform: boolean = false) => {
    try {
      setUpdatingId(id);
      const res = await fetch('/api/admin/ai-discovered-exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          verification_status: newStatus,
          promote_to_platform: promoteToPlatform,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAIDiscoveredExams();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating record');
    } fontFinally: {
      setUpdatingId(null);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.raw_exam_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.canonical_exam_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.authority_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.countries?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || e.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 p-6 text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF] border border-[#6D5BFF]/20">
            <Sparkles className="w-3.5 h-3.5" /> AI Exam Discovery Engine Audit
          </div>
          <h1 className="text-2xl font-heading font-black mt-1">AI Discovered Exams Catalog</h1>
          <p className="text-xs text-slate-500 dark:text-gray-400">
            Audit user-requested and AI-discovered examinations across all global jurisdictions.
          </p>
        </div>

        <button
          onClick={fetchAIDiscoveredExams}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam, authority, country..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs focus:outline-none focus:border-[#6D5BFF]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-bold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="verified">Verified & Promoted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0E1324] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#6D5BFF]" />
            <span>Loading AI discovered exams...</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No AI discovered exams found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200 dark:border-gray-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Country & Flag</th>
                  <th className="p-4">Raw User Query</th>
                  <th className="p-4">Canonical AI Exam Name</th>
                  <th className="p-4">Conducting Authority</th>
                  <th className="p-4">Confidence</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="p-4 font-bold flex items-center gap-2">
                      <span className="text-base">{exam.countries?.flag_emoji || '🌍'}</span>
                      <span>{exam.countries?.name || 'Global'}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-gray-300">
                      "{exam.raw_exam_name}"
                    </td>
                    <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                      {exam.canonical_exam_name}
                      {exam.short_name && (
                        <span className="ml-1.5 text-[10px] font-bold text-[#6D5BFF] dark:text-[#00D4FF]">
                          ({exam.short_name})
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {exam.authority_name || 'N/A'}
                    </td>
                    <td className="p-4 font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF]">
                        {Math.round((exam.confidence_score || 0.95) * 100)}%
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      {exam.verification_status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Verified Platform Exam
                        </span>
                      ) : exam.verification_status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {exam.verification_status !== 'verified' && (
                        <button
                          disabled={updatingId === exam.id}
                          onClick={() => handleUpdateStatus(exam.id, 'verified', true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Approve & Promote
                        </button>
                      )}
                      {exam.verification_status !== 'rejected' && (
                        <button
                          disabled={updatingId === exam.id}
                          onClick={() => handleUpdateStatus(exam.id, 'rejected', false)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
