'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import { signupAction } from '@/app/actions/auth';
import { Logo } from '@/components/logo';

export function SignUpView() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await signupAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError('We could not create your account right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050816] text-slate-900 dark:text-white">
      <header className="w-full px-5 py-5 sm:px-8">
        <Link href="/" aria-label="NeoMCQ home" className="inline-flex">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-[#6D5BFF]/25 bg-white/95 dark:bg-[#0E1324]/90 p-6 sm:p-9 shadow-xl shadow-black/5 dark:shadow-black/40 relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#6D5BFF] via-[#00D4FF] to-[#A855F7]" />
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D5BFF]/10 text-[#6D5BFF] dark:text-[#00D4FF]">
              <UserRound className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create your NeoMCQ account</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
              Build your study workspace and prepare with a plan tailored to your exam.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm font-semibold">
                First name
                <input
                  autoComplete="given-name"
                  required
                  maxLength={80}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#080C19] px-4 py-3 text-sm outline-none focus:border-[#6D5BFF] focus:ring-2 focus:ring-[#6D5BFF]/15"
                  placeholder="First name"
                />
              </label>
              <label className="block text-sm font-semibold">
                Last name
                <input
                  autoComplete="family-name"
                  required
                  maxLength={80}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#080C19] px-4 py-3 text-sm outline-none focus:border-[#6D5BFF] focus:ring-2 focus:ring-[#6D5BFF]/15"
                  placeholder="Last name"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Email address
              <span className="relative mt-1.5 block">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#080C19] pl-10 pr-4 py-3 text-sm outline-none focus:border-[#6D5BFF] focus:ring-2 focus:ring-[#6D5BFF]/15"
                  placeholder="you@example.com"
                />
              </span>
            </label>

            <label className="block text-sm font-semibold">
              Password
              <span className="relative mt-1.5 block">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#080C19] pl-10 pr-12 py-3 text-sm outline-none focus:border-[#6D5BFF] focus:ring-2 focus:ring-[#6D5BFF]/15"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <label className="block text-sm font-semibold">
              Confirm password
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#080C19] px-4 py-3 text-sm outline-none focus:border-[#6D5BFF] focus:ring-2 focus:ring-[#6D5BFF]/15"
                placeholder="Enter your password again"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#6D5BFF]/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-extrabold text-[#6D5BFF] hover:underline dark:text-[#00D4FF]">
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms-and-conditions" className="underline hover:text-[#6D5BFF]">Terms</Link> and{' '}
            <Link href="/privacy-policy" className="underline hover:text-[#6D5BFF]">Privacy Policy</Link>.
          </p>
        </motion.section>
      </main>
      <footer className="border-t border-slate-200/60 dark:border-gray-900 px-5 py-5 text-center text-xs text-slate-500 dark:text-gray-500">
        © {new Date().getFullYear()} NeoMCQ. Learn with confidence.
      </footer>
    </div>
  );
}
