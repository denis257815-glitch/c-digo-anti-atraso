import { useEffect, useState } from "react";
import { Flame, Trophy, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { loadUserStats, buildAchievements, type UserStats, type Achievement } from "@/lib/stats";

export function StreakCard() {
  const { user } = useAuth();
  const [s, setS] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUserStats(user.id).then(setS);
  }, [user]);

  if (!s) return null;

  const fire = s.streak >= 7 ? "text-primary" : s.streak >= 3 ? "text-orange-400" : "text-muted-foreground";
  const msg = s.streak === 0
    ? "Bora começar hoje. 1 dia já é virada."
    : s.streak < 3 ? "Tá começando. Não para agora."
    : s.streak < 7 ? "Pegando ritmo. Mantém."
    : s.streak < 21 ? "Disciplinado. Continua."
    : "Mente forte. Lendário.";

  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background ${fire}`}>
        <Flame className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none">{s.streak}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {s.streak === 1 ? "dia" : "dias"} de sequência
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{msg}</p>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Recorde</div>
        <div className="font-display text-xl text-primary">{s.bestStreak}</div>
      </div>
    </div>
  );
}

export function AchievementsPanel() {
  const { user } = useAuth();
  const [list, setList] = useState<Achievement[] | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUserStats(user.id).then((s) => setList(buildAchievements(s)));
  }, [user]);

  if (!list) return null;
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-display text-2xl leading-none">Conquistas</h2>
        </div>
        <span className="font-display text-xs tracking-[0.2em] text-muted-foreground">
          {unlocked}/{list.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((a) => (
          <div
            key={a.id}
            className={`relative overflow-hidden rounded-xl border p-3 transition ${
              a.unlocked
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-surface"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              {a.unlocked ? (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {a.current}/{a.target}
              </span>
            </div>
            <h3 className={`font-display text-sm leading-tight ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
              {a.title}
            </h3>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{a.desc}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
              <div
                className={`h-full transition-all ${a.unlocked ? "bg-primary" : "bg-muted-foreground/40"}`}
                style={{ width: `${a.progress * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
