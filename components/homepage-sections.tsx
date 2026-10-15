'use client';

import Link from 'next/link';
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, Briefcase,
  CheckCircle2, ClipboardList, GraduationCap, Globe2, HeartHandshake, Layers3,
  Landmark, Lightbulb, LineChart, Scale, ShieldCheck, Stethoscope,
  Settings2, BarChart3
} from 'lucide-react';

const tools = [
  { title: 'Practice MCQs', description: 'Topic-wise questions with detailed explanations and AI feedback.', action: 'Start Practicing', href: '/dashboard', icon: ClipboardList, tone: 'violet' },
  { title: 'Smart Study Notes', description: 'AI-generated concise notes for quick and effective learning.', action: 'Open Study Notes', href: '/dashboard', icon: BookOpen, tone: 'teal' },
  { title: 'Flashcards', description: 'Revise with active recall flashcards and spaced repetition.', action: 'Start Revising', href: '/dashboard', icon: Layers3, tone: 'orange' },
  { title: 'AI Tutor', description: 'Ask questions and get clear explanations and learning guidance.', action: 'Chat with AI', href: '/dashboard', icon: BrainCircuit, tone: 'pink' },
];

const steps = [
  { number: '1', title: 'Choose Your Exam', description: 'Select from available exams or add your own.', icon: Globe2 },
  { number: '2', title: 'Get Your Personalized Plan', description: 'Build a study routine around your goals and curriculum.', icon: Settings2 },
  { number: '3', title: 'Practice and Track Progress', description: 'Learn with practice, revision tools, and progress insights.', icon: BarChart3 },
];

const examCategories = [
  { title: 'Medical Exams', examples: 'NEET, FMGE, USMLE, PLAB, INI-CET and more', icon: Stethoscope, tone: 'blue' },
  { title: 'Engineering Exams', examples: 'JEE Main, JEE Advanced, GATE and more', icon: Settings2, tone: 'violet' },
  { title: 'Government Exams', examples: 'UPSC, SSC, Banking, Railway and more', icon: Landmark, tone: 'teal' },
  { title: 'Law Exams', examples: 'CLAT, AILET and more', icon: Scale, tone: 'orange' },
  { title: 'Teaching Exams', examples: 'CTET, UGC NET and more', icon: GraduationCap, tone: 'violet' },
  { title: 'Management Exams', examples: 'CAT, MAT, XAT and more', icon: LineChart, tone: 'pink' },
  { title: 'Professional Exams', examples: 'CA, CS, CMA and more', icon: Briefcase, tone: 'orange' },
  { title: 'International Exams', examples: 'GRE, GMAT, IELTS and more', icon: Globe2, tone: 'blue' },
];

const benefits = [
  { title: 'AI-Powered Learning', description: 'Personalized practice and adaptive learning support.', icon: HeartHandshake, tone: 'violet' },
  { title: 'Curriculum-Aware Study', description: 'Organize preparation around your exam subjects and topics.', icon: ShieldCheck, tone: 'teal' },
  { title: 'Detailed Explanations', description: 'Build understanding with clear answer explanations.', icon: Lightbulb, tone: 'blue' },
  { title: 'Track Your Progress', description: 'Use study goals and progress insights to stay consistent.', icon: Activity, tone: 'pink' },
];

const toneClasses: Record<string, { icon: string; card: string; action: string }> = {
  violet: { icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-200', card: 'from-violet-50/80 to-white border-violet-100 dark:from-violet-950/50 dark:to-slate-950 dark:border-violet-800/70', action: 'bg-violet-100/80 text-violet-700 dark:bg-violet-950/70 dark:text-violet-200' },
  teal: { icon: 'bg-teal-100 text-teal-600 dark:bg-teal-900/60 dark:text-teal-200', card: 'from-teal-50/80 to-white border-teal-100 dark:from-teal-950/40 dark:to-slate-950 dark:border-teal-800/70', action: 'bg-teal-100/80 text-teal-700 dark:bg-teal-950/70 dark:text-teal-200' },
  orange: { icon: 'bg-orange-100 text-orange-600 dark:bg-orange-900/60 dark:text-orange-200', card: 'from-orange-50/80 to-white border-orange-100 dark:from-orange-950/40 dark:to-slate-950 dark:border-orange-800/70', action: 'bg-orange-100/80 text-orange-700 dark:bg-orange-950/70 dark:text-orange-200' },
  pink: { icon: 'bg-pink-100 text-pink-600 dark:bg-pink-900/60 dark:text-pink-200', card: 'from-pink-50/80 to-white border-pink-100 dark:from-pink-950/40 dark:to-slate-950 dark:border-pink-800/70', action: 'bg-pink-100/80 text-pink-700 dark:bg-pink-950/70 dark:text-pink-200' },
  blue: { icon: 'bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-200', card: 'from-sky-50/80 to-white border-sky-100 dark:from-sky-950/40 dark:to-slate-950 dark:border-sky-800/70', action: 'bg-sky-100/80 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200' },
};

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-7 sm:mb-9 max-w-3xl text-center">
      <p className="mb-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600">{eyebrow}</p>
      <h2 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-300 dark:text-slate-300">{description}</p>}
    </div>
  );
}

export function HomepageSections({ onStartFree }: { onStartFree: () => void }) {
  return (
    <main className="relative z-10 bg-background text-foreground">
      <section id="features" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Everything you need" title="Powerful Tools for Smarter Learning" description="AI + proven learning methods to help you achieve your exam goals." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map(({ title, description, action, href, icon: Icon, tone }) => (
              <article key={title} className={`group flex min-h-[220px] flex-col rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${toneClasses[tone].card}`}>
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-6 w-6" strokeWidth={2.2} /></div>
                <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
                <Link href={href} className={`mt-4 inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold ${toneClasses[tone].action}`}>
                  {action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Get started in 3 simple steps" title="Your Exam Preparation Journey" description="From exam selection to steady progress, with tools that support your routine." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map(({ number, title, description, icon: Icon }, index) => (
              <article key={number} className="relative flex min-h-[170px] flex-col items-center justify-center rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white dark:border-violet-800/70 dark:from-violet-950/40 dark:to-slate-950 px-5 py-6 text-center shadow-sm">
                <span className="absolute -top-3 left-5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-black text-white shadow-md">{number}</span>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Icon className="h-6 w-6" /></div>
                <h3 className="text-sm font-extrabold">{title}</h3>
                <p className="mt-1.5 max-w-xs text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
                {index < steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 text-violet-500 md:block" />}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="exams" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><SectionHeading eyebrow="Prepare for any exam" title="Trusted by Learners Across the World" description="Explore exam categories and build a preparation path around your goals." /></div>
            <Link href="/onboarding" className="mb-7 inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-xs font-bold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 sm:mb-9">View All Exams <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {examCategories.map(({ title, examples, icon: Icon, tone }) => (
              <Link href="/onboarding" key={title} className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0"><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">{examples}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-sky-50 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 dark:from-[#0b1228] dark:via-[#10162d] dark:to-[#0d1b31]">
        <div className="pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-7 lg:grid-cols-[.7fr_2fr_.7fr]">
          <div className="hidden text-center font-caveat text-2xl font-bold text-violet-600 lg:block">Clean &amp; modern interface <ArrowRight className="mx-auto mt-3 h-7 w-7 rotate-45" /></div>
          <div className="overflow-hidden rounded-2xl border border-white bg-white p-2 shadow-[0_20px_60px_rgba(86,78,180,.18)] sm:p-3 dark:border-violet-800/80 dark:shadow-[0_20px_60px_rgba(0,0,0,.4)]">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-9 items-center gap-2 border-b border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-950 px-3">
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-300" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-emerald-300" /></div>
                <div className="mx-auto w-1/2 rounded-md bg-slate-100 px-3 py-1 text-[8px] text-slate-400 dark:bg-slate-800 dark:text-slate-300">NeoMCQ · Your learning workspace</div>
              </div>
              <div className="grid min-h-[250px] grid-cols-[86px_1fr] sm:grid-cols-[120px_1fr]">
                <aside className="space-y-2 border-r border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-950 p-2.5">
                  <div className="mb-3 text-[10px] font-black text-violet-700">✦ NeoMCQ <span className="text-[7px]">AI</span></div>
                  {['Dashboard','Practice MCQs','Quizzes','Flashcards','Study Notes','AI Tutor','Study Plan','Analytics'].map((item, i) => <div key={item} className={`rounded-md px-2 py-1.5 text-[8px] font-semibold ${i === 0 ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-300'}`}>{item}</div>)}
                </aside>
                <div className="min-w-0 space-y-3 bg-slate-50 p-3 sm:p-4 dark:bg-slate-900">
                  <div className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-100 via-white to-sky-100 p-3 sm:p-4 dark:border-violet-800/80 dark:from-[#211b45] dark:via-[#111a32] dark:to-[#10283a]">
                    <div className="flex items-center justify-between gap-2">
                      <div><p className="text-[8px] font-bold uppercase tracking-wide text-violet-600">Your personal dashboard</p><h3 className="mt-1 text-sm font-black sm:text-lg">Good afternoon! <span aria-hidden="true">👋</span></h3><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-300">Let’s make today’s study session count.</p></div>
                      <img src="/assets/student-welcome-banner.webp" alt="3D student studying with a laptop" className="h-[88px] w-[120px] object-contain sm:h-[112px] sm:w-[155px]" loading="lazy" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:text-slate-300">Personalized study plan</span><span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:text-slate-300">Exam curriculum</span></div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-950 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-bold">Today’s Study Goal</p><p className="mt-1 text-[9px] text-slate-500 dark:text-slate-300">Continue at your own pace</p></div><span className="rounded-lg bg-violet-600 px-3 py-2 text-[9px] font-bold text-white">Start Studying →</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[42%] rounded-full bg-gradient-to-r from-violet-500 to-sky-400" /></div></div>
                  <div className="grid grid-cols-3 gap-2">{[{label:'Questions',value:'Practice'},{label:'Revision',value:'Flashcards'},{label:'Progress',value:'Insights'}].map(x => <div key={x.label} className="rounded-lg border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-950 p-2"><p className="text-[8px] text-slate-400">{x.label}</p><p className="mt-1 text-[9px] font-bold text-slate-700 dark:text-slate-100">{x.value}</p></div>)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden text-center font-caveat text-2xl font-bold text-violet-600 lg:block">Track your progress <BarChart3 className="mx-auto mt-3 h-8 w-8" /></div>
        </div>
      </section>

      <section id="why-neomcq" className="scroll-mt-24 px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Why choose NeoMCQ" title="Built for Real Learners, Real Progress" description="A focused set of tools to help you plan, practise, revise, and improve." />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-5 w-5" /></div>
                <h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Made for your study routine" title="Small Steps. Meaningful Progress." description="Build a steady preparation habit with tools that help you plan, practise, and review." />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { title: 'Plan with purpose', description: 'Organize your study time around your exam goals and curriculum.', icon: ClipboardList, tone: 'violet' },
              { title: 'Learn from every answer', description: 'Use clear explanations to understand concepts, not just memorize options.', icon: Lightbulb, tone: 'teal' },
              { title: 'See your progress', description: 'Review study activity and decide what to focus on next.', icon: Activity, tone: 'blue' },
            ].map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}><Icon className="h-5 w-5" /></div>
                <div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-500 via-indigo-600 to-purple-500 px-5 py-8 text-center text-white shadow-xl shadow-violet-200/60 sm:px-10 sm:py-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><GraduationCap className="h-7 w-7" /></div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Start Your Exam Preparation Today</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/85">Build a smarter study routine with NeoMCQ’s learning tools and personalized preparation workspace.</p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={onStartFree} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-violet-700 shadow-md transition hover:-translate-y-0.5 hover:bg-violet-50">Start Free Now <ArrowRight className="h-4 w-4" /></button>
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">View Plans <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] font-semibold text-white/90"><span><CheckCircle2 className="mr-1 inline h-3 w-3" />Start with your exam</span><span><CheckCircle2 className="mr-1 inline h-3 w-3" />Personalized preparation</span><span><CheckCircle2 className="mr-1 inline h-3 w-3" />Study at your pace</span></div>
        </div>
      </section>
    </main>
  );
}
