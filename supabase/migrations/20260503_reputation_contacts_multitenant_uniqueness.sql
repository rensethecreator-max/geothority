-- Fix reputation contact uniqueness to scope by user and normalized phone.

update public.reputation_contacts
set phone = regexp_replace(phone, '[^0-9+]', '', 'g')
where phone ~ '[^0-9+]';

with ranked as (
  select ctid,
         row_number() over (
           partition by user_id, business_id, phone
           order by created_at asc, id asc
         ) as rn
  from public.reputation_contacts
)
delete from public.reputation_contacts
where ctid in (
  select ctid
  from ranked
  where rn > 1
);

drop index if exists public.reputation_contacts_business_phone_idx;

create unique index if not exists reputation_contacts_user_business_phone_idx
  on public.reputation_contacts (user_id, business_id, phone);
