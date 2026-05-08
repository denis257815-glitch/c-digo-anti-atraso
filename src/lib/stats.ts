import { supabase } from "@/integrations/supabase/client";

export type UserStats = {
  streak: number;
  bestStreak: number;
  activeDays: number;
  tasksDone: number;
  habitsCount: number;
  habitLogs: number;
  goalsDone: number;
  routineChecks: number;
  daysSinceStart: number;
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function loadUserStats(userId: string): Promise<UserStats> {
  const [tasks, hLogs, rChecks, goals, habits, profile] = await Promise.all([
    supabase.from("tasks").select("created_at,done").eq("user_id", userId),
    supabase.from("habit_logs").select("date").eq("user_id", userId),
    supabase.from("routine_checks").select("date,done").eq("user_id", userId),
    supabase.from("goals").select("done").eq("user_id", userId),
    supabase.from("habits").select("id").eq("user_id", userId),
    supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);

  const dayKeys = new Set<string>();
  for (const r of (tasks.data ?? []) as { created_at: string; done: boolean }[]) {
    if (r.done) dayKeys.add(r.created_at.slice(0, 10));
  }
  for (const r of (hLogs.data ?? []) as { date: string }[]) dayKeys.add(r.date);
  for (const r of (rChecks.data ?? []) as { date: string; done: boolean }[]) {
    if (r.done) dayKeys.add(r.date);
  }

  // Streak atual (a partir de hoje, contando pra trás)
  let streak = 0;
  const today = new Date();
  // se não tem hoje, conta a partir de ontem (não quebra o streak no meio do dia)
  if (!dayKeys.has(ymd(today))) today.setDate(today.getDate() - 1);
  while (dayKeys.has(ymd(today))) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  // Best streak (varredura simples)
  const sorted = [...dayKeys].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const k of sorted) {
    if (prev) {
      const p = new Date(prev);
      p.setDate(p.getDate() + 1);
      run = ymd(p) === k ? run + 1 : 1;
    } else run = 1;
    if (run > best) best = run;
    prev = k;
  }

  const tasksDone = ((tasks.data ?? []) as { done: boolean }[]).filter((t) => t.done).length;
  const goalsDone = ((goals.data ?? []) as { done: boolean }[]).filter((g) => g.done).length;
  const startedAt = profile.data?.created_at ? new Date(profile.data.created_at) : new Date();
  const daysSinceStart = Math.max(
    1,
    Math.floor((Date.now() - startedAt.getTime()) / 86400000) + 1,
  );

  return {
    streak,
    bestStreak: best,
    activeDays: dayKeys.size,
    tasksDone,
    habitsCount: (habits.data ?? []).length,
    habitLogs: (hLogs.data ?? []).length,
    goalsDone,
    routineChecks: ((rChecks.data ?? []) as { done: boolean }[]).filter((r) => r.done).length,
    daysSinceStart,
  };
}

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
  progress: number; // 0–1
  current: number;
  target: number;
};

export function buildAchievements(s: UserStats): Achievement[] {
  const mk = (id: string, title: string, desc: string, current: number, target: number): Achievement => ({
    id, title, desc,
    current, target,
    progress: Math.min(1, current / target),
    unlocked: current >= target,
  });
  return [
    mk("streak3", "Pegando o ritmo", "3 dias seguidos sem falhar", s.bestStreak, 3),
    mk("streak7", "Semana cheia", "7 dias seguidos no foco", s.bestStreak, 7),
    mk("streak21", "Hábito formado", "21 dias seguidos. Tá virando rotina", s.bestStreak, 21),
    mk("streak30", "Disciplina de aço", "30 dias direto. Mente forte", s.bestStreak, 30),
    mk("tasks10", "Mão na massa", "10 tarefas concluídas", s.tasksDone, 10),
    mk("tasks100", "Operário do progresso", "100 tarefas concluídas", s.tasksDone, 100),
    mk("habits1", "Primeiro hábito", "Criou seu primeiro hábito", s.habitsCount, 1),
    mk("habitLogs50", "Repetição é poder", "50 check-ins de hábito", s.habitLogs, 50),
    mk("goal1", "Primeira meta batida", "Concluiu sua 1ª meta da semana", s.goalsDone, 1),
    mk("goals10", "Atingidor de metas", "10 metas concluídas", s.goalsDone, 10),
    mk("routine30", "Rotina afiada", "30 itens de rotina cumpridos", s.routineChecks, 30),
    mk("active30", "Mês ativo", "Ativo em 30 dias diferentes", s.activeDays, 30),
  ];
}
