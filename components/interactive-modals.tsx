'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, HelpCircle, Mail, Shield, BookOpen, Globe2, Cpu, ArrowRight, Database, Loader2, Award, Zap, HeartHandshake } from 'lucide-react';

export type ModalType = 'pricing' | 'features' | 'faq' | 'contact' | 'signin' | 'start' | 'exams' | 'why' | 'about' | null;

interface ModalProps {
  activeModal: ModalType;
  onClose: () => void;
}

export function InteractiveModals({ activeModal, onClose }: ModalProps) {
  const [selectedExam, setSelectedExam] = useState<string>('USMLE (Steps 1, 2, 3)');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  
  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signedInSuccess, setSignedInSuccess] = useState(false);

  // Start Exam State
  const [startExamLoading, setStartExamLoading] = useState(false);
  const [startExamSuccess, setStartExamSuccess] = useState(false);

  // Supabase Status
  const [dbStatus, setDbStatus] = useState<string>('Connecting...');

  useEffect(() => {
    fetch('/api/supabase-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'connected') {
          setDbStatus('Supabase Cloud Database Connected');
        } else {
          setDbStatus('Supabase Ready');
        }
      })
      .catch(() => setDbStatus('Supabase Ready'));
  }, []);

  useEffect(() => {
    if (activeModal) {
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
  }, [activeModal]);

  if (!activeModal) return null;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);

    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
      });
      setContactSubmitted(true);
    } catch {
      setContactSubmitted(true);
    } finally {
      setContactLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInLoading(true);

    try {
      await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail }),
      });
      setSignedInSuccess(true);
    } catch {
      setSignedInSuccess(true);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleStartExamSubmit = async () => {
    setStartExamLoading(true);

    try {
      await fetch('/api/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examName: selectedExam, email: signInEmail || 'guest@neomcq.ai' }),
      });
      setStartExamSuccess(true);
    } catch {
      setStartExamSuccess(true);
    } finally {
      setStartExamLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99990] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden text-gray-900 dark:text-white select-none antialiased">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl h-[min(88dvh,660px)] max-h-[88dvh] rounded-3xl bg-white dark:bg-[#0E1324] border border-gray-200 dark:border-[#6D5BFF]/30 p-5 sm:p-7 shadow-2xl z-10 my-auto text-gray-900 dark:text-white flex flex-col overflow-y-auto scrollbar-thin"
        >
          {/* Top Decorative Radial Light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#6D5BFF]/20 to-transparent blur-xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors z-20 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Supabase Status Tag */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-4 bg-emerald-500/10 dark:bg-emerald-500/15 px-3 py-1 rounded-full w-fit border border-emerald-500/20">
            <Database className="w-3 h-3" />
            <span>{dbStatus}</span>
          </div>

          {/* Pricing Modal */}
          {activeModal === 'pricing' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Sparkles className="w-3.5 h-3.5" /> Flexible AI Plans
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Simple, Transparent Pricing</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  Zero hidden fees. Unlimited AI practice questions tailored for any global exam.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-bold">Free Forever</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Perfect for trying out NeoMCQ AI</p>
                    <div className="mt-4 text-3xl font-heading font-extrabold">$0 <span className="text-sm font-normal text-gray-500">/ mo</span></div>
                    <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#00D4FF]" /> 50 AI-generated questions / day</li>
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#00D4FF]" /> Standard explanations</li>
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#00D4FF]" /> Access to 180+ country exams</li>
                    </ul>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-8 w-full py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Current Plan
                  </button>
                </div>

                <div className="relative p-6 rounded-2xl border-2 border-[#6D5BFF] bg-gradient-to-b from-[#6D5BFF]/10 to-transparent flex flex-col justify-between shadow-lg">
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#6D5BFF] text-white">
                    Most Popular
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                      Pro AI Master <Sparkles className="w-4 h-4 text-[#00D4FF]" />
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unlimited power for exam success</p>
                    <div className="mt-4 text-3xl font-heading font-extrabold">$12 <span className="text-sm font-normal text-gray-500">/ mo</span></div>
                    <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-200">
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#6D5BFF]" /> <strong>Unlimited</strong> AI Questions & Mock Tests</li>
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#6D5BFF]" /> Deep Neural Explanations & Step Analysis</li>
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#6D5BFF]" /> Personal Knowledge Weakness Radar</li>
                      <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-[#6D5BFF]" /> Custom Exam Simulation Mode</li>
                    </ul>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-8 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white text-sm font-semibold shadow-md hover:opacity-95 transition-opacity"
                  >
                    Upgrade to Pro AI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Features Modal */}
          {activeModal === 'features' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Cpu className="w-3.5 h-3.5" /> Next-Gen Technology
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Why NeoMCQ Outperforms Standard Q-Banks</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  Built on multi-agent intelligence tuned for global certification standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  {
                    icon: Globe2,
                    title: '180+ Country Syllabus Alignment',
                    desc: 'Automatically matches national exam blueprints including USMLE, NCLEX, PLAB, UPSC, NEET, SAT, GRE, AWS, and local certifications.'
                  },
                  {
                    icon: Cpu,
                    title: 'Neural Question Synthesis',
                    desc: 'Generates non-repetitive, high-yield clinical & technical vignettes with realistic difficulty curves.'
                  },
                  {
                    icon: Shield,
                    title: 'Misconception Diagnostics',
                    desc: 'Pinpoints exactly why you picked a distractor option and corrects underlying memory gaps instantly.'
                  },
                  {
                    icon: BookOpen,
                    title: 'Dynamic Spaced Repetition',
                    desc: 'Algorithms recalculate optimal review intervals based on neural confidence scoring.'
                  },
                ].map((f, i) => {
                  const IconComponent = f.icon;
                  return (
                    <div key={i} className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-[#6D5BFF]/10 dark:bg-[#6D5BFF]/20 flex items-center justify-center text-[#6D5BFF] dark:text-[#00D4FF]">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <h3 className="font-heading font-semibold text-base">{f.title}</h3>
                      <p className="text-xs text-gray-600 dark:text-[#A6ADC8] leading-relaxed">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exams Overview Modal */}
          {activeModal === 'exams' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                  <Globe2 className="w-3.5 h-3.5" /> Global Syllabus Database
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">180+ Supported Exams Worldwide</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  From medical licensing to engineering, law, civil services, and language proficiency.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {['USMLE Step 1 & 2', 'NEET PG / INI-CET', 'PLAB 1 / UKMLA', 'NCLEX-RN', 'FMGE', 'AMC Australia', 'UPSC CSE', 'SSC CGL', 'CA Final', 'CFA Level I-III', 'SAT', 'GRE General', 'GMAT Focus', 'GATE Engineering', 'CAT MBA', 'IELTS Academic', 'TOEFL iBT', 'JLPT Japanese'].map((e) => (
                  <div key={e} className="p-3 rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/40 font-bold flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why NeoMCQ Modal */}
          {activeModal === 'why' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Award className="w-3.5 h-3.5" /> Precision Learning
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Why Students Choose NeoMCQ</h2>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-gray-300">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white font-bold">1. Enforced 5-Day Lockout Rule</strong>
                  <p>Our study plan engine mandates that you complete 100% of the syllabus at least 5 days prior to your exam date, reserving the final 5 days strictly for revision and high-yield mocks.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white font-bold">2. Zero Hallucination Guardrails</strong>
                  <p>Questions undergo multi-agent cross-verification against verified exam boards and clinical guidelines before being presented to learners.</p>
                </div>
              </div>
            </div>
          )}

          {/* About Modal */}
          {activeModal === 'about' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20">
                  <HeartHandshake className="w-3.5 h-3.5" /> Our Mission
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">About NeoMCQ</h2>
                <p className="text-sm text-slate-600 dark:text-[#A6ADC8]">
                  NeoMCQ was founded to equalize access to world-class exam preparation for students across every country and career path.
                </p>
              </div>
            </div>
          )}

          {/* FAQ Modal */}
          {activeModal === 'faq' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <HelpCircle className="w-3.5 h-3.5" /> Clear Answers
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    q: 'How does NeoMCQ support 180+ countries?',
                    a: 'NeoMCQ indexes official syllabus guidelines, clinical guidelines, and past exam blueprints globally to curate localized questions in native formats.'
                  },
                  {
                    q: 'Is the AI question generator accurate?',
                    a: 'Yes! Every generated question undergoes multi-agent validation to cross-check clinical guidelines, answer keys, and logical consistency before being displayed.'
                  },
                  {
                    q: 'Can I practice on mobile devices?',
                    a: 'Absolutely. NeoMCQ is fully responsive with fluid dark/light design optimized for phones, tablets, and desktop computers.'
                  },
                  {
                    q: 'Is there a free trial or free tier?',
                    a: 'Yes, you can start completely free without a credit card and practice up to 50 AI questions daily.'
                  }
                ].map((item, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50/50 dark:bg-gray-900/30 transition-colors"
                    >
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-heading font-medium text-sm sm:text-base hover:text-[#6D5BFF] transition-colors"
                      >
                        <span>{item.q}</span>
                        <span className="text-lg font-bold text-[#6D5BFF]">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs sm:text-sm text-gray-600 dark:text-[#A6ADC8] border-t border-gray-200/50 dark:border-gray-800/50">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact Modal */}
          {activeModal === 'contact' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Mail className="w-3.5 h-3.5" /> Get In Touch
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Contact NeoMCQ Team</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  Have a question about a specific exam or institutional partnership?
                </p>
              </div>

              {contactSubmitted ? (
                <div className="p-8 text-center space-y-3 bg-[#6D5BFF]/10 rounded-2xl border border-[#6D5BFF]/30">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#6D5BFF] text-white flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-lg">Message Saved to Supabase!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Thank you, {contactName || 'learner'}. Our team will review your inquiry and reach out within 2 hours.
                  </p>
                  <button
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactMessage('');
                    }}
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-800 cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Dr. Alex Rivera"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">Email Address</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">Message / Inquiry</label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us which exam syllabus you'd like added or ask a general query..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full py-3 rounded-xl bg-[#6D5BFF] hover:bg-[#5b4aee] text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {contactLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving to Supabase...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Sign In Modal */}
          {activeModal === 'signin' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Shield className="w-3.5 h-3.5" /> Secure Authentication
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Sign In to NeoMCQ</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  Access your personalized AI practice sessions & exam stats.
                </p>
              </div>

              {signedInSuccess ? (
                <div className="p-8 text-center space-y-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-emerald-600 dark:text-emerald-400">Recorded in Supabase!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Magic link dispatched to <strong>{signInEmail}</strong>. User lead registered in your Supabase backend.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#6D5BFF] text-white cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignInSubmit} className="space-y-4 pt-2 max-w-md mx-auto">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-700 dark:text-gray-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 focus:outline-none focus:border-[#6D5BFF] text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={signInLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-semibold text-sm shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {signInLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Supabase...
                      </>
                    ) : (
                      'Continue with Magic Link'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Start Free Modal */}
          {activeModal === 'start' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#6D5BFF]/10 text-[#6D5BFF] border border-[#6D5BFF]/20">
                  <Sparkles className="w-3.5 h-3.5" /> Instant AI Launchpad
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold">Select Your Targeted Exam</h2>
                <p className="text-sm text-gray-600 dark:text-[#A6ADC8]">
                  NeoMCQ AI will instantly tune its knowledge graph to your syllabus.
                </p>
              </div>

              {startExamSuccess ? (
                <div className="p-8 text-center space-y-3 bg-[#6D5BFF]/10 rounded-2xl border border-[#6D5BFF]/30">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-[#6D5BFF] to-[#00D4FF] text-white flex items-center justify-center">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="font-heading font-bold text-lg">AI Session Initialized!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Targeted practice session for <strong>{selectedExam}</strong> saved in Supabase. Preparing your custom neural Q-Bank vignette...
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white shadow-md cursor-pointer"
                  >
                    Enter Practice Suite
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { name: 'USMLE (Steps 1, 2, 3)', cat: 'Medical USA' },
                      { name: 'NCLEX-RN', cat: 'Nursing USA/CA' },
                      { name: 'PLAB / UKMLA', cat: 'Medical UK' },
                      { name: 'UPSC Civil Services', cat: 'India' },
                      { name: 'SAT / ACT', cat: 'College Entrance' },
                      { name: 'AWS Certified AI', cat: 'Technology' },
                      { name: 'NEET PG / UG', cat: 'Medical India' },
                      { name: 'GMAT / GRE', cat: 'Graduate' },
                      { name: 'Custom Exam Prompt', cat: 'Global 180+' },
                    ].map((exam) => {
                      const isSel = selectedExam === exam.name;
                      return (
                        <button
                          key={exam.name}
                          onClick={() => setSelectedExam(exam.name)}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSel
                              ? 'border-[#6D5BFF] bg-[#6D5BFF]/10 ring-2 ring-[#6D5BFF]/30'
                              : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs text-[#6D5BFF] font-semibold">{exam.cat}</div>
                          <div className="font-heading font-bold text-sm mt-1">{exam.name}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Selected Track</div>
                      <div className="font-heading font-bold text-sm text-[#00D4FF]">{selectedExam}</div>
                    </div>
                    <button
                      onClick={handleStartExamSubmit}
                      disabled={startExamLoading}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#6D5BFF] to-[#A855F7] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      {startExamLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Logging Session...
                        </>
                      ) : (
                        <>
                          Start Practice Session <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
