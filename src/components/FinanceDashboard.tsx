import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

type Entry = {
  id: string;
  type: "in" | "out";
  description: string;
  value: number;
  entry_date: string;
};

type Props = {
  entries: Entry[]; // já filtrado pelo mês
  month: Date;
  categoryBreakdown: { label: string; total: number; color: string }[];
};

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const HEX_BY_TONE: Record<string, string> = {
  "text-orange-400": "#fb923c",
  "text-blue-400": "#60a5fa",
  "text-emerald-400": "#34d399",
  "text-pink-400": "#f472b6",
  "text-purple-400": "#c084fc",
  "text-red-400": "#f87171",
  "text-indigo-400": "#818cf8",
  "text-yellow-400": "#facc15",
  "text-cyan-400": "#22d3ee",
  "text-success": "#22c55e",
  "text-muted-foreground": "#71717a",
  "text-primary": "#ef4444",
};

export function FinanceDashboard({ entries, month, categoryBreakdown }: Props) {
  // Série diária: saldo acumulado + entradas/saídas por dia
  const daily = useMemo(() => {
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const map = new Map<number, { in: number; out: number }>();
    for (let i = 1; i <= days; i++) map.set(i, { in: 0, out: 0 });
    for (const e of entries) {
      const day = new Date(e.entry_date).getDate();
      const slot = map.get(day);
      if (!slot) continue;
      if (e.type === "in") slot.in += e.value;
      else slot.out += e.value;
    }
    let acc = 0;
    return Array.from(map.entries()).map(([d, v]) => {
      acc += v.in - v.out;
      return {
        day: String(d).padStart(2, "0"),
        Entradas: v.in,
        Saidas: v.out,
        Saldo: acc,
      };
    });
  }, [entries, month]);

  const catData = useMemo(
    () =>
      categoryBreakdown.slice(0, 6).map((c) => ({
        name: c.label,
        valor: c.total,
        fill: HEX_BY_TONE[c.color] ?? "#ef4444",
      })),
    [categoryBreakdown],
  );

  const totalOut = catData.reduce((s, c) => s + c.valor, 0);
  const hasData = entries.length > 0;

  if (!hasData) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Saldo acumulado */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-widest">Saldo acumulado</h3>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-saldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(daily.length / 7) - 1)}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#1f1f23",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#fafafa" }}
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Dia ${l}`}
              />
              <Area
                type="monotone"
                dataKey="Saldo"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#grad-saldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entradas x Saídas por dia */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-widest">Fluxo diário</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(daily.length / 7) - 1)}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#1f1f23",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => fmt(v)}
                labelFormatter={(l) => `Dia ${l}`}
              />
              <Bar dataKey="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Saidas" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-success" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary" /> Saídas
          </span>
        </div>
      </div>

      {/* Gastos por categoria */}
      {catData.length > 0 && totalOut > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm uppercase tracking-widest">Gastos por categoria</h3>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={catData}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1f1f23",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {catData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
