import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, Plus, Download, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-prompt-snooze-v2";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

// ---------------------------------------------------------------------------
// Captura GLOBAL do beforeinstallprompt — registrada no import do módulo,
// ANTES do React montar. Sem isso, o evento dispara cedo, ninguém escuta,
// e o botão "Instalar" nunca aparece.
// ---------------------------------------------------------------------------
let deferredEvent: BIPEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvent = e as BIPEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredEvent = null;
    installed = true;
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
    emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function isSnoozed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): "ios" | "android" | "desktop" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|mac|linux/.test(ua)) return "desktop";
  return "other";
}

/** Hook: retorna se o app pode ser instalado agora (Android/desktop com prompt nativo, ou iOS com instruções). */
export function useInstallState() {
  const deferred = useSyncExternalStore(
    subscribe,
    () => deferredEvent,
    () => null,
  );
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
  }, []);

  return {
    platform,
    standalone: standalone || installed,
    canPromptNative: !!deferred,
    deferred,
  };
}

async function triggerNativeInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredEvent) return "unavailable";
  await deferredEvent.prompt();
  const { outcome } = await deferredEvent.userChoice;
  if (outcome === "accepted") {
    deferredEvent = null;
    emit();
  }
  return outcome;
}

/** Botão manual reutilizável: aparece sempre que o app NÃO está instalado. */
export function InstallAppButton({ className }: { className?: string }) {
  const { platform, standalone, canPromptNative } = useInstallState();
  const [showHelp, setShowHelp] = useState(false);

  if (standalone) return null;

  const handleClick = async () => {
    if (canPromptNative) {
      const result = await triggerNativeInstall();
      if (result === "unavailable") setShowHelp(true);
      return;
    }
    // iOS / desktop sem prompt nativo: mostra instruções
    setShowHelp(true);
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className={
          className ??
          "h-11 w-full gap-2 bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
        }
      >
        <Download className="h-4 w-4" /> Instalar app
        {platform !== "other" && (
          <span className="ml-1 text-[10px] opacity-70">
            ({platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Desktop"})
          </span>
        )}
      </Button>
      {showHelp && <InstallModal forceOpen onClose={() => setShowHelp(false)} />}
    </>
  );
}

export function InstallPrompt() {
  return <InstallModal />;
}

function InstallModal({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const { platform, standalone, canPromptNative, deferred } = useInstallState();
  const [open, setOpen] = useState(!!forceOpen);

  useEffect(() => {
    if (forceOpen) return;
    if (standalone) return;
    if (isSnoozed()) return;

    // Auto-abre quando: Android/desktop com prompt nativo disponível,
    // ou iOS após 1.2s.
    if (canPromptNative) {
      setOpen(true);
      return;
    }
    if (platform === "ios") {
      const t = window.setTimeout(() => setOpen(true), 1200);
      return () => window.clearTimeout(t);
    }
  }, [forceOpen, standalone, canPromptNative, platform]);

  const close = (remember = true) => {
    setOpen(false);
    onClose?.();
    if (remember && !forceOpen) {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
      } catch {
        /* ignore */
      }
    }
  };

  const installAndroid = async () => {
    const result = await triggerNativeInstall();
    if (result === "accepted") close(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <button
          onClick={() => close(true)}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/20 via-transparent to-transparent px-5 pb-3 pt-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            <Smartphone className="h-3 w-3" /> Instala o app
          </div>
          <h2 className="mt-2 font-display text-2xl leading-tight">
            Bota na tela <span className="text-primary">inicial.</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Abre rápido, parece app nativo. Sem desculpa pra atrasar.
          </p>
        </div>

        {platform === "ios" ? (
          <IOSInstructions />
        ) : platform === "android" ? (
          <AndroidInstructions onInstall={deferred ? installAndroid : undefined} />
        ) : (
          <DesktopInstructions onInstall={deferred ? installAndroid : undefined} />
        )}

        <div className="flex gap-2 border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => close(true)}
          >
            Não mostrar mais
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={() => close(false)}>
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}

function IOSInstructions() {
  return (
    <div className="px-5 pb-4">
      <div className="relative mx-auto mb-4 h-56 w-full max-w-[240px] overflow-hidden rounded-2xl border-4 border-zinc-800 bg-zinc-900 shadow-inner">
        <div className="flex items-center justify-between bg-zinc-800 px-3 py-2 text-[10px] text-white/70">
          <span className="truncate">antiatraso.app</span>
          <Share className="h-3.5 w-3.5 animate-ios-share text-primary" />
        </div>
        <div className="space-y-2 p-3">
          <div className="h-2 w-3/4 rounded bg-white/10" />
          <div className="h-2 w-1/2 rounded bg-white/10" />
          <div className="h-12 rounded bg-primary/20" />
          <div className="h-2 w-2/3 rounded bg-white/10" />
        </div>

        <div className="ios-sheet absolute inset-x-2 bottom-2 rounded-xl border border-white/10 bg-zinc-800/95 p-2 backdrop-blur">
          <div className="mb-2 h-1 w-8 rounded-full bg-white/30 mx-auto" />
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5 text-[10px] text-white">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3 w-3 text-primary" /> Adicionar à Tela de Início
            </span>
            <span className="text-primary">→</span>
          </div>
        </div>
      </div>

      <ol className="space-y-2 text-xs text-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            1
          </span>
          <span>
            Toca em <Share className="inline h-3 w-3 text-primary" />{" "}
            <strong>Compartilhar</strong> na barra do Safari.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            2
          </span>
          <span>
            Escolhe <Plus className="inline h-3 w-3 text-primary" />{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
          <span>Confirma em <strong>Adicionar</strong>. Pronto.</span>
        </li>
      </ol>
    </div>
  );
}

function AndroidInstructions({ onInstall }: { onInstall?: () => void }) {
  return (
    <div className="px-5 pb-4">
      <ol className="mb-3 space-y-2 text-xs text-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            1
          </span>
          <span>
            {onInstall
              ? "Toca em Instalar abaixo."
              : "Abre o menu (⋮) do Chrome no canto superior."}
          </span>
        </li>
        {!onInstall && (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              2
            </span>
            <span>
              Toca em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
            </span>
          </li>
        )}
      </ol>
      {onInstall && (
        <Button onClick={onInstall} className="w-full gap-2">
          <Download className="h-4 w-4" /> Instalar agora
        </Button>
      )}
    </div>
  );
}

function DesktopInstructions({ onInstall }: { onInstall?: () => void }) {
  if (onInstall) {
    return (
      <div className="px-5 pb-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Clica abaixo pra instalar como app no seu computador.
        </p>
        <Button onClick={onInstall} className="w-full gap-2">
          <Download className="h-4 w-4" /> Instalar agora
        </Button>
      </div>
    );
  }
  return (
    <div className="px-5 pb-4 text-xs text-muted-foreground">
      No seu navegador, procura o ícone de <Download className="inline h-3 w-3 text-primary" />{" "}
      instalar na barra de endereço, ou abre no celular pra instalar como app.
    </div>
  );
}
