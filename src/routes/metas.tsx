import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Check, Target, Pencil, Calendar as CalendarIcon, Flame, Clock } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PremiumGate } from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas da Semana — Código Anti-Atraso" },
      { name: "description", content: "Defina metas semanais e bata todas." },
    ],
  }),
  component: MetasPage,
});

type Category = "saude" | "trabalho" | "financas" | "pessoal" | "geral";
type Priority = "alta" | "media" | "baixa";

type Goal = {
  id: string;
  text: string;
  done: boolean;
  category: Category;
  priority: Priority;
  deadline: string | null;
};

const CATEGORIES: { id: Category; label: string; dot: string; chip: string }[] = [
  { id: "geral", label: "Geral", dot: "bg-muted-foreground", chip: "bg-muted text-foreground" },
  { id: "saude", label: "Saúde", dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-500" },
  { id: "trabalho", label: "Trabalho", dot: "bg-blue-500", chip: "bg-blue-500/15 text-blue-500" },
  { id: "financas", label: "Finanças", dot: "bg-amber-500", chip: "bg-amber-500/15 text-amber-500" },
  { id: "pessoal", label: "Pessoal", dot: "bg-fuchsia-500", chip: "bg-fuchsia-500/15 text-fuchsia-500" },
];

const PRIORITIES: { id: Priority; label: string; cls: string }[] = [
  { id: "alta", label: "Alta", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  { id: "media", label: "Média", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { id: "baixa", label: "Baixa", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
];

function getCategory(id: Category) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
function getPriority(id: Priority) {
  return PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];
}

function deadlineStatus(deadline: string | null): { label: string; cls: string } | null {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Atrasada ${Math.abs(diff)}d`, cls: "text-red-500" };
  if (diff === 0) return { label: "Hoje", cls: "text-amber-500" };
  if (diff === 1) return { label: "Amanhã", cls: "text-amber-400" };
  return { label: `Em ${diff}d`, cls: "text-muted-foreground" };
}

function endOfWeekCountdown(): string {
  const now = new Date();
  const day = now.getDay(); // 0=dom
  const daysToSunday = (7 - day) % 7;
  const end = new Date(now);
  end.setDate(now.getDate() + (daysToSunday || 7));
  end.setHours(23, 59, 59, 999);
  const ms = end.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function motivationalMessage(pct: number, total: number): string {
  if (total === 0) return "Define a primeira meta. Direção antes de velocidade.";
  if (pct === 100) return "Semana fechada. Você fez. Próxima.";
  if (pct >= 75) return "Quase lá. Não afrouxa no final.";
  if (pct >= 50) return "Metade do caminho. Mantém o ritmo.";
  if (pct >= 25) return "Tá rolando. Não para agora.";
  return "Bora começar. Uma meta por vez.";
}

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 40 });
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1.4 + Math.random() * 1;
        const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-fuchsia-500", "bg-blue-500"];
        const color = colors[i % colors.length];
        const size = 6 + Math.floor(Math.random() * 6);
        return (
          <span
            key={i}
            className={cn("absolute top-0 rounded-sm", color)}
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 1.6}px`,
              animation: `confetti-fall ${duration}s ${delay}s linear forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} stroke="currentColor" strokeWidth="6" fill="none" className="text-border" />
      <circle
        cx="36"
        cy="36"
        r={r}
        stroke="currentColor"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

function Metas() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category>("geral");
  const [priority, setPriority] = useState<Priority>("media");
  const [deadline, setDeadline] = useState<string>("");
  const [filter, setFilter] = useState<"todas" | "pendentes" | "concluidas">("todas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [countdown, setCountdown] = useState(endOfWeekCountdown());
  const prevDoneRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setCountdown(endOfWeekCountdown()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("aa_goals")
      .select("id,text,done,category,priority,deadline")
      .order("created_at", { ascending: true })
      .then(({ data }) => setGoals((data as Goal[]) ?? []));
  }, [user]);

  const done = goals.filter((g) => g.done).length;
  const total = goals.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  useEffect(() => {
    if (total > 0 && done === total && prevDoneRef.current < total) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2500);
      return () => clearTimeout(t);
    }
    prevDoneRef.current = done;
  }, [done, total]);

  const filtered = useMemo(() => {
    if (filter === "pendentes") return goals.filter((g) => !g.done);
    if (filter === "concluidas") return goals.filter((g) => g.done);
    return goals;
  }, [goals, filter]);

  const add = async () => {
    if (!user) return;
    const text = input.trim();
    if (!text) {
      toast.error("Escreva sua meta antes de adicionar.");
      return;
    }
    if (text.length > 200) {
      toast.error("A meta deve ter no máximo 200 caracteres.");
      return;
    }
    const payload = {
      user_id: user.id,
      text,
      category,
      priority,
      deadline: deadline || null,
    };
    setInput("");
    setDeadline("");
    const { data, error } = await supabase
      .from("aa_goals")
      .insert(payload)
      .select("id,text,done,category,priority,deadline")
      .single();
    if (error) {
      toast.error("Não foi possível salvar a meta.", { description: error.message });
      return;
    }
    if (data) setGoals((g) => [...g, data as Goal]);
    toast.success("Meta adicionada.");
  };

  const toggle = async (id: string, isDone: boolean) => {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, done: !isDone } : x)));
    const { error } = await supabase.from("aa_goals").update({ done: !isDone }).eq("id", id);
    if (error) toast.error("Não foi possível atualizar.", { description: error.message });
  };

  const remove = async (id: string) => {
    setGoals((g) => g.filter((x) => x.id !== id));
    const { error } = await supabase.from("aa_goals").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover.", { description: error.message });
    else toast.success("Meta removida.");
  };

  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditText(g.text);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const newText = editText.trim();
    const id = editingId;
    if (!newText) {
      toast.error("A meta não pode ficar vazia.");
      return;
    }
    if (newText.length > 200) {
      toast.error("A meta deve ter no máximo 200 caracteres.");
      return;
    }
    setEditingId(null);
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, text: newText } : x)));
    const { error } = await supabase.from("aa_goals").update({ text: newText }).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar a edição.", { description: error.message });
      return;
    }
    toast.success("Meta atualizada.");
  };

  return (
    <div>
      <Confetti show={confetti} />
      <ScreenHeader eyebrow="Metas da semana" title="O que vai bater?" subtitle="Sem meta, sem direção." />

      {/* Progress card */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProgressRing pct={pct} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-lg">{pct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Concluídas</div>
            <div className="font-display text-2xl">
              {done}<span className="text-muted-foreground">/{total || 0}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Fecha em {countdown}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs italic text-muted-foreground">{motivationalMessage(pct, total)}</p>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["todas", "pendentes", "concluidas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition",
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "todas" ? "Todas" : f === "pendentes" ? "Pendentes" : "Feitas"}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {total === 0 ? "Define a primeira meta da semana." : "Nada por aqui."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => {
            const cat = getCategory(g.category);
            const pri = getPriority(g.priority);
            const ds = deadlineStatus(g.deadline);
            return (
              <li
                key={g.id}
                className={cn(
                  "group flex animate-fade-in items-start gap-3 rounded-xl border border-border bg-surface p-4 transition",
                  g.done && "opacity-70",
                )}
              >
                <button
                  onClick={() => toggle(g.id, g.done)}
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition active:scale-90",
                    g.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/60",
                  )}
                >
                  {g.done && <Check className="h-4 w-4 animate-scale-in" />}
                </button>

                <div className="flex-1">
                  {editingId === g.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-md border border-primary/40 bg-background px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => !g.done && startEdit(g)}
                      className={cn(
                        "block w-full text-left text-sm",
                        g.done && "text-muted-foreground line-through",
                      )}
                    >
                      {g.text}
                    </button>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", cat.chip)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", cat.dot)} />
                      {cat.label}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", pri.cls)}>
                      <Flame className="h-2.5 w-2.5" />
                      {pri.label}
                    </span>
                    {ds && (
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider", ds.cls)}>
                        <CalendarIcon className="h-2.5 w-2.5" />
                        {ds.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100">
                  {!g.done && (
                    <button onClick={() => startEdit(g)} className="text-muted-foreground hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add form */}
      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nova meta da semana..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />

        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition",
                  category === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</div>
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={cn(
                  "flex-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition",
                  priority === p.id ? p.cls : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <SaveButton onClick={add} size="lg" className="bg-primary hover:bg-primary/90" aria-label="Adicionar meta">
            <Plus className="h-4 w-4" />
          </SaveButton>
        </div>
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
