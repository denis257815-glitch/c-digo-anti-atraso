import { forwardRef, useState, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveButtonProps = Omit<ButtonProps, "onClick"> & {
  onClick: () => void | Promise<void>;
  /** Conteúdo no estado idle (ex: <><Plus/> Salvar</> ou só <Plus/>) */
  children: ReactNode;
  /** Texto opcional ao salvar (omita para mostrar só o spinner) */
  savingLabel?: string;
  /** Texto opcional após salvar (omita para mostrar só o check) */
  savedLabel?: string;
  /** Duração do feedback "salvo" em ms */
  savedDurationMs?: number;
};

/**
 * Botão de salvar padrão do app.
 * Estados: idle → saving (spinner) → saved (check verde) → idle.
 * Bloqueia cliques duplicados e dá feedback visual claro.
 */
export const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
  (
    {
      onClick,
      children,
      savingLabel,
      savedLabel,
      savedDurationMs = 1100,
      className,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

    const handle = async () => {
      if (state !== "idle" || disabled) return;
      setState("saving");
      try {
        await onClick();
        setState("saved");
        setTimeout(() => setState("idle"), savedDurationMs);
      } catch {
        setState("idle");
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handle}
        disabled={disabled || state !== "idle"}
        aria-busy={state === "saving"}
        className={cn(
          "transition-all duration-200",
          state === "saved" &&
            "!bg-emerald-600 hover:!bg-emerald-600 !text-white",
          className,
        )}
        {...rest}
      >
        {state === "saving" && (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {savingLabel}
          </span>
        )}
        {state === "saved" && (
          <span className="inline-flex items-center gap-2 animate-in fade-in zoom-in-95">
            <Check className="h-4 w-4" />
            {savedLabel}
          </span>
        )}
        {state === "idle" && children}
      </Button>
    );
  },
);

SaveButton.displayName = "SaveButton";
