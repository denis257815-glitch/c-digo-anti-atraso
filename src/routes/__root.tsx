import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { PremiumProvider, usePremium } from "@/lib/premium";
import { BottomNav } from "@/components/BottomNav";
import { Paywall } from "@/components/Paywall";
import { Crown } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl">Tá perdido?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa tela não existe. Volta pro foco.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            Voltar pro hoje
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
      },
      { name: "theme-color", content: "#1f1f23" },
      { title: "Código Anti-Atraso — Disciplina todo dia" },
      {
        name: "description",
        content:
          "Pare de viver no atraso. Organize sua rotina, crie disciplina e controle seus dias.",
      },
      { name: "author", content: "Código Anti-Atraso" },
      { property: "og:title", content: "Código Anti-Atraso" },
      { property: "og:description", content: "Disciplina todo dia. Sem desculpa." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PremiumBadge() {
  const { isPremium, openPaywall } = usePremium();
  if (isPremium) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        <Crown className="h-3 w-3" /> Premium
      </div>
    );
  }
  return (
    <button
      onClick={openPaywall}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary"
    >
      Free
    </button>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <div className="flex items-center justify-between px-5 pt-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-lg leading-none text-primary-foreground">
              A
            </div>
            <div className="font-display text-sm leading-none">
              Código
              <br />
              <span className="text-primary">Anti-Atraso</span>
            </div>
          </div>
          <PremiumBadge />
        </div>

        <main className="flex-1 px-5 pb-28 pt-6">
          <Outlet />
        </main>

        <BottomNav />
      </div>
      <Paywall />
    </div>
  );
}

function RootComponent() {
  return (
    <PremiumProvider>
      <AppShell />
    </PremiumProvider>
  );
}
