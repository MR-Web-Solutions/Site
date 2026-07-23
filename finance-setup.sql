-- Run once in Supabase: SQL Editor > New query > paste this file > Run.
-- This creates the protected finance ledger and profit appropriation records.

alter table public.enquiries add column if not exists status text not null default 'open';
alter table public.enquiries add column if not exists completed_at timestamptz;

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_date date not null default current_date,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  description text not null,
  payment_method text,
  created_by text
);

create index if not exists financial_transactions_date_idx
on public.financial_transactions (transaction_date desc);

create table if not exists public.profit_allocations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  allocation_date date not null default current_date,
  period_label text not null,
  profit_base numeric(12,2) not null check (profit_base >= 0),
  total_allocated numeric(12,2) not null check (total_allocated >= 0),
  notes text,
  created_by text
);

create index if not exists profit_allocations_date_idx
on public.profit_allocations (allocation_date desc);

create table if not exists public.profit_allocation_items (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.profit_allocations(id) on delete cascade,
  recipient text not null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  amount numeric(12,2) not null check (amount >= 0)
);

alter table public.financial_transactions enable row level security;
alter table public.profit_allocations enable row level security;
alter table public.profit_allocation_items enable row level security;

create or replace function public.is_mr_web_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') in (
      'ntsakisi@mrweb.co.za',
      'kgotsofatjo@mrweb.co.za',
      'admin@mweb.co.za'
    ),
    false
  );
$$;

revoke all on function public.is_mr_web_staff() from public;
grant execute on function public.is_mr_web_staff() to authenticated;

drop policy if exists "Approved staff can update enquiries" on public.enquiries;
create policy "Approved staff can update enquiries"
on public.enquiries for update to authenticated
using (public.is_mr_web_staff()) with check (public.is_mr_web_staff());

drop policy if exists "Approved staff can delete enquiries" on public.enquiries;
create policy "Approved staff can delete enquiries"
on public.enquiries for delete to authenticated
using (public.is_mr_web_staff());

drop policy if exists "Approved staff can view financial transactions" on public.financial_transactions;
create policy "Approved staff can view financial transactions"
on public.financial_transactions for select to authenticated using (public.is_mr_web_staff());

drop policy if exists "Approved staff can add financial transactions" on public.financial_transactions;
create policy "Approved staff can add financial transactions"
on public.financial_transactions for insert to authenticated with check (public.is_mr_web_staff());

drop policy if exists "Approved staff can update financial transactions" on public.financial_transactions;
create policy "Approved staff can update financial transactions"
on public.financial_transactions for update to authenticated
using (public.is_mr_web_staff()) with check (public.is_mr_web_staff());

drop policy if exists "Approved staff can delete financial transactions" on public.financial_transactions;
create policy "Approved staff can delete financial transactions"
on public.financial_transactions for delete to authenticated using (public.is_mr_web_staff());

drop policy if exists "Approved staff can view profit allocations" on public.profit_allocations;
create policy "Approved staff can view profit allocations"
on public.profit_allocations for select to authenticated using (public.is_mr_web_staff());

drop policy if exists "Approved staff can add profit allocations" on public.profit_allocations;
create policy "Approved staff can add profit allocations"
on public.profit_allocations for insert to authenticated with check (public.is_mr_web_staff());

drop policy if exists "Approved staff can delete profit allocations" on public.profit_allocations;
create policy "Approved staff can delete profit allocations"
on public.profit_allocations for delete to authenticated using (public.is_mr_web_staff());

drop policy if exists "Approved staff can view allocation items" on public.profit_allocation_items;
create policy "Approved staff can view allocation items"
on public.profit_allocation_items for select to authenticated using (public.is_mr_web_staff());

drop policy if exists "Approved staff can add allocation items" on public.profit_allocation_items;
create policy "Approved staff can add allocation items"
on public.profit_allocation_items for insert to authenticated with check (public.is_mr_web_staff());

drop policy if exists "Approved staff can delete allocation items" on public.profit_allocation_items;
create policy "Approved staff can delete allocation items"
on public.profit_allocation_items for delete to authenticated using (public.is_mr_web_staff());
