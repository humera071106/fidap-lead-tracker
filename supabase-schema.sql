-- FIDAP Lead Tracker - run once in a NEW Supabase project's SQL Editor.
-- All authenticated team members can read/add/update leads. Public/anonymous visitors cannot.
-- Only the database can write audit history. There is intentionally no lead deletion policy.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Team Member' check (length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text not null check (lead_number ~ '^[0-9]{4}$'),
  lead_name text check (lead_name is null or length(lead_name)<=100),
  interest_level text not null check (interest_level in ('Positive','Potential','No Response','Negative')),
  response_status text not null check (response_status in (
    'Interested','Will think about it','Requested callback','Waiting for details',
    'Cannot afford upfront fee','Training enquiry','No response','Not interested',
    'Converted / Paid','Other'
  )),
  comments text check (comments is null or length(comments)<=1500),
  follow_up_date date,
  created_by uuid not null references auth.users(id),
  created_by_name text not null,
  updated_by uuid not null references auth.users(id),
  updated_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_updates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  actor_name text not null,
  action text not null check(action in ('INSERT','UPDATE')),
  previous_data jsonb,
  new_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ix_leads_updated on public.leads(updated_at desc);
create index if not exists ix_leads_number on public.leads(lead_number);
create index if not exists ix_leads_interest on public.leads(interest_level);
create index if not exists ix_leads_followup on public.leads(follow_up_date);
create index if not exists ix_history_lead on public.lead_updates(lead_id,created_at desc);

-- Create a profile automatically when an admin creates an Auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id,display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'),''),
                             nullif(split_part(new.email,'@',1),''), 'Team Member'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for Auth users created before this SQL was run.
insert into public.profiles (id,display_name)
select id,coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'),''),
                   nullif(split_part(email,'@',1),''),'Team Member')
from auth.users on conflict(id) do nothing;

-- Ignore caller-supplied auditing columns, stamp all changes with the real logged-in employee.
create or replace function public.stamp_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_name text;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'Team login required'; end if;
  select display_name into v_name from public.profiles where id=v_user;
  if v_name is null or length(trim(v_name))=0 then raise exception 'A team profile is required'; end if;
  if TG_OP = 'INSERT' then
    new.created_at := now(); new.created_by := v_user; new.created_by_name := v_name;
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
  end if;
  new.updated_at := now(); new.updated_by := v_user; new.updated_by_name := v_name;
  return new;
end;
$$;
drop trigger if exists before_lead_save on public.leads;
create trigger before_lead_save before insert or update on public.leads
for each row execute function public.stamp_lead();

-- Audit history is written by database trigger, not user-provided client code.
create or replace function public.record_lead_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_updates(lead_id,actor_id,actor_name,action,previous_data,new_data)
  values (new.id,new.updated_by,new.updated_by_name,TG_OP,
          case when TG_OP='INSERT' then null else to_jsonb(old) end,to_jsonb(new));
  return new;
end;
$$;
drop trigger if exists after_lead_save on public.leads;
create trigger after_lead_save after insert or update on public.leads
for each row execute function public.record_lead_update();

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_updates enable row level security;

-- Authenticated team: all leads are shared; a person may only change their own profile name.
drop policy if exists team_read_profiles on public.profiles;
create policy team_read_profiles on public.profiles for select to authenticated using (true);
drop policy if exists team_update_self on public.profiles;
create policy team_update_self on public.profiles for update to authenticated
  using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists team_read_leads on public.leads;
create policy team_read_leads on public.leads for select to authenticated using (true);
drop policy if exists team_add_leads on public.leads;
create policy team_add_leads on public.leads for insert to authenticated with check (created_by=auth.uid());
drop policy if exists team_edit_leads on public.leads;
create policy team_edit_leads on public.leads for update to authenticated
  using (true) with check (updated_by=auth.uid());

drop policy if exists team_read_history on public.lead_updates;
create policy team_read_history on public.lead_updates for select to authenticated using (true);

revoke all on public.profiles, public.leads, public.lead_updates from anon;
revoke all on public.profiles, public.leads, public.lead_updates from authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select,insert,update on public.leads to authenticated;
grant select on public.lead_updates to authenticated;

-- Enable live database notifications (idempotent on re-running script).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;

-- Keep new public account sign-ups DISABLED in Authentication settings.
-- Create employees using Authentication > Users > Add user.
