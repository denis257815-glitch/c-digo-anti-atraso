import { useEffect, useState } from "react";

export type BgSettings = {
  heightPct: number; // 100-250
  posX: number; // 0-100
  posY: number; // 0-100
};

const DEFAULTS: Record<"mobile" | "desktop", BgSettings> = {
  mobile: { heightPct: 100, posX: 50, posY: 0 },
  desktop: { heightPct: 100, posX: 50, posY: 88 },
};

const STORAGE_KEY = "bg-adjust-v2";

type Stored = { mobile: BgSettings; desktop: BgSettings };

function load(): Stored {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useBgSettings() {
  const [settings, setSettings] = useState<Stored>(() => load());
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : true,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const active = isMobile ? settings.mobile : settings.desktop;
  const key: "mobile" | "desktop" = isMobile ? "mobile" : "desktop";

  const update = (patch: Partial<BgSettings>) =>
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const reset = () => setSettings((s) => ({ ...s, [key]: DEFAULTS[key] }));

  return { settings: active, update, reset, isMobile };
}

export function BgAdjustPanel({
  settings,
  update,
  reset,
  isMobile,
}: {
  settings: BgSettings;
  update: (p: Partial<BgSettings>) => void;
  reset: () => void;
  isMobile: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Ajustar fundo"
        type="button"
      >
        ⚙
      </button>
      {open && (
        <div className="fixed bottom-16 right-4 z-50 w-72 rounded-lg border border-white/20 bg-black/90 p-4 text-white shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              Fundo · {isMobile ? "Mobile" : "Desktop"}
            </div>
            <button
              onClick={reset}
              className="text-[10px] uppercase tracking-wider text-white/60 hover:text-primary"
              type="button"
            >
              Reset
            </button>
          </div>

          <Slider
            label="Altura (zoom)"
            value={settings.heightPct}
            min={100}
            max={250}
            step={1}
            unit="%"
            onChange={(v) => update({ heightPct: v })}
          />
          <Slider
            label="Posição X"
            value={settings.posX}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => update({ posX: v })}
          />
          <Slider
            label="Posição Y"
            value={settings.posY}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => update({ posY: v })}
          />

          <div className="mt-2 text-[10px] text-white/40">
            Salvo automaticamente no navegador.
          </div>
        </div>
      )}
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 flex justify-between text-[11px] uppercase tracking-wider text-white/70">
        <span>{label}</span>
        <span className="text-primary">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}
