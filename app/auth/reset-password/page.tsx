'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || 'Failed to update password');
        setLoading(false);
        return;
      }

      setSuccessMsg('Your password has been updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/auth/sign-in');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#6D5BFF]/15 rounded-full blur-[120px] pointer-events-none" />

      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-10">
        <Logo size="md" />
      </header>

      <main className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0E1324] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] flex items-center justify-center mx-auto text-white shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-white">
              Reset Your Password
            </h1>
            <p className="text-xs text-gray-400">
              Set a strong, new password for your account.
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-gray-400 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-extrabold text-xs shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Confirm New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      <footer className="w-full max-w-7xl mx-auto text-center text-xs text-gray-600 z-10">
        NeoMCQ • High Yield Exam Intelligence
      </footer>
    </div>
  );
}
