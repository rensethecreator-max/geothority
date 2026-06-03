-- Brand Capture + Reputation Channel Layer foundation

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

alter table public.business_brand_profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_select_own') then
    create policy "business_brand_profiles_select_own"
      on public.business_brand_profiles
      for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_insert_own') then
    create policy "business_brand_profiles_insert_own"
      on public.business_brand_profiles
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_update_own') then
    create policy "business_brand_profiles_update_own"
      on public.business_brand_profiles
      for update using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'business_brand_profiles' and policyname = 'business_brand_profiles_delete_own') then
    create policy "business_brand_profiles_delete_own"
      on public.business_brand_profiles
      for delete using (auth.uid() = user_id);
  end if;
end $$;

alter table if exists public.reputation_settings
  add column if not exists enabled_channels text not null default 'sms',
  add column if not exists primary_channel text not null default 'sms',
  add column if not exists email_subject text not null default 'Quick question about your experience with {business_name}',
  add column if not exists email_template text not null default 'Thanks for choosing {business_name}. How was your experience? Use this private link to leave quick feedback: {review_link}',
  add column if not exists send_both_delay_minutes integer not null default 240,
  add column if not exists max_reminders integer not null default 1,
  add column if not exists reminder_delay_hours integer not null default 48,
  add column if not exists quiet_hours_start text,
  add column if not exists quiet_hours_end text;

alter table if exists public.reputation_contacts
  alter column phone drop not null,
  add column if not exists sms_opt_out boolean not null default false,
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists preferred_channel text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists last_reputation_request_at timestamptz;

alter table if exists public.reputation_requests
  add column if not exists channel text not null default 'sms',
  add column if not exists requested_channels text[] not null default array['sms']::text[],
  add column if not exists brand_profile_id uuid references public.business_brand_profiles(id) on delete set null;

alter table if exists public.reputation_message_log
  add column if not exists channel text,
  add column if not exists recipient text,
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists template_id text,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz;

create index if not exists reputation_requests_channel_idx
  on public.reputation_requests (user_id, channel, created_at desc);

create index if not exists reputation_message_log_channel_idx
  on public.reputation_message_log (channel, created_at desc);
