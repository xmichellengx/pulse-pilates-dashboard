-- Products / SKU table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku_code text,
  category text, -- 'reformer', 'cadillac', 'chair', 'barrel', 'tower', 'accessory'
  cost_rmb numeric,
  price_myr numeric,
  price_sgd numeric,
  p4b_t1_myr numeric,
  p4b_t2_myr numeric,
  p4b_t1_sgd numeric,
  p4b_t2_sgd numeric,
  rental_myr numeric, -- monthly rental price
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  case_code text unique,
  customer_name text not null,
  email text,
  phone text,
  product_id uuid references products(id),
  product_name text, -- denormalised for historical accuracy
  units integer default 1,
  mode text, -- 'Direct Purchase', 'Rental', 'P4B', 'CC Installment'
  payment_type text,
  amount numeric,
  monthly_rental numeric,
  balance numeric default 0,
  payment_date date,
  delivery_date date,
  location text,
  address text,
  status text default 'Pending', -- 'Pending', 'Pending Delivered', 'Delivered', 'Returned', 'Cancelled'
  lead_source text, -- 'Google', 'Facebook', 'Instagram', 'TikTok', 'XHS', 'Referral', 'Shopee', 'Shopify', 'Walk In', 'Repeat Customer'
  market text default 'MY', -- 'MY', 'SG', 'ID', 'JB'
  invoice_sent boolean default false,
  payex_status text,
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads tracker (daily counts by source)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  source text not null, -- 'Google', 'Facebook', 'Instagram', 'TikTok', 'XHS', 'Referral', 'Shopee', 'Shopify'
  market text default 'MY',
  count integer default 0,
  logged_by text,
  created_at timestamptz default now(),
  unique(date, source, market)
);

-- Call log
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  agent text not null,
  customer_name text,
  phone text,
  outcome text, -- 'Quoted', 'Followed Up', 'Closed', 'No Answer', 'Callback'
  notes text,
  order_id uuid references orders(id),
  created_at timestamptz default now()
);

-- Quotations
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text unique,
  created_by text,
  customer_name text,
  customer_email text,
  customer_phone text,
  market text default 'MY',
  pricing_tier text default 'Retail', -- 'Retail', 'P4B T1', 'P4B T2'
  items jsonb not null default '[]',
  subtotal numeric,
  delivery_fee numeric default 0,
  installation_fee numeric default 0,
  total numeric,
  customisation_notes text,
  pdf_url text,
  email_sent boolean default false,
  converted_to_order uuid references orders(id),
  expires_at date,
  created_at timestamptz default now()
);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  order_id uuid references orders(id),
  type text, -- 'Purchase', 'Rental', 'Deposit'
  customer_name text,
  customer_email text,
  amount numeric,
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Seed products
insert into products (name, sku_code, category, cost_rmb, price_myr, price_sgd, p4b_t2_myr, p4b_t1_myr, p4b_t2_sgd, p4b_t1_sgd, rental_myr) values
('Classic Reformer', 'CR', 'reformer', 3000, 4900, 2450, 4600, 4300, 2300, 2150, null),
('Alu II Reformer', 'AR', 'reformer', 2400, 3900, 1950, 3650, 3400, 1825, 1700, 390),
('Alu II Foldable', 'AFR', 'reformer', 2500, 4500, 2250, 4200, 3900, 2100, 1950, 450),
('Alu II Tower', 'AT', 'reformer', 3500, 5900, 2950, 5450, 5200, 2725, 2600, 590),
('Alu II Cadformer', 'ACF', 'reformer', 4200, 7900, 3950, 7450, 7200, 3725, 3600, null),
('Classic Tower', 'CT', 'tower', 3650, 6900, 3450, 6450, 6200, 3225, 3100, null),
('Cadillac (Fixed)', 'CAD', 'cadillac', 3650, 6500, 3250, 6000, 5600, 3000, 2800, null),
('Cadformer', 'CF', 'cadillac', 5400, 8800, 4400, 8200, 7600, 4100, 3800, null),
('Maple Chair', 'MC', 'chair', 1350, 2500, 1250, 2350, 2200, 1175, 1100, null),
('Alu Pro Chair', 'APC', 'chair', 1400, 2900, 1450, 2600, 2400, 1300, 1200, null),
('Barrel', 'BAR', 'barrel', 1650, 2700, 1350, 2500, 2300, 1250, 1150, null),
('Elevare II', 'EL2', 'reformer', 4800, 9500, 4750, 9000, 8500, 4500, 4250, null),
('Merrithew / Alu Pro', 'MAP', 'reformer', 3700, 9300, 4650, 8800, 8300, 4400, 4150, null),
('Pulse Classic Pro', 'PCP', 'reformer', 5500, 7800, 3900, 7300, 6800, 3650, 3400, null)
on conflict do nothing;

-- Enable RLS
alter table products enable row level security;
alter table orders enable row level security;
alter table leads enable row level security;
alter table calls enable row level security;
alter table quotations enable row level security;
alter table invoices enable row level security;

-- Allow authenticated users full access (Michelle + Aisy only)
create policy "Authenticated users can do everything" on products for all to authenticated using (true) with check (true);
create policy "Authenticated users can do everything" on orders for all to authenticated using (true) with check (true);
create policy "Authenticated users can do everything" on leads for all to authenticated using (true) with check (true);
create policy "Authenticated users can do everything" on calls for all to authenticated using (true) with check (true);
create policy "Authenticated users can do everything" on quotations for all to authenticated using (true) with check (true);
create policy "Authenticated users can do everything" on invoices for all to authenticated using (true) with check (true);
