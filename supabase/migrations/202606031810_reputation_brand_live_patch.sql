-- Idempotent live patch for the finished Reputation Channel + Brand Capture schema.
-- This is intentionally consolidated because the live project had partial
-- Geothority schema without Supabase migration history.

create extension if not exists pgcrypto;

create table if not exists public.reputation_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_review_link text,
  sms_delay_minutes integer not null default 60,
  positive_threshold integer not null default 4,
  sms_template text not null default 'Hi {customer_name}! Thanks for choosing {business_name}. How was your experience? Reply 1-5 and we''ll take it from there. (Reply STOP to opt out)',
  active boolean not null default false,
  enabled_channels text not null default 'sms',
  primary_channel text not null default 'sms',
  email_subject text not null default 'Quick question about your experience with {business_name}',
  email_template text not null default 'Thanks for choosing {business_name}. How was your experience? Use this private link to leave quick feedback: {review_link}',
  send_both_delay_minutes integer not null default 240,
  max_reminders integer not null default 1,
  reminder_delay_hours integer not null default 48,
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reputation_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  business_key text not null default 'business',
  phone text,
  name text,
  email text,
  opt_out boolean not null default false,
  sms_opt_out boolean not null default false,
  email_opt_out boolean not null default false,
  preferred_channel text,
  source text default 'manual',
  last_contacted_at timestamptz,
  last_reputation_request_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  business_key text not null default 'business',
  contact_id uuid not null references public.reputation_contacts(id) on delete cascade,
  trigger_source text not null default 'manual',
  external_event_id text,
  status text not null default 'pending',
  score integer,
  feedback_text text,
  review_token text unique,
  google_link_sent boolean not null default false,
  template_used text,
  channel text not null default 'sms',
  requested_channels text[] not null default array['sms']::text[],
  delivery_state text not null default 'pending',
  send_attempt_count integer not null default 0,
  last_send_attempt_at timestamptz,
  last_send_error text,
  next_retry_at timestamptz,
  dead_lettered_at timestamptz,
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_message_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.reputation_requests(id) on delete cascade,
  direction text not null,
  body text not null,
  provider_sid text,
  attempt_number integer not null default 1,
  delivery_state text not null default 'sent',
  error_detail text,
  simulated boolean not null default true,
  channel text,
  recipient text,
  provider text,
  provider_message_id text,
  template_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  category_label text not null,
  icon text not null default '*',
  template_text text not null,
  is_default boolean not null default false,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reputation_feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  request_id uuid references public.reputation_requests(id) on delete set null,
  business_id text not null,
  business_key text not null default 'business',
  severity text default 'medium',
  topic text,
  feedback_text text not null,
  follow_up_status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_owner_name text,
  follow_up_due_date date,
  resolution_notes text,
  recovery_outcome text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reputation_proof_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  business_id text not null,
  business_key text not null default 'business',
  request_id uuid references public.reputation_requests(id) on delete set null,
  snippet text not null,
  topic text,
  sentiment text default 'positive',
  approved boolean not null default false,
  published_to text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.business_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_key text not null,
  business_name text not null,
  website_url text,
  logo_url text,
  logo_source text,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_family_hint text,
  hero_image_url text,
  service_image_urls text[] not null default '{}',
  business_category text,
  motif text,
  tone text,
  confidence_score integer not null default 0,
  extraction_notes text[] not null default '{}',
  manual_overrides jsonb not null default '{}'::jsonb,
  source_scan_id uuid references public.scans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, business_key)
);

alter table if exists public.reputation_requests
  add column if not exists brand_profile_id uuid references public.business_brand_profiles(id) on delete set null;

create table if not exists public.reputation_event_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid references public.reputation_requests(id) on delete cascade,
  proof_asset_id uuid references public.reputation_proof_assets(id) on delete set null,
  feedback_item_id uuid references public.reputation_feedback_items(id) on delete set null,
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  channel text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists reputation_contacts_user_business_key_phone_idx
  on public.reputation_contacts (user_id, business_key, phone)
  where phone is not null;

create index if not exists reputation_requests_contact_created_idx
  on public.reputation_requests (contact_id, created_at desc);

create index if not exists reputation_requests_user_business_key_created_idx
  on public.reputation_requests (user_id, business_key, created_at desc);

create unique index if not exists reputation_requests_user_external_event_idx
  on public.reputation_requests (user_id, external_event_id)
  where external_event_id is not null;

create index if not exists reputation_requests_delivery_state_idx
  on public.reputation_requests (user_id, delivery_state, created_at desc);

create index if not exists reputation_requests_next_retry_idx
  on public.reputation_requests (delivery_state, next_retry_at)
  where next_retry_at is not null;

create index if not exists reputation_requests_channel_idx
  on public.reputation_requests (user_id, channel, created_at desc);

create index if not exists reputation_message_log_request_attempt_idx
  on public.reputation_message_log (request_id, attempt_number desc, created_at desc);

create index if not exists reputation_message_log_channel_idx
  on public.reputation_message_log (channel, created_at desc);

create index if not exists reputation_templates_user_idx
  on public.reputation_templates (user_id, created_at asc);

create index if not exists reputation_feedback_items_follow_up_due_date_idx
  on public.reputation_feedback_items (user_id, follow_up_due_date);

create index if not exists reputation_feedback_items_user_business_key_created_idx
  on public.reputation_feedback_items (user_id, business_key, created_at desc);

create unique index if not exists reputation_feedback_items_request_id_unique
  on public.reputation_feedback_items (request_id)
  where request_id is not null;

create index if not exists reputation_proof_assets_user_business_key_created_idx
  on public.reputation_proof_assets (user_id, business_key, created_at desc);

create unique index if not exists reputation_proof_assets_request_id_unique
  on public.reputation_proof_assets (request_id)
  where request_id is not null;

create index if not exists reputation_event_ledger_user_created_idx
  on public.reputation_event_ledger (user_id, created_at desc);

create index if not exists reputation_event_ledger_request_created_idx
  on public.reputation_event_ledger (request_id, created_at desc)
  where request_id is not null;

create index if not exists reputation_event_ledger_event_type_idx
  on public.reputation_event_ledger (event_type, created_at desc);

alter table public.reputation_settings enable row level security;
alter table public.reputation_templates enable row level security;
alter table public.business_brand_profiles enable row level security;
alter table public.reputation_event_ledger enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_settings' and policyname = 'reputation_settings_select_own') then
    create policy "reputation_settings_select_own" on public.reputation_settings for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_settings' and policyname = 'reputation_settings_upsert_own') then
    create policy "reputation_settings_upsert_own" on public.reputation_settings for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_settings' and policyname = 'reputation_settings_update_own') then
    create policy "reputation_settings_update_own" on public.reputation_settings for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_templates' and policyname = 'reputation_templates_select_own') then
    create policy "reputation_templates_select_own" on public.reputation_templates for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_templates' and policyname = 'reputation_templates_insert_own') then
    create policy "reputation_templates_insert_own" on public.reputation_templates for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_templates' and policyname = 'reputation_templates_update_own') then
    create policy "reputation_templates_update_own" on public.reputation_templates for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_templates' and policyname = 'reputation_templates_delete_own') then
    create policy "reputation_templates_delete_own" on public.reputation_templates for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_select_own') then
    create policy "business_brand_profiles_select_own" on public.business_brand_profiles for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_insert_own') then
    create policy "business_brand_profiles_insert_own" on public.business_brand_profiles for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_update_own') then
    create policy "business_brand_profiles_update_own" on public.business_brand_profiles for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_delete_own') then
    create policy "business_brand_profiles_delete_own" on public.business_brand_profiles for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reputation_event_ledger' and policyname = 'reputation_event_ledger_select_own') then
    create policy "reputation_event_ledger_select_own" on public.reputation_event_ledger for select using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.prevent_reputation_event_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'reputation_event_ledger is append-only';
end;
$$;

drop trigger if exists reputation_event_ledger_no_update on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_update
  before update on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();

drop trigger if exists reputation_event_ledger_no_delete on public.reputation_event_ledger;
create trigger reputation_event_ledger_no_delete
  before delete on public.reputation_event_ledger
  for each row
  execute function public.prevent_reputation_event_ledger_mutation();
