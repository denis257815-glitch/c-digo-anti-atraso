import { useEffect, useState } from "react";
import { TrendingUp, CalendarDays } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Day = { key: string; label: string; tasks: number; habits: number; routine: number; total: number };

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function ProgressChart({ days = 14 }: { days?: number }) {
  const { user } = useAuth();
  const [data, setData] = useState<Day[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      const startStr = ymd(start);
      const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();

      const [tasks, hLogs, rChecks] = await Promise.all([
        supabase.from("tasks").select("created_at,done").eq("user_id", user.id).eq("done", true).gte("created_at", startISO),
        supabase.from("habit_logs").select("date").eq("user_id", user.id).gte("date", startStr),
        supabase.from("routine_checks").select("date,done").eq("user_id", user.id).eq("done", true).gte("date", startStr),
      ]);

      const t = new Map<string, number>();
      const h = new Map<string, number>();
      const r = new Map<string, number>();
      for (const row of (tasks.data ?? []) as { created_at: string }[]) {
        const k = row.created_at.slice(0, 10);
        t.set(k, (t.get(k) ?? 0) + 1);
      }
      for (const row of (hLogs.data ?? []) as { date: string }[]) {
        h.set(row.date, (h.get(row.date) ?? 0) + 1);
      }
      for (const row of (rChecks.data ?? []) as { date: string }[]) {
        r.set(row.date, (r.get(row.date) ?? 0) + 1);
      }

      const out: Day[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const k = ymd(d);
        const tt = t.get(k) ?? 0, hh = h.get(k) ?? 0, rr = r.get(k) ?? 0;
        out.push({
          key: k,
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          tasks: tt, habits: hh, routine: rr, total: tt + hh + rr,
        });
      }
      setData(out);
    })();
  }, [user, days]);

  if (!data) return null;

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-2xl leading-none">Sua evolução</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {days} dias
        </span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "var(--muted-foreground)", fontSize: 10, textTransform: "uppercase" }}
            />
            <Area type="monotone" dataKey="total" name="Total" stroke="var(--primary)" fill="url(#gTotal)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Legend label="Tarefas" total={data.reduce((a, d) => a + d.tasks, 0)} />
        <Legend label="Hábitos" total={data.reduce((a, d) => a + d.habits, 0)} />
        <Legend label="Rotina" total={data.reduce((a, d) => a + d.routine, 0)} />
      </div>
    </div>
  );
}

function Legend({ label, total }: { label: string; total: number }) {
  return (
    <span>
      {label} <span className="font-display text-foreground">{total}</span>
    </span>
  );
}

// ---------------- Weekly recap ----------------
export function WeeklyRecap() {
  const { user } = useAuth();
  const [r, setR] = useState<{
    tasks: number; habits: number; routine: number; activeDays: number;
    inflow: number; outflow: number; goalsDone: number;
    diffPct: number; bestDay: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - 6);
      const prevStart = new Date(now); prevStart.setDate(now.getDate() - 13);
      const startStr = ymd(start);
      const prevStartStr = ymd(prevStart);
      const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      const prevStartISO = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate()).toISOString();

      const [tasks, hLogs, rChecks, finance, goals, prevTasks, prevH, prevR] = await Promise.all([
        supabase.from("tasks").select("created_at,done").eq("user_id", user.id).eq("done", true).gte("created_at", startISO),
        supabase.from("habit_logs").select("date").eq("user_id", user.id).gte("date", startStr),
        supabase.from("routine_checks").select("date,done").eq("user_id", user.id).eq("done", true).gte("date", startStr),
        supabase.from("finance_entries").select("type,value,entry_date").eq("user_id", user.id).gte("entry_date", startISO),
        supabase.from("goals").select("done").eq("user_id", user.id).eq("done", true),
        supabase.from("tasks").select("created_at,done").eq("user_id", user.id).eq("done", true).gte("created_at", prevStartISO).lt("created_at", startISO),
        supabase.from("habit_logs").select("date").eq("user_id", user.id).gte("date", prevStartStr).lt("date", startStr),
        supabase.from("routine_checks").select("date,done").eq("user_id", user.id).eq("done", true).gte("date", prevStartStr).lt("date", startStr),
      ]);

      const tasksN = (tasks.data ?? []).length;
      const habitsN = (hLogs.data ?? []).length;
      const routineN = (rChecks.data ?? []).length;
      const total = tasksN + habitsN + routineN;

      const prevTotal =
        (prevTasks.data ?? []).length + (prevH.data ?? []).length + (prevR.data ?? []).length;
      const diffPct = prevTotal === 0 ? (total > 0 ? 100 : 0) : Math.round(((total - prevTotal) / prevTotal) * 100);

      // Active days
      const days = new Set<string>();
      for (const x of (tasks.data ?? []) as { created_at: string }[]) days.add(x.created_at.slice(0, 10));
      for (const x of (hLogs.data ?? []) as { date: string }[]) days.add(x.date);
      for (const x of (rChecks.data ?? []) as { date: string }[]) days.add(x.date);

      // Best day
      const counts = new Map<string, number>();
      const bump = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1);
      for (const x of (tasks.data ?? []) as { created_at: string }[]) bump(x.created_at.slice(0, 10));
      for (const x of (hLogs.data ?? []) as { date: string }[]) bump(x.date);
      for (const x of (rChecks.data ?? []) as { date: string }[]) bump(x.date);
      let bestKey: string | null = null, bestN = 0;
      for (const [k, v] of counts) if (v > bestN) { bestN = v; bestKey = k; }
      const bestDay = bestKey
        ? new Date(bestKey + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" })
        : null;

      let inflow = 0, outflow = 0;
      for (const f of (finance.data ?? []) as { type: string; value: number }[]) {
        if (f.type === "in") inflow += Number(f.value); else outflow += Number(f.value);
      }

      setR({
        tasks: tasksN, habits: habitsN, routine: routineN,
        activeDays: days.size, inflow, outflow,
        goalsDone: (goals.data ?? []).length,
        diffPct, bestDay,
      });
    })();
  }, [user]);

  if (!r) return null;

  const total = r.tasks + r.habits + r.routine;
  const trend = r.diffPct >= 0 ? "+" : "";
  const trendColor = r.diffPct >= 0 ? "text-primary" : "text-muted-foreground";
  const balance = r.inflow - r.outflow;

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-surface p-5">
      <div className="mb-1 flex items-center gap-2 text-primary">
        <CalendarDays className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.28em]">Resumo da semana</span>
      </div>
      <h2 className="font-display text-2xl leading-tight">
        Últimos 7 dias <span className={`text-base ${trendColor}`}>{trend}{r.diffPct}%</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {total === 0 ? "Semana vazia. Bora começar hoje." :
         r.diffPct > 0 ? "Tá subindo. Mantém o ritmo." :
         r.diffPct < 0 ? "Caiu. Recupera essa semana." :
         "Mantendo firme."}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="Tarefas" value={r.tasks} />
        <Mini label="Hábitos" value={r.habits} />
        <Mini label="Rotina" value={r.routine} />
        <Mini label="Dias ativos" value={`${r.activeDays}/7`} />
        <Mini label="Metas" value={r.goalsDone} />
        <Mini label="Saldo" value={balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} small />
      </div>

      {r.bestDay && (
        <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          Melhor dia: <span className="text-foreground">{r.bestDay}</span>
        </p>
      )}
    </div>
  );
}

function Mini({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-2.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display leading-none ${small ? "text-base mt-1" : "text-2xl mt-1"}`}>{value}</div>
    </div>
  );
}
