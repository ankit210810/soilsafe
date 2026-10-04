-- SoilSafe live database setup for Supabase
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

drop table if exists public.reports cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reporter text,
  reporter_type text not null default 'other_place' check (reporter_type in ('lpu_student', 'other_place')),
  location text not null,
  category text not null,
  date_noticed date not null default current_date,
  description text not null,
  photo_url text,
  status text not null default 'new' check (status in ('new','review','responded','confirmed')),
  evidence_level text not null default 'visual' check (evidence_level in ('visual','investigation','laboratory')),
  solution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_user_id_idx on public.reports(user_id);
create index reports_status_idx on public.reports(status);
create index reports_created_at_idx on public.reports(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger reports_touch_updated_at before update on public.reports
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

create policy "profile own read" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "profile own insert" on public.profiles
for insert to authenticated with check (id = auth.uid() and role = 'student');

create policy "student sees own reports" on public.reports
for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "student creates own report" on public.reports
for insert to authenticated with check (user_id = auth.uid());

create policy "admin updates reports" on public.reports
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes reports" on public.reports
for delete to authenticated using (public.is_admin());

-- Storage bucket for optional report photos.
insert into storage.buckets (id, name, public)
values ('report-evidence', 'report-evidence', true)
on conflict (id) do nothing;

create policy "authenticated upload report evidence"
on storage.objects for insert to authenticated
with check (bucket_id = 'report-evidence');

create policy "public read report evidence"
on storage.objects for select to public
using (bucket_id = 'report-evidence');

-- IMPORTANT: after creating your admin account, run this once:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';

-- If upgrading an existing SoilSafe database, run these migrations once:
-- alter table public.reports add column if not exists reporter_type text not null default 'other_place';
-- alter table public.reports add constraint reports_reporter_type_check check (reporter_type in ('lpu_student','other_place'));
-- alter table public.reports add column if not exists evidence_level text not null default 'visual';
-- alter table public.reports add constraint reports_evidence_level_check check (evidence_level in ('visual','investigation','laboratory'));
