'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch password recovery email. Please check your address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white relative overflow-hidden font-sans">
      
      {/* Decorative gradient background glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#6D5BFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#00D4FF]/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between z-10">
        <Link href="/" className="hover:opacity-90 transition-opacity flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <Link 
          href="/auth/sign-in" 
          className="flex items-center gap-1.5 text-xs font-heading font-extrabold text-slate-600 dark:text-slate-400 hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-white/80 dark:bg-[#0E1324]/85 border border-slate-200/95 dark:border-[#6D5BFF]/25 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/45 backdrop-blur-xl relative"
          >
            {/* Top Indicator Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] rounded-t-3xl" />

            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
                Recover Password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-2">
                We will dispatch a secure link to reset your curriculum credentials
              </p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-6 text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-emerald-400">Recovery Link Dispatched</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-300">
                    Please check your inbox at <strong className="text-slate-900 dark:text-white">{email}</strong>. Be sure to look in your spam or junk folder if it doesn’t arrive shortly.
                  </p>
                  <div className="pt-4">
                    <Link
                      href="/auth/sign-in"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-gray-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <span>Return to Sign In</span>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Error Notification */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2"
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] focus:ring-1 focus:ring-[#6D5BFF]/35 text-sm shadow-inner transition-all text-slate-900 dark:text-white"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#6D5BFF]/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> <span>Dispatching...</span>
                      </>
                    ) : (
                      <span>Dispatch Recovery Email</span>
                    )}
                  </button>
                </form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-200/50 dark:border-gray-900 z-10 bg-white/30 dark:bg-transparent backdrop-blur-sm">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          © {new Date().getFullYear()} NeoMCQ.com. All international medical licensing rights reserved.
        </p>
      </footer>
    </div>
  );
}
