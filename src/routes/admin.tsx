import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shield, ArrowLeft, Trash2, Search, Users, CheckSquare, Flame, Target, Wallet, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Código Anti-Atraso" }] }),
  component: AdminPage,
});

type Tab = "users" | "tasks" | "habits" | "goals" | "finance" | "routine";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "users", label: "Usuários", icon: Users },
  { key: "tasks", label: "Tarefas", icon: CheckSquare },
  { key: "habits", label: "Hábitos", icon: Flame },
  { key: "goals", label: "Metas", icon: Target },
  { key: "finance", label: "Financeiro", icon: Wallet },
  { key: "routine", label: "Rotina", icon: Sun },
];

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const [tab, setTab] = useState<Tab>("users");

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

      {tab === "users" && <UsersPanel />}
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
  useEffect(() => {
    load();
  }, []);

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

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return profiles;
    return profiles.filter((p) => (p.name ?? "").toLowerCase().includes(s) || p.id.includes(s));
  }, [profiles, q]);

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

      <ul className="space-y-2">
        {filtered.map((p) => {
          const admin = isAdminRole(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-primary">
                {(p.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name ?? "(sem nome)"}</div>
                <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{p.id}</div>
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
