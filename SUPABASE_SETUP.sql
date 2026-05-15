-- =====================================================================
-- Código Anti-Atraso — Schema inicial
-- COPIE este SQL e cole no SQL Editor do seu projeto Supabase.
-- Painel: https://supabase.com/dashboard/project/oqrdcmilnbgxashskmbt/sql
-- =====================================================================

-- 1. Profiles --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Tasks (tela Hoje) ----------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks(user_id, created_at desc);
alter table public.tasks enable row level security;
create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Rotina diária --------------------------------------------------
create table if not exists public.routine_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  item_key text not null,
  done boolean not null default true,
  primary key (user_id, date, item_key)
);
alter table public.routine_checks enable row level security;
create policy "routine_all_own" on public.routine_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Hábitos --------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits(user_id, created_at);
alter table public.habits enable row level security;
create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_logs (
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (habit_id, date)
);
create index if not exists habit_logs_user_idx on public.habit_logs(user_id);
alter table public.habit_logs enable row level security;
create policy "habit_logs_all_own" on public.habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Metas da semana ------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id, created_at desc);
alter table public.goals enable row level security;
create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Financeiro -----------------------------------------------------
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('in','out')),
  description text not null,
  value numeric(12,2) not null check (value > 0),
  entry_date timestamptz not null default now()
);
create index if not exists finance_user_idx on public.finance_entries(user_id, entry_date desc);
alter table public.finance_entries enable row level security;
create policy "finance_all_own" on public.finance_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. Contas a vencer ------------------------------------------------
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  value numeric(12,2) not null check (value > 0),
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bills_user_idx on public.bills(user_id, due_date);
alter table public.bills enable row level security;
create policy "bills_all_own" on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
