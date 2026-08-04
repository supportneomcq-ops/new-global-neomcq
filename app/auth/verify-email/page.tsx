'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Mail, ArrowRight, Loader2, RefreshCw, CheckCircle, ExternalLink, ShieldCheck, HelpCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';
import Link from 'next/link';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Poll Supabase Auth to automatically detect when email gets verified
  useEffect(() => {
    if (isVerified) return;

    const supabase = getSupabaseClient();
    
    const interval = setInterval(async () => {
      try {
        // Refresh session to get updated email_confirmed_at state from token
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Session refresh during email verification polling:', error.message);
          return;
        }

        if (session?.user?.email_confirmed_at) {
          setIsVerified(true);
          clearInterval(interval);
          
          // Show verification success, wait for user to read or redirect after 1.5s
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      } catch (err) {
        console.error('Error polling verification status:', err);
      }
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(interval);
  }, [router, isVerified]);

  const handleResend = async () => {
    if (!email) {
      setResendMessage('No email address detected. Please try signing up again.');
      return;
    }
    setResending(true);
    setResendMessage('');

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      setResendMessage('A fresh verification link has been successfully dispatched.');
    } catch (err: any) {
      setResendMessage(err?.message || 'Failed to dispatch verification email. Please retry.');
    } finally {
      setResending(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    setCheckMessage('');

    try {
      const supabase = getSupabaseClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setCheckMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      } else {
        setCheckMessage('Email is not confirmed yet. Please verify your inbox and spam folders.');
      }
    } catch (err: any) {
      setCheckMessage(err?.message || 'Could not verify status. Please ensure you clicked the link.');
    } finally {
      setChecking(false);
    }
  };

  // Helper to open mail clients based on email domains
  const getMailClientUrl = () => {
    if (email.endsWith('@gmail.com')) {
      return 'https://mail.google.com';
    } else if (email.endsWith('@outlook.com') || email.endsWith('@hotmail.com')) {
      return 'https://outlook.live.com';
    } else if (email.endsWith('@yahoo.com')) {
      return 'https://mail.yahoo.com';
    }
    return 'https://mail.google.com'; // Default to Gmail
  };

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white/95 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-[#6D5BFF]/25 rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/40 relative backdrop-blur-xl"
      >
        {/* Top Gradient Banner */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7] rounded-t-3xl" />

        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#6D5BFF]/10 flex items-center justify-center border border-[#6D5BFF]/25">
            {isVerified ? (
              <CheckCircle className="w-8 h-8 text-emerald-500 animate-bounce" />
            ) : (
              <Mail className="w-8 h-8 text-[#00D4FF] animate-pulse" />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-heading font-extrabold tracking-tight">
              {isVerified ? 'Verification Complete!' : 'Verify Your Email'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
              {isVerified 
                ? 'Your premium study account is fully activated.'
                : 'We sent a verification link to configure your study profile.'
              }
            </p>
          </div>

          {email && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#050816]/60 border border-slate-100 dark:border-gray-800 text-xs text-center font-semibold">
              <span className="text-slate-400">Recipient:</span>{' '}
              <strong className="text-slate-900 dark:text-white break-all">{email}</strong>
            </div>
          )}

          {isVerified ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-4 space-y-3"
            >
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl">
                ✓ Success! Synchronizing workspace...
              </div>
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 pt-2 text-left">
              
              {/* Resend Messages */}
              {resendMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold border ${
                  resendMessage.includes('successfully') 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                }`}>
                  {resendMessage}
                </div>
              )}

              {/* Manual check Messages */}
              {checkMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold border ${
                  checkMessage.includes('success') 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                }`}>
                  {checkMessage}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2.5">
                <a
                  href={getMailClientUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-extrabold text-xs sm:text-sm shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Your Inbox</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualCheck}
                    disabled={checking || resending}
                    className="py-3 px-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-[11px] font-bold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Check Status</span>
                  </button>

                  <button
                    onClick={handleResend}
                    disabled={checking || resending}
                    className="py-3 px-3 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-[11px] font-bold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Resend Email</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-gray-800/80 text-[11px] text-slate-400 flex flex-col gap-1 text-center">
                <div className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Real-time detection is active</span>
                </div>
                <p className="mt-1">
                  Did not receive it? Check your Spam or Promotions folder, or request another resend.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-slate-500 dark:text-gray-500 mt-6 font-medium">
        Need assistance? Contact support@neomcq.com
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <Suspense fallback={
          <div className="bg-white/95 dark:bg-[#0E1324]/90 border border-slate-200 dark:border-[#6D5BFF]/25 rounded-3xl p-8 shadow-xl w-full max-w-md flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-[#6D5BFF] animate-spin" />
            <p className="text-sm text-slate-400">Loading verification context...</p>
          </div>
        }>
          <VerifyEmailInner />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-200/50 dark:border-gray-900 z-10 bg-white/30 dark:bg-transparent backdrop-blur-sm">
        <p className="text-xs text-slate-500 dark:text-gray-400">
          © {new Date().getFullYear()} NeoMCQ.com. All licensing rights reserved.
        </p>
      </footer>
    </div>
  );
}
