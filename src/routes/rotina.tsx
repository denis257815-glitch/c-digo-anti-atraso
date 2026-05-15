import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sun, Coffee, Moon, Check, Plus, Pencil, Trash2, Flame, Clock } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { todayKey } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina Diária — Código Anti-Atraso" },
      { name: "description", content: "Manhã, dia e noite. Estrutura simples para sair do caos." },
    ],
  }),
  component: Rotina,
});

type Block = "manha" | "dia" | "noite";
type Item = { id: string; block: Block; text: string; time: string | null; position: number };

const BLOCKS: { key: Block; label: string; icon: typeof Sun; range: [number, number] }[] = [
  { key: "manha", label: "Manhã", icon: Sun, range: [5, 12] },
  { key: "dia", label: "Dia", icon: Coffee, range: [12, 18] },
  { key: "noite", label: "Noite", icon: Moon, range: [18, 29] }, // 29 = 5h next day
];

const DEFAULTS: { block: Block; text: string; time: string | null }[] = [
  { block: "manha", text: "Acordar no horário", time: "06:30" },
  { block: "manha", text: "Definir o foco do dia", time: "07:00" },
  { block: "manha", text: "Não pegar o celular ao acordar", time: null },
  { block: "dia", text: "Bater as tarefas principais", time: null },
  { block: "dia", text: "Cortar distração", time: null },
  { block: "dia", text: "Manter o foco", time: null },
  { block: "noite", text: "Revisar o dia", time: "21:00" },
  { block: "noite", text: "Planejar o próximo", time: "21:30" },
  { block: "noite", text: "Desligar o celular cedo", time: "22:30" },
];

function activeBlock(): Block {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "dia";
  return "noite";
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
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
      <style>{`@keyframes confetti-fall { 0%{transform:translateY(-10vh) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:.6} }`}</style>
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
        cx="36" cy="36" r={r} stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

function Rotina() {
  const { user } = useAuth();
  const date = todayKey();
  const [items, setItems] = useState<Item[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<Record<string, number>>({}); // date -> count done
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("");
  const [adding, setAdding] = useState<Block | null>(null);
  const [newText, setNewText] = useState("");
  const [newTime, setNewTime] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [now, setNow] = useState(new Date());
  const prevDoneRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Load items + seed defaults if empty
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("aa_routine_items")
        .select("id,block,text,time,position")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      let list = (data as Item[]) ?? [];
      if (list.length === 0) {
        const seed = DEFAULTS.map((d, i) => ({ user_id: user.id, ...d, position: i }));
        const { data: inserted } = await supabase
          .from("aa_routine_items")
          .insert(seed)
          .select("id,block,text,time,position");
        list = (inserted as Item[]) ?? [];
      }
      setItems(list);
    })();
  }, [user]);

  // Today's checks
  useEffect(() => {
    if (!user) return;
    supabase
      .from("aa_routine_checks")
      .select("item_key,done")
      .eq("date", date)
      .then(({ data }) => {
        const s: Record<string, boolean> = {};
        (data ?? []).forEach((r) => { s[r.item_key] = r.done; });
        setChecks(s);
      });
  }, [user, date]);

  // Last 30 days history
  useEffect(() => {
    if (!user) return;
    const start = lastNDates(30)[0];
    supabase
      .from("aa_routine_checks")
      .select("date,done")
      .gte("date", start)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r) => {
          if (r.done) map[r.date] = (map[r.date] || 0) + 1;
        });
        setHistory(map);
      });
  }, [user, date]);

  const total = items.length;
  const doneCount = items.filter((it) => checks[it.id]).length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  useEffect(() => {
    if (total > 0 && doneCount === total && prevDoneRef.current < total) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2500);
      return () => clearTimeout(t);
    }
    prevDoneRef.current = doneCount;
  }, [doneCount, total]);

  // Streak: consecutive days backwards where doneCount(day) >= total
  const streak = useMemo(() => {
    if (total === 0) return 0;
    const dates = lastNDates(30).slice().reverse(); // today first
    let s = 0;
    for (const d of dates) {
      const c = d === date ? doneCount : (history[d] || 0);
      if (c >= total) s++;
      else if (d === date && c < total) {
        // today not complete: don't break streak from yesterday
        continue;
      } else break;
    }
    return s;
  }, [history, doneCount, total, date]);

  const current = activeBlock();

  const toggle = async (item: Item) => {
    if (!user) return;
    const next = !checks[item.id];
    setChecks((s) => ({ ...s, [item.id]: next }));
    if (next) {
      await supabase.from("aa_routine_checks").upsert({ user_id: user.id, date, item_key: item.id, done: true });
    } else {
      await supabase.from("aa_routine_checks").delete().eq("user_id", user.id).eq("date", date).eq("item_key", item.id);
    }
  };

  const addItem = async (block: Block) => {
    if (!user) return;
    const text = newText.trim();
    if (!text) {
      toast.error("Digite um texto para o item.");
      return;
    }
    if (text.length > 200) {
      toast.error("O item deve ter no máximo 200 caracteres.");
      return;
    }
    if (!newTime) {
      toast.error("Defina um horário.", { description: "Itens da rotina precisam ter um horário." });
      return;
    }
    const position = items.filter((i) => i.block === block).length;
    const { data, error } = await supabase
      .from("aa_routine_items")
      .insert({ user_id: user.id, block, text, time: newTime, position })
      .select("id,block,text,time,position")
      .single();
    if (error) {
      toast.error("Não foi possível salvar.", { description: error.message });
      return;
    }
    if (data) setItems((arr) => [...arr, data as Item]);
    setAdding(null); setNewText(""); setNewTime("");
    toast.success("Item adicionado.");
  };

  const startEdit = (it: Item) => { setEditingId(it.id); setEditText(it.text); setEditTime(it.time ?? ""); };

  const saveEdit = async () => {
    if (!editingId) return;
    const id = editingId;
    const text = editText.trim();
    if (!text) {
      toast.error("Digite um texto para o item.");
      return;
    }
    if (text.length > 200) {
      toast.error("O item deve ter no máximo 200 caracteres.");
      return;
    }
    if (!editTime) {
      toast.error("Defina um horário.", { description: "Itens da rotina precisam ter um horário." });
      return;
    }
    const time = editTime;
    setEditingId(null);
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, text, time } : x)));
    const { error } = await supabase.from("aa_routine_items").update({ text, time }).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar a edição.", { description: error.message });
      return;
    }
    toast.success("Item atualizado.");
  };

  const removeItem = async (id: string) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    const { error } = await supabase.from("aa_routine_items").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover.", { description: error.message });
    else toast.success("Item removido.");
  };

  const resetDay = async () => {
    if (!user) return;
    setChecks({});
    await supabase.from("aa_routine_checks").delete().eq("user_id", user.id).eq("date", date);
  };

  const dates30 = lastNDates(30);
  const heatMax = Math.max(total, ...Object.values(history), 1);

  return (
    <div>
      <Confetti show={confetti} />
      <ScreenHeader eyebrow="Rotina" title="Estrutura do dia" subtitle="Sem rotina, sem disciplina." />

      {/* Top progress + streak */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProgressRing pct={pct} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-lg">{pct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Hoje</div>
            <div className="font-display text-2xl">
              {doneCount}<span className="text-muted-foreground">/{total}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-amber-500">
              <Flame className="h-4 w-4" />
              <span className="font-display text-2xl leading-none">{streak}</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">streak</div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Heatmap 30 days */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Últimos 30 dias</div>
            <button onClick={resetDay} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary">
              Resetar dia
            </button>
          </div>
          <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5">
            {dates30.map((d) => {
              const c = d === date ? doneCount : (history[d] || 0);
              const intensity = total === 0 ? 0 : Math.min(1, c / heatMax);
              const isToday = d === date;
              return (
                <div
                  key={d}
                  title={`${d}: ${c}/${total}`}
                  className={cn("aspect-square rounded-[2px]", isToday && "ring-1 ring-primary")}
                  style={{
                    backgroundColor:
                      intensity === 0
                        ? "hsl(var(--border))"
                        : `color-mix(in oklab, hsl(var(--primary)) ${Math.round(intensity * 100)}%, hsl(var(--border)))`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-5">
        {BLOCKS.map((b) => {
          const Icon = b.icon;
          const blockItems = items.filter((i) => i.block === b.key);
          const blockDone = blockItems.filter((i) => checks[i.id]).length;
          const blockPct = blockItems.length === 0 ? 0 : Math.round((blockDone / blockItems.length) * 100);
          const isActive = current === b.key;
          return (
            <section
              key={b.key}
              className={cn(
                "overflow-hidden rounded-2xl border bg-surface transition",
                isActive ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]" : "border-border",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl leading-none">{b.label}</h2>
                    {isActive && <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-primary">Agora</div>}
                  </div>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {blockDone}/{blockItems.length}
                </div>
              </div>
              <div className="h-1 w-full bg-border">
                <div
                  className="h-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${blockPct}%` }}
                />
              </div>
              <ul>
                {blockItems.map((it) => {
                  const done = !!checks[it.id];
                  const isEditing = editingId === it.id;
                  return (
                    <li key={it.id} className="group flex items-center gap-3 border-b border-border/50 px-5 py-3 last:border-0">
                      <button
                        onClick={() => toggle(it)}
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition active:scale-90",
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
                        )}
                      >
                        {done && <Check className="h-3.5 w-3.5 animate-scale-in" />}
                      </button>
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            autoFocus value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                            className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none"
                          />
                          <input
                            type="time" value={editTime} required
                            onChange={(e) => setEditTime(e.target.value)}
                            className={cn(
                              "w-20 rounded border bg-background px-1 py-1 text-xs outline-none",
                              editTime ? "border-border" : "border-red-500/60",
                            )}
                          />
                          <button onClick={saveEdit} className="text-primary"><Check className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-1 items-center gap-2">
                            {it.time && (
                              <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                {it.time}
                              </span>
                            )}
                            <span className={cn("text-sm", done && "text-muted-foreground line-through")}>{it.text}</span>
                          </div>
                          <div className="flex gap-1.5 opacity-50 group-hover:opacity-100">
                            <button onClick={() => startEdit(it)} className="text-muted-foreground hover:text-primary">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
                {adding === b.key ? (
                  <li className="flex items-center gap-2 border-t border-border/50 px-5 py-3">
                    <input
                      autoFocus value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addItem(b.key); if (e.key === "Escape") { setAdding(null); setNewText(""); } }}
                      placeholder="Novo item..."
                      className="flex-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none"
                    />
                    <input
                      type="time" value={newTime} required
                      onChange={(e) => setNewTime(e.target.value)}
                      className={cn(
                        "w-20 rounded border bg-background px-1 py-1 text-xs outline-none",
                        newTime ? "border-border" : "border-red-500/60",
                      )}
                    />
                    <button onClick={() => addItem(b.key)} className="text-primary"><Check className="h-4 w-4" /></button>
                  </li>
                ) : (
                  <li className="border-t border-border/50">
                    <button
                      onClick={() => { setAdding(b.key); setNewText(""); setNewTime(""); }}
                      className="flex w-full items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar item
                    </button>
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-10 border-l-4 border-primary py-2 pl-4">
        <p className="font-display text-lg leading-tight tracking-wide">Disciplina todo dia.</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Pequenas ações. Grandes mudanças.
        </p>
      </div>
    </div>
  );
}
