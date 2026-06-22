-- Adds document upload URLs + B2B flag to rental orders.
-- All columns are nullable so existing rows stay valid.

alter table orders
  add column if not exists payex_proof_url text,
  add column if not exists customer_id_url text,
  add column if not exists leasing_contract_url text,
  add column if not exists is_b2b boolean default false;

-- Storage bucket `rental-documents` is created via the Storage API
-- (see scripts/setup-storage.ts) rather than SQL, since storage.buckets
-- inserts require service-role privileges and the API path is cleaner.
