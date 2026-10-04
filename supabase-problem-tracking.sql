-- SoilSafe: non-destructive upgrade for Problem Numbers + Tracking + Notifications
-- Run this ONCE in Supabase SQL Editor after your existing SoilSafe schema.
-- This migration does NOT delete existing users, profiles, or reports.

create extension if not exists pgcrypto;

-- 1) Profile fields used by the current SoilSafe profile UI.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists affiliation_type text not null default 'other_place';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 2) Every report gets a human-friendly Problem Number.
create sequence if not exists public.soilsafe_problem_seq;

alter table public.reports add column if not exists problem_number text;
alter table public.reports add column if not exists admin_message text;
alter table public.reports add column if not exists resolved_at timestamptz;

create or replace function public.next_soilsafe_problem_number()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.soilsafe_problem_seq');
  return 'SS-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.assign_soilsafe_problem_number()
returns trigger
language plpgsql
as $$
begin
  if new.problem_number is null or btrim(new.problem_number) = '' then
    new.problem_number := public.next_soilsafe_problem_number();
  end if;
  return new;
end;
$$;

drop trigger if exists reports_assign_problem_number on public.reports;
create trigger reports_assign_problem_number
before insert on public.reports
for each row execute function public.assign_soilsafe_problem_number();

-- Backfill existing reports that were created before Problem Numbers existed.
with numbered as (
  select id,
         'SS-' || to_char(created_at, 'YYYY') || '-' || lpad(row_number() over (order by created_at, id)::text, 6, '0') as pn
  from public.reports
  where problem_number is null
)
update public.reports r
set problem_number = n.pn
from numbered n
where r.id = n.id;

create unique index if not exists reports_problem_number_uidx
on public.reports(problem_number);

-- Keep the sequence ahead of all existing numbers so new reports never collide.
select setval(
  'public.soilsafe_problem_seq',
  greatest(
    coalesce((select max(regexp_replace(problem_number, '^SS-[0-9]{4}-', '')::bigint)
              from public.reports
              where problem_number ~ '^SS-[0-9]{4}-[0-9]+$'), 0),
    (select count(*) from public.reports)
  ),
  true
);

-- 3) In-app notification center.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'report_update'
    check (type in ('report_submitted','report_update','report_resolved','system')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
on public.notifications(user_id, created_at desc);
create index if not exists notifications_report_idx
on public.notifications(report_id);

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read"
on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "admins create notifications" on public.notifications;
create policy "admins create notifications"
on public.notifications
for insert to authenticated
with check (public.is_admin());

drop policy if exists "admins delete notifications" on public.notifications;
create policy "admins delete notifications"
on public.notifications
for delete to authenticated
using (public.is_admin());

-- 4) Secure admin update + notification in one transaction.
create or replace function public.admin_update_report(
  p_report_id uuid,
  p_status text,
  p_solution text,
  p_admin_message text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reports;
  notification_type text;
  notification_title text;
  notification_message text;
begin
  if not public.is_admin() then
    raise exception 'Only a SoilSafe admin can update reports';
  end if;

  if p_status not in ('new','review','responded','confirmed') then
    raise exception 'Invalid report status';
  end if;

  update public.reports
  set status = p_status,
      solution = nullif(btrim(p_solution), ''),
      admin_message = nullif(btrim(p_admin_message), ''),
      resolved_at = case when p_status = 'confirmed' then coalesce(resolved_at, now()) else null end,
      updated_at = now()
  where id = p_report_id
  returning * into r;

  if not found then
    raise exception 'Report not found';
  end if;

  if p_status = 'confirmed' then
    notification_type := 'report_resolved';
    notification_title := 'Your SoilSafe problem was resolved';
    notification_message := 'Problem ' || r.problem_number || ' has been marked as resolved.' ||
      case when coalesce(r.admin_message, '') <> '' then ' ' || r.admin_message else '' end;
  elsif p_status = 'responded' then
    notification_type := 'report_update';
    notification_title := 'SoilSafe has responded to your report';
    notification_message := 'There is a new response for problem ' || r.problem_number || '.' ||
      case when coalesce(r.admin_message, '') <> '' then ' ' || r.admin_message else '' end;
  elsif p_status = 'review' then
    notification_type := 'report_update';
    notification_title := 'Your SoilSafe report is under review';
    notification_message := 'Problem ' || r.problem_number || ' is now under review.';
  else
    notification_type := 'report_update';
    notification_title := 'Your SoilSafe report was updated';
    notification_message := 'Problem ' || r.problem_number || ' has been updated.';
  end if;

  insert into public.notifications(user_id, report_id, title, message, type)
  values(r.user_id, r.id, notification_title, notification_message, notification_type);

  return r;
end;
$$;

grant execute on function public.admin_update_report(uuid,text,text,text) to authenticated;

-- 5) Automatically notify the reporter when a report is submitted.
create or replace function public.notify_report_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, report_id, title, message, type)
  values(
    new.user_id,
    new.id,
    'SoilSafe report submitted',
    'Your report ' || new.problem_number || ' was submitted successfully. You can track its status from the Track page.',
    'report_submitted'
  );
  return new;
end;
$$;

drop trigger if exists reports_notify_submitted on public.reports;
create trigger reports_notify_submitted
after insert on public.reports
for each row execute function public.notify_report_submitted();

-- 6) Make sure the current user can update their own profile.
drop policy if exists "profile own update" on public.profiles;
create policy "profile own update"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

notify pgrst, 'reload schema';

-- ADMIN SETUP (run separately only if needed):
-- update public.profiles set role = 'admin' where id = 'YOUR_ADMIN_USER_UUID';

-- 7) Evidence level used by the report form (safe for existing databases).
alter table public.reports add column if not exists evidence_level text not null default 'visual';
alter table public.reports drop constraint if exists reports_evidence_level_check;
alter table public.reports add constraint reports_evidence_level_check
check (evidence_level in ('visual','investigation','laboratory'));

-- 8) Keep report status values compatible with the SoilSafe admin workflow.
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
check (status in ('new','review','responded','confirmed'));

-- 9) Ensure new accounts automatically receive a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role, affiliation_type)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 'student', 'other_place')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id, full_name, role, affiliation_type)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), 'student', 'other_place'
from auth.users u
left join public.profiles p on p.id=u.id
where p.id is null;

notify pgrst, 'reload schema';
