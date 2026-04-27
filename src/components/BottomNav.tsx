import { Link, useLocation } from "@tanstack/react-router";
import { Home, Sun, Flame, Wallet, Target } from "lucide-react";

const items = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/rotina", label: "Rotina", icon: Sun },
  { to: "/habitos", label: "Hábitos", icon: Flame },
  { to: "/financeiro", label: "Grana", icon: Wallet },
  { to: "/metas", label: "Metas", icon: Target },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="group flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
