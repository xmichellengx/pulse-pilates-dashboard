-- One row per follow-up call against a rental order.
-- Timeline items become "done" once a follow-up exists with the
-- matching (order_id, month_mark). Ad-hoc follow-ups have month_mark
-- = null.

create table if not exists rental_follow_ups (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  follow_up_date date not null default current_date,
  agent text,
  month_mark int,                          -- 1, 2, 3, or null (ad-hoc)
  contacted text,                          -- 'Yes' | 'No Answer' | 'Voicemail' | 'WhatsApp Seen'
  outcome text,                            -- 'On track' | 'Wants to convert' | 'Wants to terminate' | 'At risk' | 'Complaint'
  notes text,
  payment_confirmed boolean default false,
  next_action text,
  next_follow_up_date date,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_rental_follow_ups_order_id on rental_follow_ups(order_id);
create index if not exists idx_rental_follow_ups_outcome on rental_follow_ups(outcome);

alter table rental_follow_ups enable row level security;

create policy "Authenticated users can do everything"
  on rental_follow_ups for all
  to authenticated
  using (true) with check (true);
