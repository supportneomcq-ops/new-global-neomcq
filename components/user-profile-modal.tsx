'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  X,
  Key,
  Smartphone,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Camera,
  Globe,
  Building,
  Mail,
  Phone,
  Lock,
  CreditCard,
  Crown,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { GLOBAL_COUNTRIES } from '@/lib/data/countries';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country?: string;
    language?: string;
  };
  onUpdateProfile?: (updatedData: any) => void;
}

export function UserProfileModal({ isOpen, onClose, user, onUpdateProfile }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing' | 'devices' | 'danger'>('profile');

  // Form State
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [country, setCountry] = useState(user.country || 'United States');
  const [college, setCollege] = useState('Harvard Medical School');
  const [bio, setBio] = useState('Medical student aspiring for high-yield mastery.');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      if (user.country) setCountry(user.country);
    }
  }, [user]);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mock Active Devices
  const [devices, setDevices] = useState([
    { id: 'dev_1', name: 'MacBook Pro (Current Session)', location: 'California, USA', lastActive: 'Active now', current: true },
    { id: 'dev_2', name: 'iPhone 15 Pro', location: 'California, USA', lastActive: '2 hours ago', current: false },
    { id: 'dev_3', name: 'iPad Air 5th Gen', location: 'California, USA', lastActive: 'Yesterday', current: false },
  ]);

  const handleCountryChange = (selectedCountryName: string) => {
    setCountry(selectedCountryName);
    const cObj = GLOBAL_COUNTRIES.find((c) => c.name === selectedCountryName);
    if (cObj && (!phone || phone.startsWith('+'))) {
      const code = cObj.phone_code.startsWith('+') ? cObj.phone_code : `+${cObj.phone_code}`;
      setPhone(`${code} `);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const supabase = getSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            country: country,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.id);

        if (error) throw error;
      }

      if (onUpdateProfile) {
        onUpdateProfile({ firstName, lastName, phone, country, college, bio });
      }

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = (deviceId: string) => {
    setDevices(devices.filter((d) => d.id !== deviceId));
  };

  const handleRevokeAllOtherDevices = () => {
    setDevices(devices.filter((d) => d.current));
    setSuccessMessage('Logouts triggered on all other devices');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteAccount = async () => {
    if (!confirm('ARE YOU ABSOLUTELY SURE? This operation will permanently delete all your study progress, flashcards, notes, and records.')) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      window.location.href = '/auth/sign-in';
    } catch (err) {
      console.error('Delete account error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center text-white font-bold text-lg">
                {firstName.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white">
                  User Account & Settings
                </h3>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-200 dark:border-gray-800 bg-slate-100/50 dark:bg-gray-900/30 text-xs font-bold overflow-x-auto">
            {[
              { id: 'profile', label: 'Profile Details', icon: User },
              { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
              { id: 'security', label: 'Password & Auth', icon: Key },
              { id: 'devices', label: 'Active Sessions', icon: Smartphone },
              { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#6D5BFF] text-white shadow'
                      : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold rounded-2xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Country / Region</label>
                    <select
                      value={country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                    >
                      {GLOBAL_COUNTRIES.map((c) => (
                        <option key={c.iso2} value={c.name} className="bg-white dark:bg-gray-900">
                          {c.flag_emoji} {c.name} ({c.phone_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Target College / Institution</label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Personal Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-[#6D5BFF] text-white font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB: PLAN & BILLING */}
            {activeTab === 'billing' && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF]/10 via-[#00D4FF]/5 to-transparent border border-[#6D5BFF]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#6D5BFF]/20 text-[#6D5BFF] flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white">
                          Canonical Paid Plans
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400">
                          Pro ($9.99/mo), Max ($19.99/mo), Elite ($499/yr)
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-gray-300 font-normal leading-relaxed">
                    Manage your active subscription, download invoices, review billing history, or upgrade to Elite for truly unlimited access with zero exam switch fees.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <Link
                      href="/billing"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-[#6D5BFF] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Open Billing Portal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href="/pricing"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#6D5BFF]" />
                      <span>View Pricing Plans</span>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">PRO PLAN</div>
                    <div className="text-base font-heading font-black text-slate-900 dark:text-white">$9.99 <span className="text-[10px] font-normal text-slate-500">/mo</span></div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">Essential clinical practice ($2 exam switch)</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#6D5BFF]/5 border border-[#6D5BFF]/30 space-y-1">
                    <div className="text-[10px] font-bold text-[#6D5BFF] uppercase">MAX PLAN</div>
                    <div className="text-base font-heading font-black text-slate-900 dark:text-white">$19.99 <span className="text-[10px] font-normal text-slate-500">/mo</span></div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">AI Tutor Whiteboard & TTS ($2 exam switch)</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                      <Crown className="w-3 h-3" /> ELITE PLAN
                    </div>
                    <div className="text-base font-heading font-black text-slate-900 dark:text-white">$499 <span className="text-[10px] font-normal text-slate-500">/yr</span></div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">FREE unlimited exam switching</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHANGE PASSWORD */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D5BFF]"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-[#6D5BFF] text-white font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: ACTIVE SESSIONS */}
            {activeTab === 'devices' && (
              <div className="space-y-4 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Currently logged in devices</span>
                  <button
                    onClick={handleRevokeAllOtherDevices}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 cursor-pointer"
                  >
                    Logout All Other Sessions
                  </button>
                </div>

                <div className="space-y-2">
                  {devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-[#6D5BFF]" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{dev.name}</span>
                            {dev.current && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-500 uppercase">
                                This Device
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {dev.location} • {dev.lastActive}
                          </div>
                        </div>
                      </div>

                      {!dev.current && (
                        <button
                          onClick={() => handleRevokeDevice(dev.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                          title="Revoke session"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-4 text-xs font-semibold">
                <div className="flex items-center gap-3 text-rose-500">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-heading font-extrabold text-sm">Delete Account & Data</h4>
                    <p className="text-[11px] text-rose-400/80">
                      Permanently remove your profile, completed exam history, bookmarks, and subscriptions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2.5 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete My Account</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
