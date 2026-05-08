import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Grana — Código Anti-Atraso" },
      { name: "description", content: "Controle simples de entradas e gastos." },
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

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Financeiro() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [type, setType] = useState<"in" | "out">("in");
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("finance_entries")
      .select("id,type,description,value,entry_date")
      .order("entry_date", { ascending: false })
      .then(({ data }) =>
        setEntries(((data ?? []) as Entry[]).map((e) => ({ ...e, value: Number(e.value) }))),
      );
  }, [user]);

  const add = async () => {
    const v = parseFloat(value.replace(",", "."));
    if (!desc.trim() || isNaN(v) || v <= 0 || !user) return;
    const description = desc.trim();
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

  const ins = entries.filter((e) => e.type === "in").reduce((s, e) => s + e.value, 0);
  const outs = entries.filter((e) => e.type === "out").reduce((s, e) => s + e.value, 0);
  const balance = ins - outs;

  return (
    <div>
      <ScreenHeader eyebrow="Grana" title="A grana fala." subtitle="Sem controle, sem futuro." />

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Saldo atual</div>
        <div className={`font-display text-4xl ${balance >= 0 ? "text-foreground" : "text-primary"}`}>
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
      </div>

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
            placeholder="Descrição"
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
        </div>
      </div>

      <h2 className="mb-3 font-display text-xl">Movimentações</h2>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nada por aqui. Bora registrar.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                e.type === "in" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
              }`}>
                {e.type === "in" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{e.description}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(e.entry_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className={`font-display text-base ${e.type === "in" ? "text-success" : "text-primary"}`}>
                {e.type === "in" ? "+" : "−"} {fmt(e.value)}
              </div>
              <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-primary">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FinanceiroPage() {
  return (
    <PremiumGate title="Controle financeiro" description="Entradas, saídas e saldo no Premium. Pare de se enganar com a grana.">
      <Financeiro />
    </PremiumGate>
  );
}
