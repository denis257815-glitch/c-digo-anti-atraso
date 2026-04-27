import { Lock, Zap, Check } from "lucide-react";
import { usePremium } from "@/lib/premium";
import { Button } from "@/components/ui/button";

export function Paywall() {
  const { showPaywall, closePaywall, setPremium } = usePremium();
  if (!showPaywall) return null;

  const benefits = [
    "Hábitos com sequência (streak)",
    "Controle financeiro completo",
    "Metas semanais ilimitadas",
    "Salvamento de todo o progresso",
    "Atualizações futuras incluídas",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl">
        <button
          onClick={closePaywall}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Modo Premium
          </span>
        </div>

        <h2 className="font-display text-3xl leading-none">
          Desbloqueia o <span className="text-gradient-red">modo anti-atraso</span> completo
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem desculpa. Sem enrolação. Disciplina todo dia.
        </p>

        <ul className="my-6 space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Check className="h-3 w-3 text-primary" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
          <div className="font-display text-4xl text-primary">R$29,90</div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">por mês</div>
        </div>

        <Button
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-red"
          onClick={() => {
            setPremium(true);
            closePaywall();
          }}
        >
          <Zap className="mr-2 h-4 w-4" />
          Desbloquear agora
        </Button>
        <button
          onClick={closePaywall}
          className="mt-3 w-full text-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
