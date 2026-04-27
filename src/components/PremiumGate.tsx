import { Lock } from "lucide-react";
import { usePremium } from "@/lib/premium";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function PremiumGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { isPremium, openPaywall } = usePremium();
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6 text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-display text-2xl">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <Button
            onClick={openPaywall}
            className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Desbloquear modo anti-atraso
          </Button>
        </div>
      </div>
    </div>
  );
}
