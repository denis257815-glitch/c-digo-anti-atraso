import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Shield, ArrowLeft, Trash2, Search, Users, CheckSquare, Flame, Target,
  LayoutDashboard, Download, TrendingUp, TrendingDown, Activity, UserPlus,
  Trophy, Megaphone, Send, CreditCard, Plus, Pencil, X, Crown, DollarSign,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Código Anti-Atraso" }] }),
  // Authoritative backend authorization: blocks the route before render.
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw redirect({ to: "/" });
    }
    const { data, error } = await supabase.rpc("is_admin");
    if (error || data !== true) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

type Tab = "dashboard" | "users" | "plans" | "broadcast";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Usuários", icon: Users },
  { key: "plans", label: "Planos", icon: CreditCard },
  { key: "broadcast", label: "Broadcast", icon: Megaphone },
];

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (loading) {
    return (
      <div className="py-20 text-center font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="py-16 text-center">
        <Shield className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-3xl">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Essa área é só pra admin.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 inline-block border-l-4 border-primary pl-2 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            Painel Admin
          </div>
          <h1 className="font-display text-[2.4rem] leading-[0.95]">
            Controle <span className="text-primary">total.</span>
          </h1>
        </div>
        <Link
          to="/"
          className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> App
        </Link>
      </div>

      <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "plans" && <PlansPanel />}
      {tab === "broadcast" && <BroadcastPanel />}
    </div>
  );
}

// ---------------- Dashboard ----------------
type Stats = {
  users: number; newToday: number; newWeek: number; active7d: number;
  tasks: number; tasksDone: number; habits: number; goals: number; goalsDone: number;
  inflow: number; outflow: number; mrrCents: number; payingUsers: number;
};
type TopUser = { user_id: string; name: string; count: number };
type SeriesPoint = { date: string; label: string; signups: number; tasks: number };
type PlanSlice = { name: string; value: number };

const PIE_COLORS = ["var(--primary)", "#f59e0b", "#10b981", "#6366f1", "#94a3b8"];

function DashboardPanel() {
  const [s, setS] = useState<Stats | null>(null);
  const [top, setTop] = useState<TopUser[]>([]);
  const [recent, setRecent] = useState<{ id: string; name: string | null; created_at: string }[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [planMix, setPlanMix] = useState<PlanSlice[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const start7d = new Date(now.getTime() - 7 * 86400000).toISOString();
      const start30d = new Date(now.getTime() - 30 * 86400000).toISOString();
      const head = { count: "exact" as const, head: true };

      const [
        usersAll, usersToday, usersWeek,
        tasksAll, tasksDone, habitsAll,
        goalsAll, goalsDone, active7, finance, recentUsers, topTasks,
        signups30, tasks30, plansData, userPlansData,
      ] = await Promise.all([
        supabase.from("aa_profiles").select("*", head),
        supabase.from("aa_profiles").select("*", head).gte("created_at", startToday),
        supabase.from("aa_profiles").select("*", head).gte("created_at", start7d),
        supabase.from("aa_tasks").select("*", head),
        supabase.from("aa_tasks").select("*", head).eq("done", true),
        supabase.from("aa_habits").select("*", head),
        supabase.from("aa_goals").select("*", head),
        supabase.from("aa_goals").select("*", head).eq("done", true),
        supabase.from("aa_habit_logs").select("user_id").gte("date", start7d.slice(0, 10)),
        supabase.from("aa_finance_entries").select("type,value"),
        supabase.from("aa_profiles").select("id,name,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("aa_tasks").select("user_id"),
        supabase.from("aa_profiles").select("created_at").gte("created_at", start30d),
        supabase.from("aa_tasks").select("created_at").gte("created_at", start30d),
        supabase.from("aa_plans").select("id,slug,name,price_cents"),
        supabase.from("aa_user_plans").select("plan_id,status"),
      ]);

      const activeSet = new Set((active7.data ?? []).map((r: { user_id: string }) => r.user_id));
      let inflow = 0, outflow = 0;
      for (const r of (finance.data ?? []) as { type: string; value: number }[]) {
        if (r.type === "in") inflow += Number(r.value); else outflow += Number(r.value);
      }
      const counts = new Map<string, number>();
      for (const r of (topTasks.data ?? []) as { user_id: string }[]) {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      }
      const ids = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const { data: nameRows } = ids.length
        ? await supabase.from("aa_profiles").select("id,name").in("id", ids.map(([id]) => id))
        : { data: [] as { id: string; name: string | null }[] };
      const nameMap = new Map((nameRows ?? []).map((r) => [r.id, r.name ?? "(sem nome)"]));

      // Build 14-day series
      const days: SeriesPoint[] = [];
      const sCounts = new Map<string, number>();
      const tCounts = new Map<string, number>();
      for (const r of (signups30.data ?? []) as { created_at: string }[]) {
        const k = r.created_at.slice(0, 10);
        sCounts.set(k, (sCounts.get(k) ?? 0) + 1);
      }
      for (const r of (tasks30.data ?? []) as { created_at: string }[]) {
        const k = r.created_at.slice(0, 10);
        tCounts.set(k, (tCounts.get(k) ?? 0) + 1);
      }
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const k = d.toISOString().slice(0, 10);
        days.push({
          date: k,
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          signups: sCounts.get(k) ?? 0,
          tasks: tCounts.get(k) ?? 0,
        });
      }

      // Plan mix + MRR
      const plans = (plansData.data ?? []) as { id: string; slug: string; name: string; price_cents: number }[];
      const planMap = new Map(plans.map((p) => [p.id, p]));
      const ups = (userPlansData.data ?? []) as { plan_id: string | null; status: string }[];
      const mix = new Map<string, number>();
      let mrr = 0, paying = 0;
      for (const up of ups) {
        if (up.status !== "active" && up.status !== "trial") continue;
        const p = up.plan_id ? planMap.get(up.plan_id) : null;
        const name = p?.name ?? "Sem plano";
        mix.set(name, (mix.get(name) ?? 0) + 1);
        if (p && p.price_cents > 0) { mrr += p.price_cents; paying += 1; }
      }

      setS({
        users: usersAll.count ?? 0, newToday: usersToday.count ?? 0, newWeek: usersWeek.count ?? 0,
        active7d: activeSet.size, tasks: tasksAll.count ?? 0, tasksDone: tasksDone.count ?? 0,
        habits: habitsAll.count ?? 0, goals: goalsAll.count ?? 0, goalsDone: goalsDone.count ?? 0,
        inflow, outflow, mrrCents: mrr, payingUsers: paying,
      });
      setTop(ids.map(([id, count]) => ({ user_id: id, name: nameMap.get(id) ?? "(sem nome)", count })));
      setRecent(recentUsers.data ?? []);
      setSeries(days);
      setPlanMix([...mix.entries()].map(([name, value]) => ({ name, value })));
    })();
  }, []);

  if (!s) return <div className="py-10 text-center text-sm text-muted-foreground">Carregando métricas...</div>;
  const taskRate = s.tasks ? Math.round((s.tasksDone / s.tasks) * 100) : 0;
  const goalRate = s.goals ? Math.round((s.goalsDone / s.goals) * 100) : 0;
  const balance = s.inflow - s.outflow;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI icon={DollarSign} label="MRR" value={fmtCents(s.mrrCents)} accent={`${s.payingUsers} pagantes`} highlight />
        <KPI icon={Users} label="Usuários" value={s.users} accent={`+${s.newToday} hoje`} />
        <KPI icon={Activity} label="Ativos 7d" value={s.active7d} accent={`${s.users ? Math.round((s.active7d / s.users) * 100) : 0}%`} />
        <KPI icon={UserPlus} label="Novos 7d" value={s.newWeek} />
      </div>

      {/* Growth chart */}
      <Card title="Crescimento (14d)" icon={TrendingUp}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gSignup" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
              <Area type="monotone" dataKey="signups" name="Cadastros" stroke="var(--primary)" fill="url(#gSignup)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Atividade — tarefas criadas" icon={CheckSquare}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.2 }} />
                <Bar dataKey="tasks" name="Tarefas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Distribuição de planos" icon={Crown}>
          {planMix.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum usuário com plano ainda.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planMix} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {planMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {planMix.map((p, i) => (
              <span key={p.name} className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {p.name} · {p.value}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Engagement */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI icon={CheckSquare} label="Conclusão" value={`${taskRate}%`} accent={`${s.tasksDone}/${s.tasks}`} />
        <KPI icon={Flame} label="Hábitos" value={s.habits} />
        <KPI icon={Target} label="Metas" value={`${goalRate}%`} accent={`${s.goalsDone}/${s.goals}`} />
        <KPI icon={DollarSign} label="Saldo galera" value={fmt(balance)} accent={balance >= 0 ? "+" : "-"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top 5 — mais ativos" icon={Trophy}>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <ul className="space-y-2">
              {top.map((u, i) => (
                <li key={u.user_id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 font-display text-primary">#{i + 1}</span>
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="font-display text-base">{u.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos cadastros" icon={UserPlus}>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{r.name ?? "(sem nome)"}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPI icon={TrendingUp} label="Entradas" value={fmt(s.inflow)} />
        <KPI icon={TrendingDown} label="Saídas" value={fmt(s.outflow)} />
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg leading-none">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KPI({
  icon: Icon, label, value, accent, highlight,
}: { icon: typeof Users; label: string; value: string | number; accent?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-primary/50 bg-primary/10" : "border-border bg-surface"}`}>
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-primary" : ""}`} />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{label}</span>
      </div>
      <div className={`font-display text-3xl leading-none ${highlight ? "text-primary" : ""}`}>{value}</div>
      {accent && <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">{accent}</div>}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtCents(c: number) {
  return fmt(c / 100);
}

// ---------------- Users panel ----------------
type Profile = { id: string; name: string | null; avatar_url: string | null; created_at: string };
type Role = { user_id: string; role: string };
type Plan = {
  id: string; slug: string; name: string; description: string | null;
  price_cents: number; interval: string; features: string[]; active: boolean; sort_order: number;
};
type UserPlan = { user_id: string; plan_id: string | null; status: string; expires_at: string | null };

function UsersPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: pl }, { data: up }] = await Promise.all([
      supabase.from("aa_profiles").select("id,name,avatar_url,created_at").order("created_at", { ascending: false }),
      supabase.from("aa_user_roles").select("user_id,role"),
      supabase.from("aa_plans").select("*").order("sort_order"),
      supabase.from("aa_user_plans").select("user_id,plan_id,status,expires_at"),
    ]);
    setProfiles(p ?? []);
    setRoles(r ?? []);
    setPlans((pl ?? []) as Plan[]);
    setUserPlans((up ?? []) as UserPlan[]);
  };
  useEffect(() => { load(); }, []);

  const isAdminRole = (id: string) => roles.some((r) => r.user_id === id && r.role === "admin");
  const planOf = (id: string) => userPlans.find((u) => u.user_id === id);

  const toggleAdmin = async (id: string) => {
    setBusy(id);
    if (isAdminRole(id)) {
      await supabase.from("aa_user_roles").delete().eq("user_id", id).eq("role", "admin");
    } else {
      await supabase.from("aa_user_roles").insert({ user_id: id, role: "admin" });
    }
    await load();
    setBusy(null);
  };

  const setUserPlan = async (userId: string, planId: string) => {
    setBusy(userId);
    await supabase.from("aa_user_plans").upsert({
      user_id: userId,
      plan_id: planId || null,
      status: "active",
      updated_at: new Date().toISOString(),
    });
    await load();
    setBusy(null);
  };

  const wipeUser = async (id: string) => {
    if (!confirm("Apagar TODOS os dados desse usuário (tarefas, hábitos, metas, financeiro, rotina)? O login continua.")) return;
    setBusy(id);
    await Promise.all([
      supabase.from("aa_tasks").delete().eq("user_id", id),
      supabase.from("aa_habits").delete().eq("user_id", id),
      supabase.from("aa_habit_logs").delete().eq("user_id", id),
      supabase.from("aa_goals").delete().eq("user_id", id),
      supabase.from("aa_finance_entries").delete().eq("user_id", id),
      supabase.from("aa_routine_checks").delete().eq("user_id", id),
    ]);
    setBusy(null);
    alert("Dados apagados.");
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return profiles;
    return profiles.filter((p) => (p.name ?? "").toLowerCase().includes(s) || p.id.includes(s));
  }, [profiles, q]);

  const exportCSV = () => downloadCSV("usuarios.csv", filtered);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou id..."
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="font-display text-xs tracking-widest text-muted-foreground">{filtered.length}</span>
      </div>

      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={exportCSV} className="h-8 text-primary hover:bg-primary/10">
          <Download className="mr-1 h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <ul className="space-y-2">
        {filtered.map((p) => {
          const admin = isAdminRole(p.id);
          const up = planOf(p.id);
          return (
            <li key={p.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-primary">
                  {(p.name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name ?? "(sem nome)"}</div>
                  <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{p.id}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Cadastro {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <button
                  onClick={() => toggleAdmin(p.id)}
                  disabled={busy === p.id}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                    admin
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {admin ? "Admin" : "Tornar admin"}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano</span>
                <select
                  value={up?.plan_id ?? ""}
                  onChange={(e) => setUserPlan(p.id, e.target.value)}
                  disabled={busy === p.id}
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  <option value="">— sem plano —</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} {pl.price_cents > 0 ? `· ${fmtCents(pl.price_cents)}` : ""}
                    </option>
                  ))}
                </select>
                {up?.status && (
                  <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                    {up.status}
                  </span>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => wipeUser(p.id)} disabled={busy === p.id}
                  className="h-7 text-primary hover:bg-primary/10">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar dados
                </Button>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário.</li>
        )}
      </ul>
    </div>
  );
}

// ---------------- Plans panel ----------------
function PlansPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("aa_plans").select("*").order("sort_order");
    if (error) { setErr("Rode o SQL PLANS_SETUP.sql no Supabase pra criar a tabela `plans`."); return; }
    setErr(null);
    setPlans((data ?? []) as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Apagar esse plano?")) return;
    await supabase.from("aa_plans").delete().eq("id", id);
    load();
  };

  const toggleActive = async (p: Plan) => {
    await supabase.from("aa_plans").update({ active: !p.active }).eq("id", p.id);
    load();
  };

  if (err) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
        <p className="font-bold text-primary">Configuração necessária</p>
        <p className="mt-1 text-muted-foreground">{err}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{plans.length} planos cadastrados</p>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-1 h-3.5 w-3.5" /> Novo plano
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className={`rounded-2xl border p-4 ${p.active ? "border-border bg-surface" : "border-border/50 bg-surface/50 opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl">{p.name}</h3>
                  <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.slug}
                  </span>
                </div>
                <div className="mt-1 font-display text-2xl text-primary">
                  {p.price_cents === 0 ? "Grátis" : fmtCents(p.price_cents)}
                  <span className="ml-1 text-[10px] uppercase tracking-widest text-muted-foreground">/{p.interval}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-primary">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
            {Array.isArray(p.features) && p.features.length > 0 && (
              <ul className="mt-3 space-y-1">
                {p.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground">· {f}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => toggleActive(p)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  p.active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {p.active ? "Ativo" : "Inativo"}
              </button>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ordem {p.sort_order}</span>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <PlanEditor
          plan={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function PlanEditor({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const [slug, setSlug] = useState(plan?.slug ?? "");
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(((plan?.price_cents ?? 0) / 100).toString());
  const [interval, setInterval] = useState(plan?.interval ?? "month");
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [sortOrder, setSortOrder] = useState((plan?.sort_order ?? 0).toString());
  const [active, setActive] = useState(plan?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!slug.trim() || !name.trim()) { setErr("Slug e nome são obrigatórios."); return; }
    setBusy(true);
    setErr(null);
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || null,
      price_cents: Math.round(parseFloat(price.replace(",", ".") || "0") * 100),
      interval,
      features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      sort_order: parseInt(sortOrder || "0", 10),
      active,
    };
    const { error } = plan
      ? await supabase.from("aa_plans").update(payload).eq("id", plan.id)
      : await supabase.from("aa_plans").insert(payload);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 font-display text-2xl">{plan ? "Editar plano" : "Novo plano"}</h2>

        <div className="space-y-3">
          <Field label="Slug (id curto)">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pro" className={inputCls} />
          </Field>
          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" className={inputCls} />
          </Field>
          <Field label="Descrição">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="Intervalo">
              <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputCls}>
                <option value="free">Grátis</option>
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
                <option value="lifetime">Vitalício</option>
              </select>
            </Field>
          </div>
          <Field label="Benefícios (1 por linha)">
            <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ordem">
              <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="Ativo">
              <button
                onClick={() => setActive(!active)}
                className={`h-9 w-full rounded-lg border text-xs font-bold uppercase tracking-widest ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {active ? "Sim" : "Não"}
              </button>
            </Field>
          </div>
        </div>

        {err && <p className="mt-3 text-xs text-primary">{err}</p>}

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <SaveButton onClick={save} savingLabel="Salvando..." savedLabel="Salvo!" className="flex-1 bg-primary hover:bg-primary/90">
            Salvar
          </SaveButton>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ---------------- Broadcast panel ----------------
function BroadcastPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [list, setList] = useState<{ id: string; title: string; body: string; created_at: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("aa_broadcasts")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setInfo(null);
    const { error } = await supabase.from("aa_broadcasts").insert({ title: title.trim(), body: body.trim() });
    setSending(false);
    if (error) {
      setInfo("Erro: rode o SQL da tabela broadcasts (ver instruções).");
      return;
    }
    setTitle(""); setBody("");
    setInfo("Mensagem publicada.");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar essa mensagem?")) return;
    await supabase.from("aa_broadcasts").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg">Recado pra galera</h3>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mensagem..."
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        {info && <p className="mt-2 text-xs text-primary">{info}</p>}
        <div className="mt-3 flex justify-end">
          <Button onClick={send} disabled={sending} className="bg-primary hover:bg-primary/90">
            <Send className="mr-1.5 h-3.5 w-3.5" /> {sending ? "Enviando..." : "Publicar"}
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {list.map((b) => (
          <li key={b.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-base">{b.title}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {new Date(b.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{b.body}</p>
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="h-7 text-primary hover:bg-primary/10">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Apagar
              </Button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhum recado.</li>}
      </ul>
    </div>
  );
}

// ---------------- Helpers ----------------
function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
