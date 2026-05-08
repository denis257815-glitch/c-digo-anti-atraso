import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display text-3xl text-primary-foreground">
            A
          </div>
          <h1 className="font-display text-4xl leading-tight">
            Código
            <br />
            <span className="text-primary">Anti-Atraso</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Disciplina todo dia. Entra pra começar.
          </p>
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Entrar com Google
          </Button>
          <p className="mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">
            Sem conta? A gente cria automaticamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
