import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Target } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas da Semana — Código Anti-Atraso" },
      { name: "description", content: "Defina metas semanais e bata todas." },
    ],
  }),
  component: MetasPage,
});

type Goal = { id: string; text: string; done: boolean };

function Metas() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("aa_goals")
      .select("id,text,done")
      .order("created_at", { ascending: true })
      .then(({ data }) => setGoals(data ?? []));
  }, [user]);

  const add = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    const { data } = await supabase
      .from("aa_goals")
      .insert({ user_id: user.id, text })
      .select("id,text,done")
      .single();
    if (data) setGoals((g) => [...g, data]);
  };

  const toggle = async (id: string, done: boolean) => {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, done: !done } : x)));
    await supabase.from("aa_goals").update({ done: !done }).eq("id", id);
  };

  const remove = async (id: string) => {
    setGoals((g) => g.filter((x) => x.id !== id));
    await supabase.from("aa_goals").delete().eq("id", id);
  };

  const done = goals.filter((g) => g.done).length;

  return (
    <div>
      <ScreenHeader eyebrow="Metas da semana" title="O que vai bater?" subtitle="Sem meta, sem direção." />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Concluídas</div>
          <div className="font-display text-2xl">
            {done}<span className="text-muted-foreground">/{goals.length || 0}</span>
          </div>
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Define a primeira meta da semana.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <button
                onClick={() => toggle(g.id, g.done)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition ${
                  g.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
                }`}
              >
                {g.done && <Check className="h-4 w-4" />}
              </button>
              <span className={`flex-1 text-sm ${g.done ? "text-muted-foreground line-through" : ""}`}>{g.text}</span>
              <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-primary">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nova meta da semana..."
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <Button onClick={add} size="lg" className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-10 border-l-4 border-primary py-2 pl-4">
        <p className="font-display text-lg leading-tight tracking-wide">Foco no que importa.</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Meta sem ação é desejo.
        </p>
      </div>
    </div>
  );
}

function MetasPage() {
  return (
    <PremiumGate title="Metas da semana" description="Define metas, bate metas. Liberado no modo anti-atraso completo.">
      <Metas />
    </PremiumGate>
  );
}
