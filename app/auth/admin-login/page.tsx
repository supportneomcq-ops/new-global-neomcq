'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Mail, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { Logo } from '@/components/logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        const rawMsg = typeof error === 'string' ? error : error?.message || (typeof error === 'object' && Object.keys(error).length > 0 ? JSON.stringify(error) : '');
        setErrorMsg(rawMsg && rawMsg !== '{}' ? rawMsg : 'Invalid admin credentials');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Verify user has admin role
        const { data: userRoles, error: rError } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', data.user.id);

        const roleNames = userRoles?.map((r: any) => r.roles?.name).filter(Boolean) || [];
        const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin');

        if (!isAdmin) {
          await supabase.auth.signOut();
          setErrorMsg('Access Denied: This account does not possess administrator privileges.');
          setLoading(false);
          return;
        }

        // Redirect to admin panel
        router.push('/admin');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#6D5BFF]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#00D4FF]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-10">
        <Logo size="md" />
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Restricted Portal</span>
        </div>
      </header>

      {/* Main Admin Login Card */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0E1324] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative"
        >
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] flex items-center justify-center mx-auto text-white shadow-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight text-white">
              NeoMCQ Admin Portal
            </h1>
            <p className="text-xs text-gray-400">
              Authorized system operations & infrastructure control center.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-gray-400 mb-1.5">Admin Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@neomcq.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-gray-400">Admin Secure Key</label>
                <a href="/auth/forgot-password" className="text-[11px] text-[#00D4FF] hover:underline font-medium">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-[#6D5BFF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-extrabold text-xs shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Authenticate Admin Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-gray-500 border-t border-gray-800/80">
            Standard user?{' '}
            <a href="/auth/sign-in" className="text-[#00D4FF] hover:underline font-bold">
              Return to Learner Sign In
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto text-center text-xs text-gray-600 z-10">
        NeoMCQ Production Platform • Zero Trust Security Policy
      </footer>
    </div>
  );
}
