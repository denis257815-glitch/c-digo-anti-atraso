import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Coffee, Moon, Check } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { todayKey } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina Diária — Código Anti-Atraso" },
      { name: "description", content: "Manhã, dia e noite. Estrutura simples para sair do caos." },
    ],
  }),
  component: Rotina,
});

const blocks = [
  { key: "manha", label: "Manhã", icon: Sun, items: ["Acordar no horário", "Definir o foco do dia", "Não pegar o celular ao acordar"] },
  { key: "dia", label: "Dia", icon: Coffee, items: ["Bater as tarefas principais", "Cortar distração", "Manter o foco"] },
  { key: "noite", label: "Noite", icon: Moon, items: ["Revisar o dia", "Planejar o próximo", "Desligar o celular cedo"] },
] as const;

function Rotina() {
  const { user } = useAuth();
  const date = todayKey();
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    supabase
      .from("routine_checks")
      .select("item_key,done")
      .eq("date", date)
      .then(({ data }) => {
        const s: Record<string, boolean> = {};
        (data ?? []).forEach((r) => {
          s[r.item_key] = r.done;
        });
        setState(s);
      });
  }, [user, date]);

  const toggle = async (id: string) => {
    if (!user) return;
    const next = !state[id];
    setState((s) => ({ ...s, [id]: next }));
    if (next) {
      await supabase.from("routine_checks").upsert({ user_id: user.id, date, item_key: id, done: true });
    } else {
      await supabase.from("routine_checks").delete().eq("user_id", user.id).eq("date", date).eq("item_key", id);
    }
  };

  return (
    <div>
      <ScreenHeader eyebrow="Rotina" title="Estrutura do dia" subtitle="Sem rotina, sem disciplina." />

      <div className="space-y-5">
        {blocks.map((b) => {
          const Icon = b.icon;
          const doneCount = b.items.filter((it) => state[`${b.key}-${it}`]).length;
          return (
            <section key={b.key} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-display text-xl leading-none">{b.label}</h2>
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {doneCount}/{b.items.length}
                </div>
              </div>
              <ul>
                {b.items.map((it) => {
                  const id = `${b.key}-${it}`;
                  const done = !!state[id];
                  return (
                    <li key={id} className="flex items-center gap-3 border-b border-border/50 px-5 py-4 last:border-0">
                      <button
                        onClick={() => toggle(id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60"
                        }`}
                      >
                        {done && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{it}</span>
                    </li>
                  );
                })}
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
