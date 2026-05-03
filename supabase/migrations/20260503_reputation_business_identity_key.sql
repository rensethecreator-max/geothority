-- Add stable business identity keys so reputation records do not fragment on freeform business_id text.

alter table if exists public.reputation_contacts
  add column if not exists business_key text;

alter table if exists public.reputation_requests
  add column if not exists business_key text;

alter table if exists public.reputation_feedback_items
  add column if not exists business_key text;

alter table if exists public.reputation_proof_assets
  add column if not exists business_key text;

update public.reputation_contacts
set business_key = regexp_replace(
  regexp_replace(
    regexp_replace(lower(trim(coalesce(business_id, ''))), '&', ' and ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
)
where coalesce(business_key, '') = '';

update public.reputation_requests
set business_key = regexp_replace(
  regexp_replace(
    regexp_replace(lower(trim(coalesce(business_id, ''))), '&', ' and ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
)
where coalesce(business_key, '') = '';

update public.reputation_feedback_items
set business_key = regexp_replace(
  regexp_replace(
    regexp_replace(lower(trim(coalesce(business_id, ''))), '&', ' and ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
)
where coalesce(business_key, '') = '';

update public.reputation_proof_assets
set business_key = regexp_replace(
  regexp_replace(
    regexp_replace(lower(trim(coalesce(business_id, ''))), '&', ' and ', 'g'),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
)
where coalesce(business_key, '') = '';

update public.reputation_contacts
set business_key = 'business'
where coalesce(business_key, '') = '';

update public.reputation_requests
set business_key = 'business'
where coalesce(business_key, '') = '';

update public.reputation_feedback_items
set business_key = 'business'
where coalesce(business_key, '') = '';

update public.reputation_proof_assets
set business_key = 'business'
where coalesce(business_key, '') = '';

with ranked_contacts as (
  select
    id,
    first_value(id) over (
      partition by user_id, business_key, phone
      order by created_at asc, id asc
    ) as survivor_id,
    row_number() over (
      partition by user_id, business_key, phone
      order by created_at asc, id asc
    ) as rn
  from public.reputation_contacts
)
update public.reputation_requests as requests
set contact_id = ranked_contacts.survivor_id
from ranked_contacts
where requests.contact_id = ranked_contacts.id
  and ranked_contacts.rn > 1
  and ranked_contacts.survivor_id <> ranked_contacts.id;

with ranked_contacts as (
  select
    id,
    row_number() over (
      partition by user_id, business_key, phone
      order by created_at asc, id asc
    ) as rn
  from public.reputation_contacts
)
delete from public.reputation_contacts contacts
using ranked_contacts
where contacts.id = ranked_contacts.id
  and ranked_contacts.rn > 1;

alter table if exists public.reputation_contacts
  alter column business_key set not null;

alter table if exists public.reputation_requests
  alter column business_key set not null;

alter table if exists public.reputation_feedback_items
  alter column business_key set not null;

alter table if exists public.reputation_proof_assets
  alter column business_key set not null;

drop index if exists public.reputation_contacts_business_phone_idx;
drop index if exists public.reputation_contacts_user_business_phone_idx;

create unique index if not exists reputation_contacts_user_business_key_phone_idx
  on public.reputation_contacts (user_id, business_key, phone);

create index if not exists reputation_requests_user_business_key_created_idx
  on public.reputation_requests (user_id, business_key, created_at desc);

create index if not exists reputation_feedback_items_user_business_key_created_idx
  on public.reputation_feedback_items (user_id, business_key, created_at desc);

create index if not exists reputation_proof_assets_user_business_key_created_idx
  on public.reputation_proof_assets (user_id, business_key, created_at desc);
