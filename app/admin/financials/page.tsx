import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RefreshCw, Wallet, ReceiptText, BrainCircuit, Server, Target, ShieldCheck, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const money = (value: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'INR' ? 0 : 4 }).format(value);

const startOfWindow = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).toISOString();
};

const successfulStatuses = new Set(['captured', 'paid', 'success', 'successful', 'completed']);

export default async function FinancialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);
  const roleNames = (roleRows ?? []).flatMap((row: any) => {
    const roles = row.roles;
    return (Array.isArray(roles) ? roles : roles ? [roles] : []).map((role: any) => String(role.name ?? '').toLowerCase());
  });
  if (!roleNames.some((role) => ['admin', 'super_admin', 'owner'].includes(role))) redirect('/dashboard');

  const from = startOfWindow();
  const [paymentResult, subscriptionResult, planResult, aiResult, expenseResult] = await Promise.all([
    supabase.from('payments').select('id, amount, currency, status, created_at, subscription_id').gte('created_at', from).order('created_at', { ascending: false }).limit(5000),
    supabase.from('subscriptions').select('id, plan_id, plan_code, status, amount, currency, created_at, started_at').gte('created_at', from).order('created_at', { ascending: false }).limit(5000),
    supabase.from('subscription_plans').select('id, name, slug, price_inr, price_usd, billing_interval, is_active').order('price_inr'),
    supabase.from('ai_cost_events' as any).select('id, provider, model, actual_provider_cost, ai_infrastructure_cost, created_at').gte('created_at', from).order('created_at', { ascending: false }).limit(10000),
    supabase.from('operating_expense_entries' as any).select('id, category, description, amount, currency, incurred_on, verified').gte('incurred_on', from.slice(0, 10)).order('incurred_on', { ascending: false }).limit(5000),
  ]);

  const payments = paymentResult.data ?? [];
  const subscriptions = subscriptionResult.data ?? [];
  const plans = planResult.data ?? [];
  const aiEvents = aiResult.data ?? [];
  const expenses = expenseResult.data ?? [];
  const successfulPayments = payments.filter((payment: any) => successfulStatuses.has(String(payment.status ?? '').toLowerCase()));
  const inrPayments = successfulPayments.filter((payment: any) => String(payment.currency ?? 'INR').toUpperCase() === 'INR');
  const collectedInr = inrPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0);
  const nonInrPaymentCount = successfulPayments.length - inrPayments.length;
  const recordedAiUsd = aiEvents.reduce((sum: number, event: any) => sum + Number(event.actual_provider_cost ?? 0) + Number(event.ai_infrastructure_cost ?? 0), 0);
  const inrExpenses = expenses.filter((entry: any) => String(entry.currency ?? 'INR').toUpperCase() === 'INR');
  const recordedOtherExpenses = inrExpenses.reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0);
  const hasMissingExpenseCoverage = expenses.length === 0;
  const netProfitCalculable = !hasMissingExpenseCoverage && recordedAiUsd === 0 && nonInrPaymentCount === 0;
  const netProfit = netProfitCalculable ? collectedInr - recordedOtherExpenses : null;
  const target = 250000;
  const targetProgress = netProfit === null ? 0 : Math.max(0, Math.min(100, (netProfit / target) * 100));
  const planCounts = plans.map((plan: any) => {
    const related = subscriptions.filter((sub: any) => sub.plan_id === plan.id || String(sub.plan_code ?? '').toLowerCase() === String(plan.slug ?? '').toLowerCase());
    const paymentIds = new Set(inrPayments.map((p: any) => p.subscription_id).filter(Boolean));
    const paidRelated = related.filter((sub: any) => paymentIds.has(sub.id));
    return { ...plan, subscriptions: related.length, paid: paidRelated.length };
  });
  const months = Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (2 - index));
    const key = date.toISOString().slice(0, 7);
    const label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const amount = inrPayments.filter((p: any) => String(p.created_at).slice(0, 7) === key).reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
    return { key, label, amount };
  });
  const maxMonth = Math.max(1, ...months.map((month) => month.amount));
  const errors = [
    paymentResult.error ? 'Payments are not readable for this account.' : null,
    subscriptionResult.error ? 'Subscription records are not readable for this account.' : null,
    aiResult.error ? 'AI cost records are not readable for this account.' : null,
    expenseResult.error ? 'Operating expense ledger is not readable for this account.' : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8 lg:px-12 dark:bg-[#070b17] dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"><ShieldCheck size={14} /> Admin finance · Live database records</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Financial overview</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Revenue, plan purchases, AI usage costs, and operating expenses for the last three months.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:self-auto dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><RefreshCw size={15} /> Updated {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST</div>
        </header>

        {errors.length > 0 && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} /> Some live data could not be loaded</div><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></section>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Collected revenue · INR" value={money(collectedInr)} icon={<Wallet size={19} />} detail={`${inrPayments.length} successful INR payments`} />
          <Metric title="Successful purchases" value={String(successfulPayments.length)} icon={<ReceiptText size={19} />} detail={`${nonInrPaymentCount} successful payments in other currencies`} />
          <Metric title="AI provider + infrastructure" value={money(recordedAiUsd, 'USD')} icon={<BrainCircuit size={19} />} detail={`${aiEvents.length} recorded AI cost events · source currency`} />
          <Metric title="Other recorded expenses" value={money(recordedOtherExpenses)} icon={<Server size={19} />} detail={`${inrExpenses.length} INR expense entries`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Revenue trend</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Successful INR payments grouped by month</p></div><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">INR · Actuals</span></div>
            <div className="mt-8 grid h-52 grid-cols-3 items-end gap-5 border-b border-slate-200 pb-2 dark:border-slate-800">
              {months.map((month) => <div key={month.key} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-xs font-semibold tabular-nums">{money(month.amount)}</span><div className="flex w-full max-w-20 items-end justify-center" style={{ height: '70%' }}><div className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-indigo-400 transition-all" style={{ height: `${Math.max(month.amount > 0 ? 8 : 2, (month.amount / maxMonth) * 100)}%` }} /></div><span className="text-xs text-slate-500">{month.label}</span></div>)}
            </div>
            <p className="mt-4 text-xs text-slate-500">Only successful INR payment rows are included. Pending, failed, and other-currency payments are excluded from this chart.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2"><Target size={19} className="text-violet-500" /><h2 className="text-lg font-semibold">Net profit goal</h2></div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Target: {money(target)} across the selected period</p>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><div className="text-sm font-semibold text-amber-900 dark:text-amber-200">{netProfit === null ? 'Actual net profit not yet calculable' : money(netProfit)}</div><p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">{netProfit === null ? 'Expense coverage and currency reconciliation are incomplete. This goal is not counted as achieved.' : 'Calculated from successful INR collections less recorded INR operating expenses.'}</p></div>
            <div className="mt-5 flex items-center justify-between text-sm"><span className="text-slate-500">Verified progress</span><span className="font-semibold tabular-nums">{netProfit === null ? '—' : `${targetProgress.toFixed(1)}%`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-violet-600" style={{ width: `${targetProgress}%` }} /></div>
            <p className="mt-3 text-xs text-slate-500">AI costs are recorded in provider source currency and must be reconciled to INR; they are not silently subtracted using an assumed exchange rate.</p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Purchases by plan</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Plan prices from NeoMCQ configuration; purchase counts from matching subscription/payment records.</p>
            <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {planCounts.map((plan: any) => <div key={plan.id} className="flex items-center justify-between gap-4 py-3"><div><div className="font-medium">{plan.name}</div><div className="mt-1 text-xs text-slate-500">{plan.billing_interval} · {plan.is_active ? 'Currently active plan' : 'Inactive plan'}</div></div><div className="text-right"><div className="font-semibold tabular-nums">{plan.paid} paid</div><div className="text-xs text-slate-500">{plan.subscriptions} subscriptions · {money(Number(plan.price_inr ?? 0))}/INR listed price</div></div></div>)}
              {plans.length === 0 && <p className="py-4 text-sm text-slate-500">Plan configuration is unavailable.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Expense coverage</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only entered expenses are included; missing costs are not estimated as actuals.</p>
            <div className="mt-5 space-y-3">
              <ExpenseLine label="AI provider cost" amount={money(aiEvents.reduce((sum: number, event: any) => sum + Number(event.actual_provider_cost ?? 0), 0), 'USD')} note="Source currency from AI cost events" />
              <ExpenseLine label="AI infrastructure allocation" amount={money(aiEvents.reduce((sum: number, event: any) => sum + Number(event.ai_infrastructure_cost ?? 0), 0), 'USD')} note="Source currency from AI cost events" />
              <ExpenseLine label="Hosting / database" amount="Not recorded" note="Add verified invoices to the operating expense ledger" />
              <ExpenseLine label="Payment processing fees" amount={expenses.filter((entry: any) => entry.category === 'payment_processing').length ? money(expenses.filter((entry: any) => entry.category === 'payment_processing').reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0)) : 'Not recorded'} note="INR expense entries" />
              <ExpenseLine label="Marketing / other operations" amount={expenses.filter((entry: any) => ['marketing','content_and_operations','other'].includes(entry.category)).length ? money(expenses.filter((entry: any) => ['marketing','content_and_operations','other'].includes(entry.category)).reduce((sum: number, entry: any) => sum + Number(entry.amount ?? 0), 0)) : 'Not recorded'} note="INR expense entries" />
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">Operating expense ledger is ready for verified entries. No expenses have been invented to make profit match a target.</div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800"><span>Source: NeoMCQ payments, subscriptions, plan catalog, AI cost events, and operating expense ledger.</span><span>Amounts are reported only where the source currency and record status are known.</span></footer>
      </div>
    </main>
  );
}

function Metric({ title, value, icon, detail }: { title: string; value: string; icon: React.ReactNode; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-500 dark:text-slate-400">{title}</span><span className="rounded-xl bg-violet-50 p-2 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{icon}</span></div><div className="mt-4 text-2xl font-bold tracking-tight tabular-nums">{value}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</div></div>;
}

function ExpenseLine({ label, amount, note }: { label: string; amount: string; note: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-800"><div><div className="text-sm font-medium">{label}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div><div className="text-right text-sm font-semibold tabular-nums">{amount}</div></div>;
}
