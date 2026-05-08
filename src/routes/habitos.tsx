import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Flame } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { todayKey } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

function Habitos() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [input, setInput] = useState("");
  const today = todayKey();

  const reload = async () => {
    if (!user) return;
    const { data: hs } = await supabase.from("habits").select("id,name").order("created_at");
    const { data: logs } = await supabase.from("habit_logs").select("habit_id,date");
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
      await supabase.from("habit_logs").delete().eq("habit_id", id).eq("date", today);
    } else {
      await supabase.from("habit_logs").insert({ habit_id: id, user_id: user.id, date: today });
    }
  };

  const add = async () => {
    if (!input.trim() || !user) return;
    const name = input.trim();
    setInput("");
    const { data } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name })
      .select("id,name")
      .single();
    if (data) setHabits((hs) => [...hs, { id: data.id, name: data.name, history: [] }]);
  };

  const remove = async (id: string) => {
    setHabits((hs) => hs.filter((h) => h.id !== id));
    await supabase.from("habits").delete().eq("id", id);
  };

  return (
    <div>
      <ScreenHeader eyebrow="Hábitos" title="Constrói. Repete. Vence." subtitle="Marca o que fez hoje. Mantém a sequência." />

      {habits.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Adiciona o primeiro hábito.</p>
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
        <Button onClick={add} size="lg" className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </Button>
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
