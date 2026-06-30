-- Michelle's personal AI-services side business — separate from Pulse Pilates
-- equipment sales. Gated to her email at both the API layer and via RLS so
-- Aisy can't see it even if a route is misconfigured.

create table if not exists ai_engagements (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  project_name text not null,
  client_email text,
  client_phone text,
  client_address text,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),

  -- Upfront / setup
  upfront_items jsonb not null default '[]',  -- [{ description: 'Simplified landing page' }, ...]
  upfront_amount numeric not null default 0,
  upfront_paid_date date,

  -- Maintenance plan
  maintenance_start_date date,
  trial_months_free integer default 0,
  year_one_monthly numeric default 0,
  year_two_plus_monthly numeric default 0,

  -- Notes
  scope_notes text,
  internal_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ai_invoices (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references ai_engagements(id) on delete cascade,
  invoice_number text unique not null,        -- e.g. AI-2026-0001
  invoice_type text not null check (invoice_type in ('upfront','maintenance')),

  -- Period covered (for maintenance — e.g. "Mar 2026")
  period_label text,
  period_year integer,
  period_month integer,

  amount numeric not null,

  invoice_date date not null default current_date,
  due_date date,
  payment_date date,                          -- nullable until paid

  status text not null default 'draft' check (status in ('draft','sent','paid','void')),

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_ai_invoices_engagement on ai_invoices(engagement_id);
create index if not exists idx_ai_invoices_invoice_date on ai_invoices(invoice_date);
create index if not exists idx_ai_invoices_payment_date on ai_invoices(payment_date);

create sequence if not exists ai_invoice_seq start 1;

alter table ai_engagements enable row level security;
alter table ai_invoices enable row level security;

-- RLS: only Michelle's logged-in account can touch either table.
-- This is defence-in-depth alongside the API-layer email check.
create policy "Owner-only access"
  on ai_engagements for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'michelleleng.ng@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'michelleleng.ng@gmail.com');

create policy "Owner-only access"
  on ai_invoices for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'michelleleng.ng@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'michelleleng.ng@gmail.com');
