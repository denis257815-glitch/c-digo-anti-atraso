-- =====================================================================
-- Código Anti-Atraso — Sistema de Planos
-- Rode DEPOIS do SUPABASE_SETUP.sql e ADMIN_SETUP.sql
-- =====================================================================

-- 1. Catálogo de planos -----------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null default 0,
  interval text not null default 'month' check (interval in ('month','year','lifetime','free')),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;

drop policy if exists "plans_read_all" on public.plans;
create policy "plans_read_all" on public.plans
  for select to authenticated using (true);

drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 2. Plano do usuário -------------------------------------------------
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'active' check (status in ('active','trial','canceled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;

drop policy if exists "user_plans_read_self_or_admin" on public.user_plans;
create policy "user_plans_read_self_or_admin" on public.user_plans
  for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

drop policy if exists "user_plans_admin_write" on public.user_plans;
create policy "user_plans_admin_write" on public.user_plans
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- 3. Seed de planos padrão -------------------------------------------
insert into public.plans (slug, name, description, price_cents, interval, features, sort_order) values
  ('free','Grátis','Pra começar a sair do atraso',0,'free',
    '["Tarefas do dia","Rotina básica","1 hábito"]'::jsonb, 0),
  ('pro','Pro','Disciplina total — desbloqueia tudo',2990,'month',
    '["Hábitos ilimitados","Metas semanais","Financeiro completo","Sem anúncios"]'::jsonb, 1),
  ('lifetime','Vitalício','Pagou uma vez. Tá dentro pra sempre',19990,'lifetime',
    '["Tudo do Pro","Atualizações futuras","Acesso vitalício"]'::jsonb, 2)
on conflict (slug) do nothing;
