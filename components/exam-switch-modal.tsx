'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  DollarSign,
  Search,
  BookOpen,
  Zap,
  Crown,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useSelection, SelectedItem } from '@/lib/context/selection-context';
import { UserEntitlements, DEFAULT_FREE_ENTITLEMENTS } from '@/lib/entitlements/entitlements';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface ExamSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExam: SelectedItem | null;
  onSwitchSuccess?: (newExam: SelectedItem) => void;
}

export function ExamSwitchModal({
  isOpen,
  onClose,
  currentExam,
  onSwitchSuccess,
}: ExamSwitchModalProps) {
  const { applyExamSwitch } = useSelection();
  const [allExams, setAllExams] = useState<SelectedItem[]>([]);
  const [selectedTargetExam, setSelectedTargetExam] = useState<SelectedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements>(DEFAULT_FREE_ENTITLEMENTS());

  // Load Razorpay script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch user entitlements and active exams list
  useEffect(() => {
    if (isOpen) {
      const fetchInitialData = async () => {
        setLoadingExams(true);
        setErrorMessage('');
        setSuccessData(null);
        setStatusMessage('');
        try {
          // Fetch entitlements
          const entRes = await fetch('/api/entitlements');
          if (entRes.ok) {
            const entJson = await entRes.json();
            if (entJson.entitlements) setEntitlements(entJson.entitlements);
          }

          // Fetch exams
          const supabase = getSupabaseClient();
          const { data, error } = await supabase
            .from('exams')
            .select('id, name, slug, description')
            .neq('status', 'archived')
            .order('name');

          if (error || !data || data.length === 0) {
            const apiRes = await fetch('/api/exams');
            const apiJson = await apiRes.json();
            if (apiJson.success && Array.isArray(apiJson.exams)) {
              setAllExams(apiJson.exams);
              const other = apiJson.exams.find((e: any) => e.id !== currentExam?.id);
              if (other && !selectedTargetExam) {
                setSelectedTargetExam(other);
              }
              return;
            }
            if (error) throw error;
          }

          if (data) {
            setAllExams(data);
            const other = data.find((e) => e.id !== currentExam?.id);
            if (other && !selectedTargetExam) {
              setSelectedTargetExam(other);
            }
          }
        } catch (err: any) {
          console.error('Error fetching data for switch modal:', err);
          setErrorMessage('Failed to load exam directory.');
        } finally {
          setLoadingExams(false);
        }
      };

      fetchInitialData();
    }
  }, [isOpen, currentExam]);

  const filteredExams = allExams.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSameExam = selectedTargetExam?.id === currentExam?.id;
  const isElite = entitlements.planCode === 'ELITE' && entitlements.isActive;

  const handleInitiateSwitch = async () => {
    if (!selectedTargetExam) {
      setErrorMessage('Please select a target exam.');
      return;
    }

    if (isSameExam) {
      setErrorMessage(`You are already preparing for ${currentExam?.name}. Please select a different target exam.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    // If user is ELITE: Free Instant Switch!
    if (isElite) {
      setStatusMessage('Applying instant Elite Free exam switch...');
      try {
        const res = await fetch('/api/exams/switch/elite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetExamId: selectedTargetExam.id }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to switch exam.');
        }

        setSuccessData(data);
        setIsProcessing(false);
        setStatusMessage('');

        const newExamObj = data.newExam || selectedTargetExam;
        await applyExamSwitch(newExamObj);
        if (onSwitchSuccess) onSwitchSuccess(newExamObj);

        setTimeout(() => {
          onClose();
        }, 2200);
      } catch (err: any) {
        console.error('Elite switch error:', err);
        setErrorMessage(err.message || 'Failed to switch exam.');
        setIsProcessing(false);
        setStatusMessage('');
      }
      return;
    }

    // Otherwise for Pro/Max/Free: $2.00 USD Razorpay payment order
    setStatusMessage('Creating secure payment order ($2.00 USD)...');

    try {
      const orderRes = await fetch('/api/exams/switch/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetExamId: selectedTargetExam.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize exam switch order.');
      }

      setStatusMessage('Launching secure checkout...');

      // Check if Razorpay is loaded
      if (typeof window !== 'undefined' && window.Razorpay && orderData.keyId && !orderData.keyId.startsWith('mock_')) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'NeoMCQ Exam Switch',
          description: `Switch preparation curriculum to ${selectedTargetExam.name}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            setStatusMessage('Verifying payment with secure server...');
            await completeVerification({
              switchRequestId: orderData.switchRequestId,
              razorpay_order_id: response.razorpay_order_id || orderData.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: '',
            email: '',
          },
          theme: {
            color: '#6D5BFF',
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setStatusMessage('');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          setErrorMessage(resp.error?.description || 'Payment was unsuccessful. Your exam has not been changed.');
          setIsProcessing(false);
          setStatusMessage('');
        });
        rzp.open();
      } else {
        // Sandboxed verification flow for preview/dev environments
        setStatusMessage('Verifying payment on secure server...');
        setTimeout(async () => {
          await completeVerification({
            switchRequestId: orderData.switchRequestId,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_sw_${Date.now()}`,
            razorpay_signature: `sig_sw_${Date.now()}`,
          });
        }, 1200);
      }
    } catch (err: any) {
      console.error('Error initiating switch:', err);
      setErrorMessage(err.message || 'Payment initiation failed.');
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const completeVerification = async (payload: {
    switchRequestId?: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }) => {
    try {
      const verifyRes = await fetch('/api/exams/switch/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed. Your exam has not been changed.');
      }

      setSuccessData(verifyData);
      setIsProcessing(false);
      setStatusMessage('');

      const newExamObj = verifyData.newExam || selectedTargetExam;
      await applyExamSwitch(newExamObj);

      if (onSwitchSuccess) {
        onSwitchSuccess(newExamObj);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMessage(err.message || 'Verification failed. Exam remains unchanged.');
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-white dark:bg-[#0E1324] border border-slate-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-[#6D5BFF]/10 via-[#00D4FF]/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isElite ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-[#6D5BFF]/15 text-[#6D5BFF] border border-[#6D5BFF]/30'
              }`}>
                {isElite ? <Crown className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Switch Your Primary Exam
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  {isElite ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Elite Membership: Unlimited Free Switching ($0.00 USD)
                    </span>
                  ) : (
                    <span>Pro & Max plans: Switch anytime for <strong className="text-[#6D5BFF]">$2.00 USD</strong>.</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Success Notification */}
            {successData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  Exam Switched Successfully!
                </h4>
                <p className="text-xs text-slate-600 dark:text-gray-300">
                  Your primary curriculum is now updated to{' '}
                  <strong className="text-slate-900 dark:text-white">{successData.newExam?.name || selectedTargetExam?.name}</strong>.
                  All your previous study history remains safely preserved.
                </p>
                <div className="text-[11px] font-bold text-slate-400">Refreshing your dashboard...</div>
              </motion.div>
            ) : (
              <>
                {/* Elite Free Switch Privilege Banner */}
                {isElite && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-700 dark:text-amber-300 block">
                        Elite VIP Privilege Active
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                        As an Elite Annual member, you have 100% free unlimited exam switching. Zero fees applied.
                      </span>
                    </div>
                  </div>
                )}

                {/* Current Exam vs New Exam Visual Map */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Current Exam
                    </div>
                    <div className="font-heading font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{currentExam?.name || 'Primary Curriculum'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">{entitlements.planName}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#6D5BFF]/5 border border-[#6D5BFF]/30 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6D5BFF]">
                      New Target Curriculum
                    </div>
                    <div className="font-heading font-extrabold text-sm text-[#6D5BFF] dark:text-[#00D4FF] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{selectedTargetExam?.name || 'Select target exam below'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">
                      {isElite ? 'Free instant switch' : 'Unlocks instantly after payment'}
                    </div>
                  </div>
                </div>

                {/* Exam Search and Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                    Select New Official Exam:
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search exam by name (e.g. USMLE, PLAB, NCLEX, NEET PG)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs font-semibold focus:outline-none focus:border-[#6D5BFF] text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Exam List */}
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 dark:border-gray-800/80 rounded-2xl p-2 bg-slate-50/50 dark:bg-gray-900/30">
                    {loadingExams ? (
                      <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#6D5BFF]" />
                        <span>Loading active exam registry...</span>
                      </div>
                    ) : filteredExams.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching exams found.
                      </div>
                    ) : (
                      filteredExams.map((exam) => {
                        const isSelected = selectedTargetExam?.id === exam.id;
                        const isCurrent = currentExam?.id === exam.id;
                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => setSelectedTargetExam(exam)}
                            className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#6D5BFF] text-white font-bold shadow-md'
                                : isCurrent
                                ? 'bg-slate-200/60 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 font-semibold'
                                : 'hover:bg-slate-200/40 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 shrink-0 opacity-70" />
                              <span className="truncate">{exam.name}</span>
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-300 dark:bg-gray-700 text-slate-600 dark:text-gray-300">
                                Current
                              </span>
                            )}
                            {isSelected && !isCurrent && (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Status Message */}
                {statusMessage && (
                  <div className="p-3 rounded-xl bg-[#6D5BFF]/10 border border-[#6D5BFF]/30 text-[#6D5BFF] dark:text-[#00D4FF] text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {/* Price & Guarantees Breakdown Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/40 border border-slate-200 dark:border-gray-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 dark:text-gray-300 font-semibold">
                    <span>Exam Curriculum Switch Fee:</span>
                    <strong className="text-base font-heading font-black text-slate-900 dark:text-white">
                      {isElite ? (
                        <span className="text-emerald-500 font-black">$0.00 USD (FREE for Elite)</span>
                      ) : (
                        '$2.00 USD'
                      )}
                    </strong>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-gray-800" />
                  <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Previous exam study history & analytics are 100% safely preserved.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Instant curriculum reallocation & AI question generator update.</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!successData && (
            <div className="p-6 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-gray-900/30">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInitiateSwitch}
                disabled={isProcessing || !selectedTargetExam || isSameExam}
                className={`px-6 py-3 rounded-2xl text-white text-xs sm:text-sm font-heading font-extrabold shadow-lg hover:opacity-95 transition-opacity flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isElite
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/25'
                    : 'bg-gradient-to-r from-[#6D5BFF] via-[#5B4AEB] to-[#00D4FF] shadow-[#6D5BFF]/25'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isElite ? 'Switching Curriculum...' : 'Processing Payment...'}</span>
                  </>
                ) : isSameExam ? (
                  <span>Already on {currentExam?.name}</span>
                ) : isElite ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Switch Exam Instantly (Free for Elite)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Pay $2.00 & Switch Exam</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
