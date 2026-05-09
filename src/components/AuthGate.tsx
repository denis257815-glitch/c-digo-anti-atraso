import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent, type ReactNode } from "react";
import loginBg from "@/assets/login-bg.png";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (user) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Preenche email e senha.");
      return;
    }
    if (password.length < 6) {
      setError("Senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("As senhas não batem.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar.";
      setError(
        msg.includes("Invalid login")
          ? "Email ou senha errados."
          : msg.includes("already registered")
            ? "Esse email já tem conta. Faz login."
            : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-end justify-center overflow-hidden bg-black px-5 pb-8 pt-10">
      <img
        src={loginBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[68%_50%] grayscale contrast-110 md:object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.75)_55%,rgba(0,0,0,0.98)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />

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
        <h1 className="font-display text-[3rem] leading-[0.9]">
          {mode === "signin" ? (
            <>
              Bora <span className="text-primary">entrar.</span>
            </>
          ) : (
            <>
              Cria sua <span className="text-primary">conta.</span>
            </>
          )}
        </h1>
        <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
          Disciplina todo dia. Rotina, hábitos e foco num só lugar.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3 [&_input]:font-medium [&_input]:tracking-wide">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-none border-0 border-b-2 border-white/40 bg-transparent px-1 py-3 text-base text-white outline-none placeholder:text-white/70 focus:border-primary transition-colors [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]"
          />
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-none border-0 border-b-2 border-white/40 bg-transparent px-1 py-3 text-base text-white outline-none placeholder:text-white/70 focus:border-primary transition-colors [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]"
          />
          {mode === "signup" && (
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirma a senha"
              className="w-full rounded-none border-0 border-b-2 border-white/40 bg-transparent px-1 py-3 text-base text-white outline-none placeholder:text-white/70 focus:border-primary transition-colors [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]"
            />
          )}

          {error && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            size="lg"
            className="h-12 w-full bg-primary text-base font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-5 w-full text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground transition hover:text-primary"
        >
          {mode === "signin" ? (
            <>
              Sem conta? <span className="text-primary">Cria agora.</span>
            </>
          ) : (
            <>
              Já tem conta? <span className="text-primary">Entrar.</span>
            </>
          )}
        </button>
      </div>
      
    </div>
  );
}
