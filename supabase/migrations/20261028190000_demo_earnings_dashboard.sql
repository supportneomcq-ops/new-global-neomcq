-- Dedicated simulated earnings for the NeoMCQ admin demo dashboard.
-- Intentionally isolated from payments, subscriptions, and Razorpay event tables.

create table if not exists public.demo_earnings_monthly (
  id uuid primary key default gen_random_uuid(),
  period_start date not null unique,
  period_label text not null,
  currency text not null default 'INR' check (currency = 'INR'),
  gross_revenue numeric(12,2) not null check (gross_revenue >= 0),
  operating_expenses numeric(12,2) not null check (operating_expenses >= 0),
  net_profit numeric(12,2) not null check (net_profit >= 0),
  target_profit numeric(12,2) not null check (target_profit >= 0),
  is_demo boolean not null default true check (is_demo = true),
  demo_notice text not null default 'SIMULATED DEMO FIGURES — NOT ACTUAL EARNINGS',
  created_at timestamptz not null default now(),
  constraint demo_earnings_profit_math check (net_profit = gross_revenue - operating_expenses)
);

alter table public.demo_earnings_monthly enable row level security;

drop policy if exists "Admins can view demo earnings only" on public.demo_earnings_monthly;
create policy "Admins can view demo earnings only"
on public.demo_earnings_monthly
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.name in ('admin', 'super_admin')
  )
);

revoke all on table public.demo_earnings_monthly from anon, authenticated;
grant select on table public.demo_earnings_monthly to authenticated;

insert into public.demo_earnings_monthly
  (period_start, period_label, currency, gross_revenue, operating_expenses, net_profit, target_profit, is_demo, demo_notice)
values
  ('2026-08-01', 'Aug 2026', 'INR', 90000, 25000, 65000, 75000, true, 'SIMULATED DEMO FIGURES — NOT ACTUAL EARNINGS'),
  ('2026-09-01', 'Sep 2026', 'INR', 115000, 30000, 85000, 85000, true, 'SIMULATED DEMO FIGURES — NOT ACTUAL EARNINGS'),
  ('2026-10-01', 'Oct 2026 (MTD)', 'INR', 145000, 45000, 100000, 90000, true, 'SIMULATED DEMO FIGURES — NOT ACTUAL EARNINGS')
on conflict (period_start) do update set
  period_label = excluded.period_label,
  currency = excluded.currency,
  gross_revenue = excluded.gross_revenue,
  operating_expenses = excluded.operating_expenses,
  net_profit = excluded.net_profit,
  target_profit = excluded.target_profit,
  is_demo = true,
  demo_notice = excluded.demo_notice;
