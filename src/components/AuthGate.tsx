import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-primary/30 blur-[120px]" />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary font-display text-2xl leading-none text-primary-foreground">
              A
            </div>
            <div className="font-display text-xs leading-tight tracking-[0.25em] text-muted-foreground">
              CÓDIGO
              <br />
              <span className="text-primary">ANTI-ATRASO</span>
            </div>
          </div>

          <div className="mb-2 inline-block border-l-4 border-primary pl-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Sem desculpa
          </div>
          <h1 className="font-display text-[3.5rem] leading-[0.9]">
            Pare de
            <br />
            viver no
            <br />
            <span className="text-primary">atraso.</span>
          </h1>
          <p className="mt-5 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
            Disciplina todo dia. Rotina, hábitos e foco num só lugar. Sua vida muda quando sua rotina muda.
          </p>

          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="mt-8 h-12 w-full bg-primary text-base font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            Entrar com Google
          </Button>
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Sem conta? A gente cria. Bora.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
