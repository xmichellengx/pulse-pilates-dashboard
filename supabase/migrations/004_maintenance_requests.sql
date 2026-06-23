-- Maintenance requests for existing customers.
-- Linked to the original order; warranty determined at request time
-- (within 6 months of delivery_date OR the order is still an active
-- rental → all charges waived).

create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete restrict,
  requested_date date not null default current_date,
  scheduled_date date,
  completed_date date,
  issue_description text,
  is_under_warranty boolean default false,
  is_active_rental boolean default false,
  transport_fee numeric default 0,
  labour_fee numeric default 0,
  parts_description text,
  parts_cost numeric default 0,
  total numeric default 0,
  status text default 'Pending', -- 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled'
  agent text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_maintenance_requests_order_id on maintenance_requests(order_id);
create index if not exists idx_maintenance_requests_status on maintenance_requests(status);
create index if not exists idx_maintenance_requests_scheduled_date on maintenance_requests(scheduled_date);

alter table maintenance_requests enable row level security;

create policy "Authenticated users can do everything"
  on maintenance_requests for all
  to authenticated
  using (true) with check (true);
