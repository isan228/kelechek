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
