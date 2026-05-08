import type { ReactNode } from "react";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-7 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-block border-l-4 border-primary pl-2 text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[2.6rem] leading-[0.95]">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-snug text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
