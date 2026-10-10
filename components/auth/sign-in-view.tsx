'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import Link from 'next/link';

function getSafeNextPath(candidate: string, isAdmin: boolean): string | null {
  if (!candidate || !candidate.startsWith('/')) return null;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neomcq.com';
    const target = new URL(candidate, origin);
    if (target.origin !== origin) return null;
    if ((target.pathname === '/admin' || target.pathname.startsWith('/admin/')) && !isAdmin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirected_from') || searchParams.get('next') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id);

          const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
          const isAdmin = roleNames.some((role: string) => ['admin', 'super_admin', 'content_admin'].includes(role));
          const safeNext = getSafeNextPath(redirectedFrom, isAdmin);

          if (safeNext) {
            router.push(safeNext);
          } else if (isAdmin) {
            router.push('/admin');
          } else if (roleNames.includes('support')) {
            router.push('/support');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (err) {
        console.error('Error verifying current session:', err);
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router, redirectedFrom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      // 1. Primary: Fast & robust REST API route
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const res = await response.json().catch(() => null);

      if (!response.ok || !res?.success) {
        // Fallback to client-side Supabase authentication
        const supabase = getSupabaseClient();
        const clientAuth = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (clientAuth.error) {
          setError(res?.error || clientAuth.error.message || 'Authentication failed. Please verify your credentials.');
          setLoading(false);
          return;
        }

        const { data: clientRoles } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', clientAuth.data.user.id);
        const roleNames = clientRoles?.map((role: any) => role.roles?.name).filter(Boolean) || [];
        const isClientAdmin = roleNames.some((role: string) => ['admin', 'super_admin', 'content_admin'].includes(role));
        const isClientSupport = roleNames.includes('support');

        setSuccess(true);
        let fallbackTarget = isClientAdmin ? '/admin' : isClientSupport ? '/support' : '/dashboard';
        const safeNext = getSafeNextPath(redirectedFrom, isClientAdmin);
        if (safeNext) fallbackTarget = safeNext;
        setTimeout(() => {
          window.location.href = fallbackTarget;
        }, 600);
        return;
      }

      // If session tokens returned, sync client supabase instance
      if (res.session) {
        try {
          const supabase = getSupabaseClient();
          await supabase.auth.setSession({
            access_token: res.session.access_token,
            refresh_token: res.session.refresh_token,
          });
        } catch (syncErr) {
          console.warn('Silent client session sync warning:', syncErr);
        }
      }

      setSuccess(true);
      let targetUrl = res?.redirectUrl || '/dashboard';
      const isAdmin = ['admin', 'super_admin', 'content_admin'].some((role) => res?.user?.roles?.includes(role));
      const safeNext = getSafeNextPath(redirectedFrom, isAdmin);
      if (safeNext) targetUrl = safeNext;

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 600);
    } catch (err: any) {
      // Secondary fallback to server action
      try {
        const actionRes = await loginAction({ email, password });
        if (actionRes?.error) {
          setError(actionRes.error);
          setLoading(false);
          return;
        }
        setSuccess(true);
        let targetUrl = actionRes?.redirectUrl || '/dashboard';
        const isAdmin = targetUrl === '/admin' || targetUrl.startsWith('/admin/');
        const safeNext = getSafeNextPath(redirectedFrom, isAdmin);
        if (safeNext) targetUrl = safeNext;
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 600);
      } catch (finalErr: any) {
        setError(finalErr?.message || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white relative overflow-hidden font-sans">
      {/* Decorative gradient background glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#6D5BFF]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#00D4FF]/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between z-10">
        <Link href="/" className="hover:opacity-90 transition-opacity flex items-center gap-2">
          <Logo size="sm" />
        </Link>
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-heading font-extrabold text-slate-600 dark:text-slate-400 hover:text-[#6D5BFF] dark:hover:text-[#00D4FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
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
                Sign In to <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF]">NeoMCQ</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-2">
                Access your medical curriculum, adaptive practice and AI coaching
              </p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-900 dark:text-emerald-400">Authenticated Successfully</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-300">
                    Loading your secure workspace and syncing session...
                  </p>
                  <div className="flex justify-center pt-2">
                    <Loader2 className="w-5 h-5 text-[#6D5BFF] animate-spin" />
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
                      Email Address
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

                  {/* Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] focus:ring-1 focus:ring-[#6D5BFF]/35 text-sm shadow-inner transition-all text-slate-900 dark:text-white"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checkbox and Forgot Password */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 dark:border-gray-800 text-[#6D5BFF] focus:ring-[#6D5BFF] cursor-pointer w-4 h-4"
                        disabled={loading}
                      />
                      <span>Remember Me</span>
                    </label>

                    <Link
                      href="/auth/forgot-password"
                      className="text-[#6D5BFF] dark:text-[#00D4FF] hover:underline cursor-pointer font-extrabold"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#6D5BFF]/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>
              )}
            </AnimatePresence>
          <p className="mt-5 text-center text-sm text-slate-600 dark:text-gray-400">
            New to NeoMCQ?{' '}
            <Link href="/signup" className="font-extrabold text-[#6D5BFF] hover:underline dark:text-[#00D4FF]">Create an account</Link>
          </p>
          </motion.div>
          
          <p className="text-center text-[11px] text-slate-500 dark:text-gray-500 mt-6 font-medium">
            Protected by enterprise-grade 256-bit encryption.
          </p>
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

export function SignInView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050816]">
          <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
