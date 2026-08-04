'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  BookOpen,
  FileText,
  Cpu,
  DollarSign,
  BarChart3,
  HelpCircle,
  Settings,
  Search,
  Filter,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Sliders,
  Check,
  X
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'users' | 'exams' | 'jobs' | 'revenue' | 'analytics' | 'support' | 'system'
  >('users');

  // Search & Filter state for Users tab
  const [userSearch, setUserSearch] = useState('');
  const [mockUsers, setMockUsers] = useState([
    { id: 'usr_1', name: 'Dr. Sarah Connor', email: 'sarah@med.edu', exam: 'USMLE Step 1', country: 'United States', status: 'Active', hours: '142 hrs' },
    { id: 'usr_2', name: 'Rahul Sharma', email: 'rahul@aiims.ac.in', exam: 'NEET PG', country: 'India', status: 'Active', hours: '98 hrs' },
    { id: 'usr_3', name: 'James Wilson', email: 'j.wilson@nhs.uk', exam: 'PLAB 1', country: 'United Kingdom', status: 'Suspended', hours: '45 hrs' },
    { id: 'usr_4', name: 'Aisha Patel', email: 'aisha@sydney.edu.au', exam: 'AMC MCQ', country: 'Australia', status: 'Active', hours: '112 hrs' },
  ]);

  // System Flags
  const [featureFlags, setFeatureFlags] = useState({
    maintenanceMode: false,
    aiModelVersion: 'gemini-3.5-flash',
    cacheEngine: true,
    razorpayWebhook: true,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-6xl h-[90vh] bg-white dark:bg-[#090D1E] rounded-3xl border border-slate-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Top Admin Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#050816]/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-black">NeoMCQ Production Control Center</h2>
                <div className="text-xs text-slate-500 dark:text-[#A6ADC8]">Admin & System Operations Engine</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-200 dark:border-gray-800 overflow-x-auto bg-slate-100/50 dark:bg-gray-900/40 text-xs font-bold">
            {[
              { id: 'users', label: 'Users', icon: Users },
              { id: 'exams', label: 'Exams & Syllabi', icon: BookOpen },
              { id: 'jobs', label: 'AI Jobs & Cache', icon: Cpu },
              { id: 'revenue', label: 'Revenue & Razorpay', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'support', label: 'Support Tickets', icon: HelpCircle },
              { id: 'system', label: 'System Flags', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#6D5BFF] text-white shadow-md'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200/60 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* 1. USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search user name or email..."
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-900 border border-slate-300 dark:border-gray-800 text-xs"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Total Registered Learners: <strong className="text-slate-900 dark:text-white">12,480</strong>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-gray-900 font-bold text-slate-600 dark:text-gray-300">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Exam</th>
                        <th className="p-3">Country</th>
                        <th className="p-3">Study Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                      {mockUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-gray-900/50">
                          <td className="p-3">
                            <div className="font-bold">{u.name}</div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </td>
                          <td className="p-3 font-semibold text-[#00D4FF]">{u.exam}</td>
                          <td className="p-3">{u.country}</td>
                          <td className="p-3 font-bold">{u.hours}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                u.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setMockUsers(
                                  mockUsers.map((item) =>
                                    item.id === u.id
                                      ? { ...item, status: item.status === 'Active' ? 'Suspended' : 'Active' }
                                      : item
                                  )
                                );
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer"
                              title="Toggle Suspend"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setMockUsers(mockUsers.filter((item) => item.id !== u.id))}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. EXAMS TAB */}
            {activeTab === 'exams' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF]/10 to-[#00D4FF]/10 border border-[#6D5BFF]/30 text-xs flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm">AI Syllabus Sync active across 180+ countries</h3>
                    <p className="text-slate-500 dark:text-gray-400">Exams auto-index from national medical boards, engineering councils, and civil service authorities.</p>
                  </div>
                  <button className="px-3 py-2 rounded-xl bg-[#6D5BFF] text-white font-bold cursor-pointer hover:opacity-90">
                    Manual Override
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {['USMLE Step 1', 'NEET PG', 'PLAB 1 / UKMLA', 'NCLEX-RN', 'UPSC CSE', 'CFA Level I'].map((ex) => (
                    <div key={ex} className="p-4 rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{ex}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 text-[10px] font-bold">100% Synced</span>
                      </div>
                      <div className="text-xs text-slate-500">24,000+ High-Yield Questions Index</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. AI JOBS & CACHE */}
            {activeTab === 'jobs' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Generation Queue</div>
                    <div className="text-2xl font-black text-[#6D5BFF] mt-1">12 Jobs</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Cache Hit Rate</div>
                    <div className="text-2xl font-black text-emerald-500 mt-1">94.8%</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Latency Average</div>
                    <div className="text-2xl font-black text-[#00D4FF] mt-1">280 ms</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-gray-800 space-y-3">
                  <div className="font-bold text-sm flex justify-between items-center">
                    <span>Recent Generation Queue</span>
                    <button className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-gray-800 font-bold hover:opacity-80 flex items-center gap-1 cursor-pointer">
                      <RefreshCw className="w-3 h-3" /> Retry Failed
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-900/60 flex justify-between items-center">
                      <span>job_gen_usmle_biochem_q901</span>
                      <span className="text-emerald-500 font-bold">Completed</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-gray-900/60 flex justify-between items-center">
                      <span>job_gen_neet_patho_q402</span>
                      <span className="text-[#00D4FF] font-bold">Processing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. REVENUE & RAZORPAY */}
            {activeTab === 'revenue' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Monthly Recurring Revenue (MRR)</div>
                    <div className="text-2xl font-black text-emerald-500 mt-1">$48,250</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Active Razorpay Subscriptions</div>
                    <div className="text-2xl font-black text-[#6D5BFF] mt-1">1,840</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
                    <div className="text-slate-500 font-bold">Refund Rate</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-gray-100 mt-1">0.2%</div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SYSTEM FLAGS */}
            {activeTab === 'system' && (
              <div className="space-y-4 text-xs">
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-gray-800 space-y-4">
                  <div className="font-bold text-sm">System Operations & Feature Flags</div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-gray-900">
                    <div>
                      <div className="font-bold">Maintenance Mode</div>
                      <div className="text-slate-500">Temporarily suspend onboarding for system upgrades</div>
                    </div>
                    <button
                      onClick={() => setFeatureFlags({ ...featureFlags, maintenanceMode: !featureFlags.maintenanceMode })}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        featureFlags.maintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-300 dark:bg-gray-800 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      {featureFlags.maintenanceMode ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-gray-900">
                    <div>
                      <div className="font-bold">Active AI Model Version</div>
                      <div className="text-slate-500">Primary inference engine for Q-Bank step-by-step reasoning</div>
                    </div>
                    <select
                      value={featureFlags.aiModelVersion}
                      onChange={(e) => setFeatureFlags({ ...featureFlags, aiModelVersion: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 font-bold"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3-flash">Gemini 3 Flash</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ANALYTICS & SUPPORT */}
            {(activeTab === 'analytics' || activeTab === 'support') && (
              <div className="p-8 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[#6D5BFF] mx-auto animate-pulse" />
                <h3 className="font-bold text-base">Real-Time Operational Stream</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Analytics & support logs connected to Supabase real-time telemetry.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
