/** Демо-данные инвестиционных объектов для UI портфеля. */
export type InvestAsset = {
  id: string;
  kind: "athlete" | "team" | "event";
  name: string;
  sport: string;
  tagline: string;
  price: number;
  changePct: number;
  yieldYtd: number;
  risk: "low" | "mid" | "high";
  raised: number;
  goal: number;
  chart: number[];
  stats: { label: string; value: string }[];
};

export const INVEST_ASSETS: InvestAsset[] = [
  {
    id: "a1",
    kind: "athlete",
    name: "Айгуль Нурланова",
    sport: "Лёгкая атлетика",
    tagline: "Спринт · путь к чемпионату Азии",
    price: 1240,
    changePct: 4.8,
    yieldYtd: 12.4,
    risk: "mid",
    raised: 840000,
    goal: 1200000,
    chart: [42, 48, 45, 52, 58, 55, 63, 70, 68, 74, 82, 88],
    stats: [
      { label: "Сезон", value: "2026" },
      { label: "Старт", value: "12" },
      { label: "PB 100м", value: "11.42" },
    ],
  },
  {
    id: "t1",
    kind: "team",
    name: "FC Ala-Too U21",
    sport: "Футбол",
    tagline: "Молодёжная лига · развитие академии",
    price: 980,
    changePct: -1.2,
    yieldYtd: 6.1,
    risk: "high",
    raised: 2100000,
    goal: 3500000,
    chart: [60, 58, 62, 55, 50, 54, 49, 52, 57, 53, 51, 48],
    stats: [
      { label: "Место", value: "4" },
      { label: "Игры", value: "18" },
      { label: "Голы", value: "27" },
    ],
  },
  {
    id: "e1",
    kind: "event",
    name: "Issyk-Kul Trail 2026",
    sport: "Трейл",
    tagline: "Массовый старт · экосистема региона",
    price: 640,
    changePct: 2.1,
    yieldYtd: 8.9,
    risk: "low",
    raised: 450000,
    goal: 800000,
    chart: [30, 32, 35, 38, 40, 44, 48, 52, 55, 58, 61, 65],
    stats: [
      { label: "Дистанции", value: "3" },
      { label: "Слоты", value: "2.4k" },
      { label: "До старта", value: "86д" },
    ],
  },
];

export function getInvestAsset(id: string) {
  return INVEST_ASSETS.find((a) => a.id === id) ?? null;
}

export type OnboardingGoal = "invest" | "activity" | "both";

export function getOnboardingGoal(): OnboardingGoal | null {
  const v = localStorage.getItem("kelechek_goal");
  if (v === "invest" || v === "activity" || v === "both") return v;
  return null;
}

export function setOnboardingGoal(goal: OnboardingGoal) {
  localStorage.setItem("kelechek_goal", goal);
}

export type CirclePerson = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  role: "you" | "coach" | "athlete" | "friend";
  pulse?: string;
  to?: string;
};

export const CIRCLE: CirclePerson[] = [
  { id: "you", name: "Вы", initials: "Я", subtitle: "в пути", role: "you", pulse: "сейчас" },
  {
    id: "coach",
    name: "Тренер",
    initials: "ТР",
    subtitle: "наставник",
    role: "coach",
    pulse: "онлайн",
    to: "/invites",
  },
  {
    id: "a1",
    name: "Айгуль",
    initials: "АН",
    subtitle: "атлет · вклад",
    role: "athlete",
    pulse: "+4.8%",
    to: "/app/invest/a1",
  },
  {
    id: "f1",
    name: "Тимур",
    initials: "ТБ",
    subtitle: "друг · серия",
    role: "friend",
    pulse: "7 дн.",
  },
];

export type PathNode = {
  id: string;
  title: string;
  hint: string;
  detail: string;
  status: "done" | "current" | "locked";
  cta: string;
  ctaTo: string;
};

export const PATH_NODES: PathNode[] = [
  {
    id: "start",
    title: "Старт в круге",
    hint: "профиль и цель",
    detail: "Вы уже внутри. Дальше — ритм и люди рядом.",
    status: "done",
    cta: "К профилю",
    ctaTo: "/app/portfolio",
  },
  {
    id: "train",
    title: "Первая тренировка",
    hint: "отметить движение",
    detail: "Любая сессия засчитывается в путь — даже короткая.",
    status: "done",
    cta: "Тренировки",
    ctaTo: "/app/activity",
  },
  {
    id: "streak",
    title: "Серия 7 дней",
    hint: "сейчас здесь",
    detail: "Держите контакт с кругом: отметьте день или бросьте вызов другу.",
    status: "current",
    cta: "Продолжить серию",
    ctaTo: "/app/activity",
  },
  {
    id: "invest",
    title: "Первый вклад",
    hint: "в человека из круга",
    detail: "Инвестиция в атлета или событие связывает капитал с вашим путём.",
    status: "locked",
    cta: "Смотреть рынок",
    ctaTo: "/app/invest",
  },
  {
    id: "circle3",
    title: "Круг из троих",
    hint: "пригласить ещё одного",
    detail: "Когда в круге ≥3 людей, путь ускоряется — видны чужие узлы.",
    status: "locked",
    cta: "Приглашения",
    ctaTo: "/invites",
  },
  {
    id: "quarter",
    title: "Цель квартала",
    hint: "капитал + тело",
    detail: "Свести накопление и активность к одной измеримой цели на 90 дней.",
    status: "locked",
    cta: "Открыть портфель",
    ctaTo: "/app/portfolio",
  },
];

