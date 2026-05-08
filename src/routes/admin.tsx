import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Shield, ArrowLeft, Trash2, Search, Users, CheckSquare, Flame, Target,
  LayoutDashboard, Download, TrendingUp, TrendingDown, Activity, UserPlus, Trophy, Megaphone, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Código Anti-Atraso" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "users" | "broadcast" | "tasks" | "habits" | "goals" | "finance" | "routine";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { key: "users", label: "Usuários", icon: Users },
  { key: "broadcast", label: "Broadcast", icon: Megaphone },
  { key: "tasks", label: "Tarefas", icon: CheckSquare },
  { key: "habits", label: "Hábitos", icon: Flame },
  { key: "goals", label: "Metas", icon: Target },
  { key: "finance", label: "Financeiro", icon: Wallet },
  { key: "routine", label: "Rotina", icon: Sun },
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
      {tab === "broadcast" && <BroadcastPanel />}
      {tab === "tasks" && <TablePanel table="tasks" columns={["id", "user_id", "text", "done", "created_at"]} />}
      {tab === "habits" && <TablePanel table="habits" columns={["id", "user_id", "name", "created_at"]} />}
      {tab === "goals" && <TablePanel table="goals" columns={["id", "user_id", "text", "done", "created_at"]} />}
      {tab === "finance" && (
        <TablePanel table="finance_entries" columns={["id", "user_id", "type", "description", "value", "entry_date"]} />
      )}
      {tab === "routine" && <TablePanel table="routine_checks" columns={["user_id", "date", "item_key", "done"]} pkCols={["user_id","date","item_key"]} />}
    </div>
  );
}

// ---------------- Dashboard ----------------
type Stats = {
  users: number; newToday: number; newWeek: number; active7d: number;
  tasks: number; tasksDone: number; habits: number; goals: number; goalsDone: number;
  inflow: number; outflow: number;
};
type TopUser = { user_id: string; name: string; count: number };

function DashboardPanel() {
  const [s, setS] = useState<Stats | null>(null);
  const [top, setTop] = useState<TopUser[]>([]);
  const [recent, setRecent] = useState<{ id: string; name: string | null; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const start7d = new Date(now.getTime() - 7 * 86400000).toISOString();
      const head = { count: "exact" as const, head: true };

      const [
        usersAll, usersToday, usersWeek,
        tasksAll, tasksDone, habitsAll,
        goalsAll, goalsDone, active7, finance, recentUsers, topTasks,
      ] = await Promise.all([
        supabase.from("profiles").select("*", head),
        supabase.from("profiles").select("*", head).gte("created_at", startToday),
        supabase.from("profiles").select("*", head).gte("created_at", start7d),
        supabase.from("tasks").select("*", head),
        supabase.from("tasks").select("*", head).eq("done", true),
        supabase.from("habits").select("*", head),
        supabase.from("goals").select("*", head),
        supabase.from("goals").select("*", head).eq("done", true),
        supabase.from("habit_logs").select("user_id").gte("date", start7d.slice(0, 10)),
        supabase.from("finance_entries").select("type,value"),
        supabase.from("profiles").select("id,name,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("tasks").select("user_id"),
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
        ? await supabase.from("profiles").select("id,name").in("id", ids.map(([id]) => id))
        : { data: [] as { id: string; name: string | null }[] };
      const nameMap = new Map((nameRows ?? []).map((r) => [r.id, r.name ?? "(sem nome)"]));

      setS({
        users: usersAll.count ?? 0, newToday: usersToday.count ?? 0, newWeek: usersWeek.count ?? 0,
        active7d: activeSet.size, tasks: tasksAll.count ?? 0, tasksDone: tasksDone.count ?? 0,
        habits: habitsAll.count ?? 0, goals: goalsAll.count ?? 0, goalsDone: goalsDone.count ?? 0,
        inflow, outflow,
      });
      setTop(ids.map(([id, count]) => ({ user_id: id, name: nameMap.get(id) ?? "(sem nome)", count })));
      setRecent(recentUsers.data ?? []);
    })();
  }, []);

  if (!s) return <div className="py-10 text-center text-sm text-muted-foreground">Carregando métricas...</div>;
  const taskRate = s.tasks ? Math.round((s.tasksDone / s.tasks) * 100) : 0;
  const goalRate = s.goals ? Math.round((s.goalsDone / s.goals) * 100) : 0;
  const balance = s.inflow - s.outflow;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Usuários" value={s.users} accent={`+${s.newToday} hoje`} />
        <Stat icon={UserPlus} label="Novos 7d" value={s.newWeek} />
        <Stat icon={Activity} label="Ativos 7d" value={s.active7d} accent={`${s.users ? Math.round((s.active7d / s.users) * 100) : 0}%`} />
        <Stat icon={CheckSquare} label="Conclusão" value={`${taskRate}%`} accent={`${s.tasksDone}/${s.tasks}`} />
        <Stat icon={Flame} label="Hábitos" value={s.habits} />
        <Stat icon={Target} label="Metas" value={`${goalRate}%`} accent={`${s.goalsDone}/${s.goals}`} />
        <Stat icon={TrendingUp} label="Entradas" value={fmt(s.inflow)} />
        <Stat icon={TrendingDown} label="Saídas" value={fmt(s.outflow)} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Saldo da galera</div>
        <div className={`mt-1 font-display text-4xl ${balance >= 0 ? "text-primary" : "text-muted-foreground"}`}>
          {fmt(balance)}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg">Top 5 — mais ativos</h3>
        </div>
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
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-display text-lg">Últimos cadastros</h3>
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
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: typeof Users; label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{label}</span>
      </div>
      <div className="font-display text-3xl leading-none">{value}</div>
      {accent && <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">{accent}</div>}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------------- Users panel ----------------
type Profile = { id: string; name: string | null; avatar_url: string | null; created_at: string };
type Role = { user_id: string; role: string };

function UsersPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,name,avatar_url,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles(p ?? []);
    setRoles(r ?? []);
  };
  useEffect(() => { load(); }, []);

  const isAdminRole = (id: string) => roles.some((r) => r.user_id === id && r.role === "admin");

  const toggleAdmin = async (id: string) => {
    setBusy(id);
    if (isAdminRole(id)) {
      await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    }
    await load();
    setBusy(null);
  };

  const wipeUser = async (id: string) => {
    if (!confirm("Apagar TODOS os dados desse usuário (tarefas, hábitos, metas, financeiro, rotina)? O login continua.")) return;
    setBusy(id);
    await Promise.all([
      supabase.from("tasks").delete().eq("user_id", id),
      supabase.from("habits").delete().eq("user_id", id),
      supabase.from("habit_logs").delete().eq("user_id", id),
      supabase.from("goals").delete().eq("user_id", id),
      supabase.from("finance_entries").delete().eq("user_id", id),
      supabase.from("routine_checks").delete().eq("user_id", id),
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

// ---------------- Broadcast panel ----------------
function BroadcastPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [list, setList] = useState<{ id: string; title: string; body: string; created_at: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("broadcasts")
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
    const { error } = await supabase.from("broadcasts").insert({ title: title.trim(), body: body.trim() });
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
    await supabase.from("broadcasts").delete().eq("id", id);
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

// ---------------- Generic table panel ----------------
function TablePanel({
  table,
  columns,
  pkCols = ["id"],
}: {
  table: string;
  columns: string[];
  pkCols?: string[];
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select(columns.join(",")).limit(500);
    setRows((data as unknown as Record<string, unknown>[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const remove = async (row: Record<string, unknown>) => {
    if (!confirm("Apagar esse registro?")) return;
    let query = supabase.from(table).delete();
    for (const c of pkCols) query = query.eq(c, row[c] as string);
    await query;
    load();
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Buscar em ${table}...`}
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="font-display text-xs tracking-widest text-muted-foreground">{filtered.length}</span>
      </div>

      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => downloadCSV(`${table}.csv`, filtered)} className="h-8 text-primary hover:bg-primary/10">
          <Download className="mr-1 h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Vazio.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r, i) => (
            <li key={i} className="rounded-xl border border-border bg-surface p-3 text-xs">
              <div className="space-y-1">
                {columns.map((c) => (
                  <div key={c} className="flex gap-2">
                    <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {c}
                    </span>
                    <span className="min-w-0 flex-1 break-words font-mono text-foreground">
                      {String(r[c] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => remove(r)} className="h-7 text-primary hover:bg-primary/10">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Apagar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
