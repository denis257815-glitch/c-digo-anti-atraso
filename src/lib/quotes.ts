// Frases no estilo Linkon na Voz — direto, popular, sem coach corporativo.
export const DAILY_QUOTES = [
  "Pare de viver no atraso.",
  "Disciplina todo dia. Sem desculpa.",
  "Sua vida muda quando sua rotina muda.",
  "Quem quer mudança começa hoje, não segunda.",
  "Acordou? Levanta. Levantou? Faz.",
  "O conforto é o veneno mais doce.",
  "Não é motivação, é hábito.",
  "Enquanto você reclama, alguém tá fazendo.",
  "Você não tá cansado, tá desorganizado.",
  "Plano sem ação é só desejo.",
  "Pequeno todo dia vira grande no mês.",
  "O atraso de hoje é o arrependimento de amanhã.",
  "Foco. Faz. Fecha.",
  "Disciplina é liberdade no futuro.",
  "Se prometeu pra você, cumpre com você.",
  "Não tá fácil pra ninguém. Mas tem gente fazendo.",
  "A diferença tá em quem não desistiu.",
  "Tua única competição é quem você foi ontem.",
  "Faz feio, faz mal feito, mas faz.",
  "O atraso mora no celular. Sai dele.",
  "Se quer um futuro novo, larga o presente velho.",
  "Não dá pra mudar de vida com a mesma rotina.",
  "Dói agora ou dói pra sempre. Escolhe.",
  "Quem manda na sua semana é você.",
  "Sem disciplina, talento é só promessa.",
  "Levanta cedo. O dia rende dobrado.",
  "Cada 'amanhã eu faço' é um tijolo no muro do atraso.",
  "Se não dói, não tá mudando.",
  "Tua palavra vale ouro. Inclusive a que você dá pra você.",
  "Hoje é dia. Sempre é hoje.",
];

export function quoteOfDay(date = new Date()) {
  const day = Math.floor(date.getTime() / 86400000);
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}

export function randomQuote() {
  return DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
}
