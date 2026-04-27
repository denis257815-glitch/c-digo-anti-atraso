import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Coffee, Moon, Check } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { loadState, saveState, todayKey } from "@/lib/storage";

export const Route = createFileRoute("/rotina")({
  head: () => ({
    meta: [
      { title: "Rotina Diária — Código Anti-Atraso" },
      {
        name: "description",
        content: "Manhã, dia e noite. Estrutura simples para sair do caos.",
      },
    ],
  }),
  component: Rotina,
});

const blocks = [
  {
    key: "manha",
    label: "Manhã",
    icon: Sun,
    items: ["Acordar no horário", "Definir foco do dia", "Evitar celular ao acordar"],
  },
  {
    key: "dia",
    label: "Dia",
    icon: Coffee,
    items: ["Executar tarefas principais", "Evitar distrações", "Manter o foco"],
  },
  {
    key: "noite",
    label: "Noite",
    icon: Moon,
    items: ["Revisar o dia", "Planejar o próximo dia", "Desligar o celular cedo"],
  },
] as const;

type State = Record<string, boolean>;

function Rotina() {
  const storageKey = `aa.rotina.${todayKey()}`;
  const [state, setState] = useState<State>({});

  useEffect(() => {
    setState(loadState<State>(storageKey, {}));
  }, [storageKey]);

  useEffect(() => {
    saveState(storageKey, state);
  }, [state, storageKey]);

  const toggle = (id: string) => setState((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div>
      <ScreenHeader
        eyebrow="Rotina diária"
        title="Estrutura do dia"
        subtitle="Sem rotina, sem disciplina."
      />

      <div className="space-y-5">
        {blocks.map((b) => {
          const Icon = b.icon;
          const doneCount = b.items.filter((it) => state[`${b.key}-${it}`]).length;
          return (
            <section
              key={b.key}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
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
                    <li
                      key={id}
                      className="flex items-center gap-3 border-b border-border/50 px-5 py-4 last:border-0"
                    >
                      <button
                        onClick={() => toggle(id)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/60"
                        }`}
                      >
                        {done && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}
                      >
                        {it}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-center font-display text-sm tracking-widest text-muted-foreground">
        "Disciplina todo dia."
      </p>
    </div>
  );
}
