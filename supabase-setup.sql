-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business text,
  email text not null,
  package text,
  message text not null
);

alter table public.enquiries enable row level security;

create policy "Approved staff can view enquiries"
on public.enquiries for select
to authenticated
using (
  (auth.jwt() ->> 'email') in (
    'ntsakisi@mrweb.co.za',
    'kgotsofatjo@mrweb.co.za',
    'admin@mweb.co.za'
  )
);
