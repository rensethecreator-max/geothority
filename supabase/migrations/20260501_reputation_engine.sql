-- Reputation Engine foundational schema for Geothority

create table if not exists public.reputation_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_review_link text,
  sms_delay_minutes integer not null default 60,
  positive_threshold integer not null default 4,
  sms_template text not null default 'Hi {customer_name}! Thanks for choosing {business_name}. How was your experience? Reply 1-5 and we''ll take it from there. (Reply STOP to opt out)',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reputation_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  phone text not null,
  name text,
  email text,
  opt_out boolean not null default false,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create unique index if not exists reputation_contacts_business_phone_idx
  on public.reputation_contacts (business_id, phone);

create table if not exists public.reputation_requests (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  contact_id uuid not null references public.reputation_contacts(id) on delete cascade,
  trigger_source text not null default 'manual',
  external_event_id text,
  status text not null default 'pending',
  score integer,
  feedback_text text,
  review_token text unique,
  google_link_sent boolean not null default false,
  template_used text,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reputation_requests_contact_created_idx
  on public.reputation_requests (contact_id, created_at desc);

create table if not exists public.reputation_message_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.reputation_requests(id) on delete cascade,
  direction text not null,
  body text not null,
  provider_sid text,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  category_label text not null,
  icon text not null default '⭐',
  template_text text not null,
  is_default boolean not null default false,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reputation_templates_user_idx
  on public.reputation_templates (user_id, created_at asc);

create table if not exists public.reputation_feedback_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.reputation_requests(id) on delete set null,
  business_id text not null,
  severity text default 'medium',
  topic text,
  feedback_text text not null,
  follow_up_status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_proof_assets (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  request_id uuid references public.reputation_requests(id) on delete set null,
  snippet text not null,
  topic text,
  sentiment text default 'positive',
  approved boolean not null default false,
  published_to text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.reputation_settings enable row level security;
alter table public.reputation_templates enable row level security;

create policy if not exists "reputation_settings_select_own"
  on public.reputation_settings
  for select using (auth.uid() = user_id);

create policy if not exists "reputation_settings_upsert_own"
  on public.reputation_settings
  for insert with check (auth.uid() = user_id);

create policy if not exists "reputation_settings_update_own"
  on public.reputation_settings
  for update using (auth.uid() = user_id);

create policy if not exists "reputation_templates_select_own"
  on public.reputation_templates
  for select using (auth.uid() = user_id);

create policy if not exists "reputation_templates_insert_own"
  on public.reputation_templates
  for insert with check (auth.uid() = user_id);

create policy if not exists "reputation_templates_update_own"
  on public.reputation_templates
  for update using (auth.uid() = user_id);

create policy if not exists "reputation_templates_delete_own"
  on public.reputation_templates
  for delete using (auth.uid() = user_id);
