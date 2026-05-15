import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

const FinanceDashboard = lazy(() =>
  import("@/components/FinanceDashboard").then((m) => ({ default: m.FinanceDashboard })),
);
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calendar,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Smartphone,
  Zap,
  Tag,
  CalendarClock,
  AlertTriangle,
  Check,
} from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Grana — Código Anti-Atraso" },
      { name: "description", content: "Controle financeiro pro: categorias, mês, indicadores e exportação." },
    ],
  }),
  component: FinanceiroPage,
});

type Entry = {
  id: string;
  type: "in" | "out";
  description: string;
  value: number;
  entry_date: string;
};

type Bill = {
  id: string;
  description: string;
  value: number;
  due_date: string;
  paid: boolean;
};

type CategoryKey =
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "compras"
  | "lazer"
  | "saude"
  | "educacao"
  | "contas"
  | "assinaturas"
  | "salario"
  | "freelance"
  | "investimento"
  | "outros";

const CATEGORIES: Record<
  CategoryKey,
  { label: string; icon: typeof Tag; color: string; keywords: string[]; kind: "in" | "out" | "both" }
> = {
  alimentacao: { label: "Alimentação", icon: Utensils, color: "text-orange-400", keywords: ["mercado", "restaurante", "ifood", "lanche", "almoço", "almoco", "jantar", "café", "cafe", "padaria", "supermercado", "comida"], kind: "out" },
  transporte: { label: "Transporte", icon: Car, color: "text-blue-400", keywords: ["uber", "99", "gasolina", "combustível", "combustivel", "ônibus", "onibus", "metrô", "metro", "estacionamento", "pedágio", "pedagio"], kind: "out" },
  moradia: { label: "Moradia", icon: Home, color: "text-emerald-400", keywords: ["aluguel", "condomínio", "condominio", "iptu", "casa"], kind: "out" },
  compras: { label: "Compras", icon: ShoppingBag, color: "text-pink-400", keywords: ["roupa", "calçado", "calcado", "amazon", "shopee", "mercado livre", "shopping"], kind: "out" },
  lazer: { label: "Lazer", icon: Gamepad2, color: "text-purple-400", keywords: ["cinema", "bar", "festa", "show", "viagem", "jogo", "game", "netflix", "spotify"], kind: "out" },
  saude: { label: "Saúde", icon: HeartPulse, color: "text-red-400", keywords: ["farmácia", "farmacia", "remédio", "remedio", "médico", "medico", "academia", "psicólogo", "psicologo", "dentista", "plano de saúde"], kind: "out" },
  educacao: { label: "Educação", icon: GraduationCap, color: "text-indigo-400", keywords: ["curso", "faculdade", "livro", "escola", "mensalidade"], kind: "out" },
  contas: { label: "Contas", icon: Zap, color: "text-yellow-400", keywords: ["luz", "água", "agua", "energia", "gás", "gas", "internet"], kind: "out" },
  assinaturas: { label: "Assinaturas", icon: Smartphone, color: "text-cyan-400", keywords: ["assinatura", "celular", "telefone", "claro", "vivo", "tim"], kind: "out" },
  salario: { label: "Salário", icon: Briefcase, color: "text-success", keywords: ["salário", "salario", "holerite", "pagamento"], kind: "in" },
  freelance: { label: "Freela", icon: Briefcase, color: "text-success", keywords: ["freela", "freelance", "bico", "extra"], kind: "in" },
  investimento: { label: "Investimento", icon: PiggyBank, color: "text-emerald-400", keywords: ["dividendo", "rendimento", "juros", "investimento", "ação", "acao"], kind: "both" },
  outros: { label: "Outros", icon: Tag, color: "text-muted-foreground", keywords: [], kind: "both" },
};

function detectCategory(description: string, type: "in" | "out"): CategoryKey {
  const d = description.toLowerCase().trim();
  for (const [key, cfg] of Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]) {
    if (cfg.kind !== "both" && cfg.kind !== type) continue;
    if (cfg.keywords.some((k) => d.includes(k))) return key;
  }
  return type === "in" ? "outros" : "outros";
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompact = (n: number) =>
  Math.abs(n) >= 1000
    ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
    : fmt(n);

const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

const sameMonth = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
};

function Financeiro() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState<"in" | "out">("out");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<CategoryKey | "all">("all");

  // Contas a vencer
  const [bills, setBills] = useState<Bill[]>([]);
  const [billDesc, setBillDesc] = useState("");
  const [billValue, setBillValue] = useState("");
  const [billDue, setBillDue] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("finance_entries")
      .select("id,type,description,value,entry_date")
      .order("entry_date", { ascending: false })
      .then(({ data }) =>
        setEntries(((data ?? []) as Entry[]).map((e) => ({ ...e, value: Number(e.value) }))),
      );
    supabase
      .from("bills")
      .select("id,description,value,due_date,paid")
      .order("due_date", { ascending: true })
      .then(({ data }) =>
        setBills(((data ?? []) as Bill[]).map((b) => ({ ...b, value: Number(b.value) }))),
      );
  }, [user]);

  const add = async () => {
    const v = parseFloat(value.replace(",", "."));
    if (!desc.trim() || isNaN(v) || v <= 0 || !user) return;
    const description = desc.trim().slice(0, 120);
    setDesc("");
    setValue("");
    const { data } = await supabase
      .from("finance_entries")
      .insert({ user_id: user.id, type, description, value: v })
      .select("id,type,description,value,entry_date")
      .single();
    if (data) setEntries((e) => [{ ...(data as Entry), value: Number(data.value) }, ...e]);
  };

  const remove = async (id: string) => {
    setEntries((e) => e.filter((x) => x.id !== id));
    await supabase.from("finance_entries").delete().eq("id", id);
  };

  const addBill = async () => {
    const v = parseFloat(billValue.replace(",", "."));
    if (!billDesc.trim() || isNaN(v) || v <= 0 || !billDue || !user) return;
    const description = billDesc.trim().slice(0, 120);
    setBillDesc("");
    setBillValue("");
    setBillDue("");
    const { data } = await supabase
      .from("bills")
      .insert({ user_id: user.id, description, value: v, due_date: billDue })
      .select("id,description,value,due_date,paid")
      .single();
    if (data)
      setBills((b) =>
        [...b, { ...(data as Bill), value: Number(data.value) }].sort((a, c) =>
          a.due_date.localeCompare(c.due_date),
        ),
      );
  };

  const removeBill = async (id: string) => {
    setBills((b) => b.filter((x) => x.id !== id));
    await supabase.from("bills").delete().eq("id", id);
  };

  const payBill = async (bill: Bill) => {
    if (!user || bill.paid) return;
    setBills((b) => b.map((x) => (x.id === bill.id ? { ...x, paid: true } : x)));
    await supabase
      .from("bills")
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq("id", bill.id);
    // Lança como saída automaticamente
    const { data } = await supabase
      .from("finance_entries")
      .insert({
        user_id: user.id,
        type: "out",
        description: bill.description,
        value: bill.value,
      })
      .select("id,type,description,value,entry_date")
      .single();
    if (data) setEntries((e) => [{ ...(data as Entry), value: Number(data.value) }, ...e]);
  };

  // ---- Derivações por mês ----
  const monthEntries = useMemo(
    () => entries.filter((e) => sameMonth(e.entry_date, month)),
    [entries, month],
  );

  const prevMonth = useMemo(() => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [month]);

  const prevMonthEntries = useMemo(
    () => entries.filter((e) => sameMonth(e.entry_date, prevMonth)),
    [entries, prevMonth],
  );

  const ins = monthEntries.filter((e) => e.type === "in").reduce((s, e) => s + e.value, 0);
  const outs = monthEntries.filter((e) => e.type === "out").reduce((s, e) => s + e.value, 0);
  const balance = ins - outs;

  const prevOuts = prevMonthEntries.filter((e) => e.type === "out").reduce((s, e) => s + e.value, 0);
  const outsDelta = prevOuts > 0 ? ((outs - prevOuts) / prevOuts) * 100 : 0;

  const today = new Date();
  const isCurrentMonth =
    month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
  const daysElapsed = isCurrentMonth
    ? today.getDate()
    : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dailyAvg = daysElapsed > 0 ? outs / daysElapsed : 0;
  const savingsRate = ins > 0 ? Math.max(0, (balance / ins) * 100) : 0;

  // Top categorias (despesas)
  const byCategory = useMemo(() => {
    const map = new Map<CategoryKey, number>();
    monthEntries
      .filter((e) => e.type === "out")
      .forEach((e) => {
        const cat = detectCategory(e.description, "out");
        map.set(cat, (map.get(cat) ?? 0) + e.value);
      });
    return Array.from(map.entries())
      .map(([key, total]) => ({ key, total }))
      .sort((a, b) => b.total - a.total);
  }, [monthEntries]);

  // Filtros + busca aplicados na lista
  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return monthEntries.filter((e) => {
      if (q && !e.description.toLowerCase().includes(q)) return false;
      if (filterCat !== "all" && detectCategory(e.description, e.type) !== filterCat) return false;
      return true;
    });
  }, [monthEntries, search, filterCat]);

  const exportCSV = () => {
    const rows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
      ...monthEntries.map((e) => [
        new Date(e.entry_date).toLocaleDateString("pt-BR"),
        e.type === "in" ? "Entrada" : "Saída",
        CATEGORIES[detectCategory(e.description, e.type)].label,
        `"${e.description.replace(/"/g, '""')}"`,
        e.value.toFixed(2).replace(".", ","),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const detectedCat = desc.trim() ? CATEGORIES[detectCategory(desc, type)] : null;
  const topOut = byCategory[0]?.total ?? 0;

  return (
    <div>
      <ScreenHeader eyebrow="Grana" title="A grana fala." subtitle="Sem controle, sem futuro." />

      {/* Seletor de mês */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
        <button
          onClick={() => {
            const d = new Date(month);
            d.setMonth(d.getMonth() - 1);
            setMonth(d);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          {monthLabel(month)}
        </div>
        <button
          onClick={() => {
            const d = new Date(month);
            d.setMonth(d.getMonth() + 1);
            setMonth(d);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Saldo + entradas/saídas */}
      <div className="mb-4 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Wallet className="h-3 w-3" /> Saldo do mês
        </div>
        <div className={`mt-1 font-display text-4xl ${balance >= 0 ? "text-foreground" : "text-primary"}`}>
          {fmt(balance)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-success">
              <ArrowUpRight className="h-3 w-3" /> Entradas
            </div>
            <div className="mt-1 font-display text-lg">{fmt(ins)}</div>
          </div>
          <div className="rounded-xl bg-background p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-primary">
              <ArrowDownRight className="h-3 w-3" /> Saídas
            </div>
            <div className="mt-1 font-display text-lg">{fmt(outs)}</div>
          </div>
        </div>

        {/* Barra entrada x saída */}
        {ins + outs > 0 && (
          <div className="mt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-background">
              <div
                className="bg-success"
                style={{ width: `${(ins / (ins + outs)) * 100}%` }}
              />
              <div className="bg-primary" style={{ width: `${(outs / (ins + outs)) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Kpi
          icon={PiggyBank}
          label="Poupança"
          value={`${savingsRate.toFixed(0)}%`}
          tone={savingsRate >= 20 ? "success" : savingsRate >= 10 ? "warn" : "bad"}
        />
        <Kpi
          icon={Calendar}
          label="Média/dia"
          value={fmtCompact(dailyAvg)}
          tone="neutral"
        />
        <Kpi
          icon={outsDelta > 0 ? TrendingUp : TrendingDown}
          label="vs mês ant."
          value={prevOuts === 0 ? "—" : `${outsDelta > 0 ? "+" : ""}${outsDelta.toFixed(0)}%`}
          tone={prevOuts === 0 ? "neutral" : outsDelta > 0 ? "bad" : "success"}
        />
      </div>

      {/* Dashboard com gráficos (lazy) */}
      <Suspense
        fallback={<div className="mb-6 h-44 rounded-2xl border border-border bg-surface" />}
      >
        <FinanceDashboard
          entries={monthEntries}
          month={month}
          categoryBreakdown={byCategory.map(({ key, total }) => ({
            label: CATEGORIES[key].label,
            total,
            color: CATEGORIES[key].color,
          }))}
        />
      </Suspense>

      {/* Form de adicionar */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("in")}
            className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition ${
              type === "in" ? "bg-success text-success-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setType("out")}
            className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition ${
              type === "out" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            Saída
          </button>
        </div>
        <div className="space-y-2">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: Mercado, Uber, Salário..."
            maxLength={120}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <Button onClick={add} size="lg" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {detectedCat && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Tag className="h-3 w-3" />
              Categoria detectada: <span className={`font-semibold ${detectedCat.color}`}>{detectedCat.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contas a vencer */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-display text-sm uppercase tracking-widest">
            <CalendarClock className="h-4 w-4 text-primary" /> Contas a vencer
          </h3>
          {(() => {
            const pending = bills.filter((b) => !b.paid);
            const total = pending.reduce((s, b) => s + b.value, 0);
            return pending.length > 0 ? (
              <span className="font-display text-sm text-primary">{fmt(total)}</span>
            ) : null;
          })()}
        </div>

        <div className="mb-3 space-y-2">
          <input
            value={billDesc}
            onChange={(e) => setBillDesc(e.target.value)}
            placeholder="Ex: Aluguel, Cartão, Luz..."
            maxLength={120}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              value={billValue}
              onChange={(e) => setBillValue(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="w-24 rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <input
              type="date"
              value={billDue}
              onChange={(e) => setBillDue(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
            />
            <Button onClick={addBill} size="lg" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {bills.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Nenhuma conta cadastrada.
          </p>
        ) : (
          <ul className="space-y-2">
            {bills.map((b) => {
              const due = new Date(b.due_date + "T00:00:00");
              const today0 = new Date();
              today0.setHours(0, 0, 0, 0);
              const days = Math.round((due.getTime() - today0.getTime()) / 86400000);
              const overdue = !b.paid && days < 0;
              const soon = !b.paid && days >= 0 && days <= 3;
              const label = b.paid
                ? "Pago"
                : overdue
                ? `Atrasada ${Math.abs(days)}d`
                : days === 0
                ? "Vence hoje"
                : days === 1
                ? "Vence amanhã"
                : `Em ${days}d`;
              return (
                <li
                  key={b.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    b.paid
                      ? "border-border bg-background opacity-60"
                      : overdue
                      ? "border-primary/40 bg-primary/5"
                      : soon
                      ? "border-yellow-500/30 bg-yellow-500/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      overdue ? "bg-primary/15" : "bg-surface"
                    }`}
                  >
                    {overdue ? (
                      <AlertTriangle className="h-4 w-4 text-primary" />
                    ) : (
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${b.paid ? "line-through" : ""}`}>
                      {b.description}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{due.toLocaleDateString("pt-BR")}</span>
                      <span>•</span>
                      <span
                        className={
                          overdue ? "text-primary" : soon ? "text-yellow-400" : ""
                        }
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                  <div className="font-display text-base">{fmt(b.value)}</div>
                  {!b.paid && (
                    <button
                      onClick={() => payBill(b)}
                      className="rounded-lg bg-success/15 p-2 text-success hover:bg-success/25"
                      aria-label="Marcar como paga"
                      title="Marcar como paga"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeBill(b.id)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Top categorias */}
      {byCategory.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 font-display text-sm uppercase tracking-widest text-muted-foreground">
            Onde sua grana foi
          </h3>
          <ul className="space-y-2.5">
            {byCategory.slice(0, 5).map(({ key, total }) => {
              const cfg = CATEGORIES[key];
              const Icon = cfg.icon;
              const pct = topOut > 0 ? (total / topOut) * 100 : 0;
              return (
                <li key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      <span className="font-semibold">{cfg.label}</span>
                    </span>
                    <span className="font-display">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Filtros + ações */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">Movimentações</h2>
        <button
          onClick={exportCSV}
          disabled={monthEntries.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>

      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          <Chip active={filterCat === "all"} onClick={() => setFilterCat("all")}>
            Todas
          </Chip>
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((k) => {
            const cfg = CATEGORIES[k];
            return (
              <Chip key={k} active={filterCat === k} onClick={() => setFilterCat(k)}>
                {cfg.label}
              </Chip>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {monthEntries.length === 0 ? "Nada por aqui. Bora registrar." : "Nenhum lançamento com esses filtros."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => {
            const cat = detectCategory(e.description, e.type);
            const cfg = CATEGORIES[cat];
            const Icon = cfg.icon;
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    e.type === "in" ? "bg-success/15" : "bg-primary/10"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{e.description}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{new Date(e.entry_date).toLocaleDateString("pt-BR")}</span>
                    <span>•</span>
                    <span>{cfg.label}</span>
                  </div>
                </div>
                <div
                  className={`font-display text-base ${e.type === "in" ? "text-success" : "text-primary"}`}
                >
                  {e.type === "in" ? "+" : "−"} {fmt(e.value)}
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
  tone: "success" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "bad"
      ? "text-primary"
      : tone === "warn"
      ? "text-yellow-400"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 font-display text-base leading-tight ${toneClass}`}>{value}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function FinanceiroPage() {
  return (
    <PremiumGate
      title="Controle financeiro"
      description="Categorias, indicadores, comparativos e exportação. Pare de se enganar com a grana."
    >
      <Financeiro />
    </PremiumGate>
  );
}
