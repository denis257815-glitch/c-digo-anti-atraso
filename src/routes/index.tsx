import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Megaphone, X } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StreakCard, AchievementsPanel } from "@/components/Engagement";
import { quoteOfDay } from "@/lib/quotes";

function BroadcastBanner() {
  const [b, setB] = useState<{ id: string; title: string; body: string } | null>(null);
  useEffect(() => {
    supabase
      .from("broadcasts")
      .select("id,title,body")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (localStorage.getItem("broadcast_dismissed") === data.id) return;
        setB(data);
      });
  }, []);
  if (!b) return null;
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-primary/40 bg-primary/10 p-4">
      <button
        onClick={() => { localStorage.setItem("broadcast_dismissed", b.id); setB(null); }}
        className="absolute right-2 top-2 text-primary/70 hover:text-primary"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-1 flex items-center gap-2 text-primary">
        <Megaphone className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{b.title}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{b.body}</p>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoje — Código Anti-Atraso" },
      { name: "description", content: "Suas tarefas do dia. Foco no que importa." },
    ],
  }),
  component: Dashboard,
});

type Task = { id: string; text: string; done: boolean };

const greetings = [
  "Bora sair do atraso.",
  "Sem desculpa. Hoje é dia.",
  "Disciplina agora. Liberdade depois.",
  "Foco no que importa.",
  "Quem quer mudança começa hoje.",
];

function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [greeting, setGreeting] = useState(greetings[0]);

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("id,text,done")
      .order("created_at", { ascending: true })
      .then(({ data }) => setTasks(data ?? []));
  }, [user]);

  const toggle = async (id: string, done: boolean) => {
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !done } : x)));
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
  };

  const remove = async (id: string) => {
    setTasks((t) => t.filter((x) => x.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const add = async () => {
    if (!input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    const { data } = await supabase
      .from("tasks")
      .insert({ user_id: user.id, text })
      .select("id,text,done")
      .single();
    if (data) setTasks((t) => [...t, data]);
  };

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <ScreenHeader
        eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
        title={greeting}
      />

      <BroadcastBanner />

      <div className="relative mb-7 overflow-hidden rounded-2xl border border-border bg-surface p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative mb-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              Progresso do dia
            </div>
            <div className="mt-1 font-display text-4xl leading-none">
              {done}
              <span className="text-muted-foreground">/{total}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-5xl leading-none text-primary">{pct}%</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              {pct === 100 ? "Bateu meta" : pct >= 50 ? "Bora terminar" : "Ainda dá tempo"}
            </div>
          </div>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl leading-none">Checklist do dia</h2>
        {total > 0 && (
          <span className="font-display text-xs tracking-[0.2em] text-muted-foreground">
            {total - done} restantes
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem tarefas. Adiciona a primeira.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <button
                onClick={() => toggle(t.id, t.done)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition ${
                  t.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
                }`}
              >
                {t.done && <Check className="h-4 w-4" />}
              </button>
              <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {t.text}
              </span>
              <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-primary">
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
          placeholder="Nova tarefa..."
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary"
        />
        <Button onClick={add} size="lg" className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-10 border-l-4 border-primary py-2 pl-4">
        <p className="font-display text-lg leading-tight tracking-wide">
          {quoteOfDay()}
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Código Anti-Atraso
        </p>
      </div>
    </div>
  );
}
