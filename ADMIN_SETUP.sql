-- =====================================================================
-- Código Anti-Atraso — Admin / Roles
-- Rode DEPOIS do SUPABASE_SETUP.sql.
-- =====================================================================

-- 1. Enum de roles -----------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

-- 2. Tabela user_roles -------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3. Função has_role (security definer p/ evitar recursão) ------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 4. Policies em user_roles -------------------------------------------
drop policy if exists "user_roles_select_self_or_admin" on public.user_roles;
create policy "user_roles_select_self_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "user_roles_admin_all" on public.user_roles;
create policy "user_roles_admin_all" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5. Políticas de admin nas tabelas existentes ------------------------
-- Admin pode ler tudo de todos.
drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select using (public.has_role(auth.uid(),'admin'));

drop policy if exists "tasks_admin_all" on public.tasks;
create policy "tasks_admin_all" on public.tasks
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "routine_admin_all" on public.routine_checks;
create policy "routine_admin_all" on public.routine_checks
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "habits_admin_all" on public.habits;
create policy "habits_admin_all" on public.habits
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "habit_logs_admin_all" on public.habit_logs;
create policy "habit_logs_admin_all" on public.habit_logs
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "goals_admin_all" on public.goals;
create policy "goals_admin_all" on public.goals
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "finance_admin_all" on public.finance_entries;
create policy "finance_admin_all" on public.finance_entries
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 6. Promove denis257815@gmail.com a super admin ----------------------
-- (cria conta primeiro pelo app, depois roda este bloco)
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'denis257815@gmail.com'
on conflict (user_id, role) do nothing;
