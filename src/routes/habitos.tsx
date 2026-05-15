import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Flame, Sparkles } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { todayKey } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/habitos")({
  head: () => ({
    meta: [
      { title: "Hábitos — Código Anti-Atraso" },
      { name: "description", content: "Construa hábitos. Quebre o ciclo do atraso." },
    ],
  }),
  component: HabitosPage,
});

type Habit = { id: string; name: string; history: string[] };

function streak(history: string[]): number {
  if (!history.length) return 0;
  const set = new Set(history);
  let count = 0;
  const d = new Date();
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (set.has(k)) {
      count++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return count;
}

const SUGGESTIONS: { group: string; items: string[] }[] = [
  {
    group: "Corpo",
    items: [
      "Beber 2L de água",
      "Treinar 30 min",
      "Caminhar 8 mil passos",
      "Dormir antes das 23h",
      "Acordar 6h",
      "Alongar 10 min",
    ],
  },
  {
    group: "Mente",
    items: [
      "Ler 10 páginas",
      "Meditar 5 min",
      "Escrever no diário",
      "Estudar 30 min",
      "Sem celular na 1ª hora",
    ],
  },
  {
    group: "Grana & Trabalho",
    items: [
      "Anotar gastos do dia",
      "1 tarefa importante antes do meio-dia",
      "Revisar metas da semana",
      "Prospectar 5 clientes",
    ],
  },
  {
    group: "Espírito & Família",
    items: [
      "Orar / agradecer",
      "Ligar pra família",
      "Tempo de qualidade com filhos",
      "Sem rede social depois das 21h",
    ],
  },
];

function Habitos() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const today = todayKey();

  const reload = async () => {
    if (!user) return;
    const { data: hs } = await supabase.from("aa_habits").select("id,name").order("created_at");
    const { data: logs } = await supabase.from("aa_habit_logs").select("habit_id,date");
    const byHabit: Record<string, string[]> = {};
    (logs ?? []).forEach((l) => {
      (byHabit[l.habit_id] ??= []).push(l.date);
    });
    setHabits((hs ?? []).map((h) => ({ id: h.id, name: h.name, history: byHabit[h.id] ?? [] })));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleToday = async (id: string) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const has = habit.history.includes(today);
    setHabits((hs) =>
      hs.map((h) =>
        h.id === id
          ? { ...h, history: has ? h.history.filter((d) => d !== today) : [...h.history, today] }
          : h,
      ),
    );
    if (has) {
      await supabase.from("aa_habit_logs").delete().eq("habit_id", id).eq("date", today);
    } else {
      await supabase.from("aa_habit_logs").insert({ habit_id: id, user_id: user.id, date: today });
    }
  };

  const add = async (nameArg?: string) => {
    const name = (nameArg ?? input).trim();
    if (!user) return;
    if (!name) {
      toast.error("Digite o nome do hábito.");
      return;
    }
    if (name.length > 100) {
      toast.error("O nome do hábito deve ter no máximo 100 caracteres.");
      return;
    }
    if (habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Esse hábito já existe.");
      return;
    }
    if (!nameArg) setInput("");
    const { data, error } = await supabase
      .from("aa_habits")
      .insert({ user_id: user.id, name })
      .select("id,name")
      .single();
    if (error) {
      toast.error("Não foi possível salvar.", { description: error.message });
      return;
    }
    if (data) {
      setHabits((hs) => [...hs, { id: data.id, name: data.name, history: [] }]);
      toast.success("Hábito adicionado.");
    }
  };

  const remove = async (id: string) => {
    setHabits((hs) => hs.filter((h) => h.id !== id));
    const { error } = await supabase.from("aa_habits").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover.", { description: error.message });
    else toast.success("Hábito removido.");
  };

  // Sugestões automáticas baseadas no que o usuário marcou esta semana.
  const smartPicks = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStart = weekAgo.toISOString().slice(0, 10);

    // Conta marcações por hábito nos últimos 7 dias e identifica grupo.
    const groupScore: Record<string, number> = {};
    habits.forEach((h) => {
      const recent = h.history.filter((d) => d >= weekStart).length;
      const grp = SUGGESTIONS.find((g) =>
        g.items.some((it) => it.toLowerCase() === h.name.toLowerCase()),
      );
      if (grp) groupScore[grp.group] = (groupScore[grp.group] ?? 0) + recent;
    });

    const owned = new Set(habits.map((h) => h.name.toLowerCase()));
    const ranked = [...SUGGESTIONS].sort(
      (a, b) => (groupScore[b.group] ?? 0) - (groupScore[a.group] ?? 0),
    );

    const picks: { name: string; group: string }[] = [];
    // Pega 1 por grupo, priorizando grupos mais marcados.
    for (const g of ranked) {
      const cand = g.items.find((it) => !owned.has(it.toLowerCase()));
      if (cand) picks.push({ name: cand, group: g.group });
      if (picks.length === 3) break;
    }
    // Se ainda faltar, completa com qualquer outro não usado.
    if (picks.length < 3) {
      for (const g of SUGGESTIONS) {
        for (const it of g.items) {
          if (picks.length === 3) break;
          if (!owned.has(it.toLowerCase()) && !picks.some((p) => p.name === it)) {
            picks.push({ name: it, group: g.group });
          }
        }
      }
    }
    return picks;
  }, [habits]);

  const hasWeekActivity = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStart = weekAgo.toISOString().slice(0, 10);
    return habits.some((h) => h.history.some((d) => d >= weekStart));
  }, [habits]);

  return (
    <div>
      <ScreenHeader eyebrow="Hábitos" title="Constrói. Repete. Vence." subtitle="Marca o que fez. Não quebra a sequência." />

      {smartPicks.length > 0 && (
        <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Sugeridos pra você
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {hasWeekActivity
              ? "Baseado no que você marcou esta semana. Toca pra adicionar."
              : "Comece por um destes. Toca pra adicionar."}
          </p>
          <div className="space-y-2">
            {smartPicks.map((p) => (
              <button
                key={p.name}
                onClick={() => add(p.name)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm transition hover:border-primary hover:text-primary"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  + {p.group}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sem hábito ainda. Começa por um. Só um.
        </p>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => {
            const doneToday = h.history.includes(today);
            const s = streak(h.history);
            return (
              <li key={h.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                <button
                  onClick={() => toggleToday(h.id)}
                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 transition ${
                    doneToday ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
                  }`}
                >
                  <Flame className="h-4 w-4" />
                  <span className="text-[10px] font-bold leading-none">{s}d</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {doneToday ? "Concluído hoje" : "Marca quando fizer"} · sequência {s} dias
                  </div>
                </div>
                <button onClick={() => remove(h.id)} className="text-muted-foreground hover:text-primary">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Novo hábito..."
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <SaveButton onClick={() => add()} size="lg" className="bg-primary hover:bg-primary/90" aria-label="Adicionar hábito">
          <Plus className="h-4 w-4" />
        </SaveButton>
      </div>

      <div className="mt-6">
        <button
          onClick={() => setShowSuggestions((v) => !v)}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          {showSuggestions ? "Ocultar sugestões" : "Ver sugestões de hábitos"}
        </button>

        {showSuggestions && (
          <div className="mt-4 space-y-5">
            <p className="text-xs text-muted-foreground">
              Toque pra adicionar. Começa pequeno — 1 ou 2 já mudam tua semana.
            </p>
            {SUGGESTIONS.map((cat) => (
              <div key={cat.group}>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {cat.group}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => {
                    const already = habits.some(
                      (h) => h.name.toLowerCase() === item.toLowerCase(),
                    );
                    return (
                      <button
                        key={item}
                        onClick={() => add(item)}
                        disabled={already}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          already
                            ? "border-border bg-surface text-muted-foreground opacity-50"
                            : "border-border bg-surface hover:border-primary hover:text-primary"
                        }`}
                      >
                        {already ? "✓ " : "+ "}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitosPage() {
  return (
    <PremiumGate title="Hábitos com sequência" description="Histórico, streak e salvamento de progresso liberado no Premium.">
      <Habitos />
    </PremiumGate>
  );
}
