import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

function money(value: number | string | null, currency: string) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function statusClass(status: string) {
  if (status === 'allocated') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (status === 'pending_settlement') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

export default async function AdminProfitReservePage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect('/login');

  const admin = getSupabaseAdmin();
  const { data: roleRows, error: roleError } = await admin
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id);

  const roles = roleRows?.map((row: any) => row.roles?.name).filter(Boolean) || [];
  if (roleError || !(roles.includes('admin') || roles.includes('super_admin'))) {
    redirect('/dashboard');
  }

  const [summaryResult, allocationResult] = await Promise.all([
    admin.from('platform_profit_allocation_summary').select('*').order('currency').order('allocation_status'),
    admin.from('platform_profit_allocations')
      .select('id, payment_id, user_id, plan_code, currency, gross_amount, tax_amount, processing_fee_amount, gateway_fee_tax_amount, net_collected_amount, owner_profit_amount, operating_pool_amount, allocation_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const summary = summaryResult.data || [];
  const allocations = allocationResult.data || [];
  const currencies = Array.from(new Set(summary.map((row: any) => row.currency)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
            <span className="text-xl font-black">20%</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">Owner Profit Reserve</h1>
            <p className="text-sm text-slate-400">Separate allocation for every captured Pro, Max, and Elite subscription payment.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          The reserve is calculated as 20% of net collected subscription revenue after recorded customer taxes, Razorpay fees, and tax on Razorpay fees. It is an accounting allocation, not an automatic bank transfer or a guarantee of final business profit.
        </p>
      </div>

      {summaryResult.error || allocationResult.error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
          Could not load the owner reserve ledger. Please check the production database migration and service-role access.
        </div>
      ) : null}

      {currencies.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#090D1E] p-8 text-center">
          <p className="font-bold text-slate-200">No subscription payments allocated yet</p>
          <p className="mt-2 text-sm text-slate-500">New captured subscription payments will appear here after Razorpay settlement details are recorded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {currencies.map((currency: string) => {
            const rows = summary.filter((row: any) => row.currency === currency);
            const allocated = rows.find((row: any) => row.allocation_status === 'allocated');
            const pending = rows.find((row: any) => row.allocation_status === 'pending_settlement');
            const reversed = rows.find((row: any) => row.allocation_status === 'reversed');
            return (
              <div key={currency} className="rounded-2xl border border-slate-800 bg-[#090D1E] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold tracking-widest text-slate-400">{currency}</span>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400">20% RESERVE</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Owner reserve allocated</p>
                  <p className="mt-1 text-3xl font-black text-emerald-400">{money(allocated?.owner_profit_amount, currency)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Operating pool</p>
                    <p className="mt-1 font-bold text-slate-200">{money(allocated?.operating_pool_amount, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Net collected</p>
                    <p className="mt-1 font-bold text-slate-200">{money(allocated?.net_collected_amount, currency)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Pending fee settlement</span>
                  <span className="font-bold text-amber-400">{pending?.payment_count || 0}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Reversed / refunded</span>
                  <span className="font-bold text-slate-300">{reversed?.payment_count || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#090D1E]">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-bold text-slate-100">Latest subscription allocations</h2>
          <p className="mt-1 text-xs text-slate-500">Most recent 100 records, including pending settlements and reversals.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Gross</th>
                <th className="p-4">Gateway costs</th>
                <th className="p-4">Net collected</th>
                <th className="p-4">Owner 20%</th>
                <th className="p-4">Operating 80%</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allocations.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-500">No allocation records yet.</td></tr>
              ) : allocations.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-800/30">
                  <td className="p-4 text-slate-400">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-bold text-slate-200">{row.plan_code}</td>
                  <td className="p-4 font-mono text-slate-400">{String(row.payment_id).slice(0, 8)}…</td>
                  <td className="p-4 text-slate-200">{money(row.gross_amount, row.currency)}</td>
                  <td className="p-4 text-slate-400">{money(Number(row.processing_fee_amount || 0) + Number(row.gateway_fee_tax_amount || 0), row.currency)}</td>
                  <td className="p-4 font-bold text-slate-200">{money(row.net_collected_amount, row.currency)}</td>
                  <td className="p-4 font-black text-emerald-400">{money(row.owner_profit_amount, row.currency)}</td>
                  <td className="p-4 text-slate-200">{money(row.operating_pool_amount, row.currency)}</td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass(row.allocation_status)}`}>
                      {row.allocation_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
