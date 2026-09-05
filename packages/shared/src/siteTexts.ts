/** Ключи текстов сайта, которые правит админ. UI-строки (nav/auth/admin) остаются в i18n. */
export type SiteTextField = {
  key: string;
  labelRu: string;
  multiline?: boolean;
};

export type SiteTextGroup = {
  id: string;
  titleRu: string;
  fields: SiteTextField[];
};

export const SITE_TEXT_GROUPS: SiteTextGroup[] = [
  {
    id: "brand",
    titleRu: "Бренд и футер",
    fields: [
      { key: "appName", labelRu: "Название" },
      { key: "footer.tag", labelRu: "Подпись в футере", multiline: true },
      { key: "disclaimer", labelRu: "Дисклеймер", multiline: true },
    ],
  },
  {
    id: "landing",
    titleRu: "Главная",
    fields: [
      { key: "landing.kicker", labelRu: "Надзаголовок" },
      { key: "landing.title", labelRu: "Заголовок" },
      { key: "landing.lead", labelRu: "Лид", multiline: true },
      { key: "landing.ctaStart", labelRu: "Кнопка «начать»" },
      { key: "landing.ctaAbout", labelRu: "Кнопка «о проекте»" },
      { key: "landing.statValue1", labelRu: "Стат 1 — значение (напр. 82%)" },
      { key: "landing.stat1", labelRu: "Стат 1 — подпись", multiline: true },
      { key: "landing.statValue2", labelRu: "Стат 2 — значение (напр. 30)" },
      { key: "landing.days", labelRu: "Стат 2 — единица (дней)" },
      { key: "landing.stat2", labelRu: "Стат 2 — подпись", multiline: true },
      { key: "landing.statValue3", labelRu: "Стат 3 — значение (напр. 12)" },
      { key: "landing.months", labelRu: "Стат 3 — единица (мес.)" },
      { key: "landing.stat3", labelRu: "Стат 3 — подпись", multiline: true },
      { key: "landing.pathKicker", labelRu: "Путь — надзаголовок" },
      { key: "landing.pathTitle", labelRu: "Путь — заголовок" },
      { key: "landing.step1t", labelRu: "Шаг 1 — заголовок" },
      { key: "landing.step1", labelRu: "Шаг 1 — текст", multiline: true },
      { key: "landing.step2t", labelRu: "Шаг 2 — заголовок" },
      { key: "landing.step2", labelRu: "Шаг 2 — текст", multiline: true },
      { key: "landing.step3t", labelRu: "Шаг 3 — заголовок" },
      { key: "landing.step3", labelRu: "Шаг 3 — текст", multiline: true },
      { key: "landing.step4t", labelRu: "Шаг 4 — заголовок" },
      { key: "landing.step4", labelRu: "Шаг 4 — текст", multiline: true },
      { key: "landing.whyKicker", labelRu: "Зачем — надзаголовок" },
      { key: "landing.whyTitle", labelRu: "Зачем — заголовок" },
      { key: "landing.whyLead", labelRu: "Зачем — лид", multiline: true },
      { key: "landing.card1b", labelRu: "Карточка 1 — бейдж" },
      { key: "landing.card1t", labelRu: "Карточка 1 — заголовок" },
      { key: "landing.card1", labelRu: "Карточка 1 — текст", multiline: true },
      { key: "landing.card2b", labelRu: "Карточка 2 — бейдж" },
      { key: "landing.card2t", labelRu: "Карточка 2 — заголовок" },
      { key: "landing.card2", labelRu: "Карточка 2 — текст", multiline: true },
    ],
  },
  {
    id: "about",
    titleRu: "О проекте",
    fields: [
      { key: "about.title", labelRu: "Заголовок" },
      { key: "about.lead", labelRu: "Лид", multiline: true },
      { key: "about.ideaTitle", labelRu: "Идея — заголовок" },
      { key: "about.idea", labelRu: "Идея — текст", multiline: true },
      { key: "about.notCashback", labelRu: "Про начисление", multiline: true },
    ],
  },
  {
    id: "pay",
    titleRu: "Инвестиции (страница)",
    fields: [
      { key: "pay.title", labelRu: "Заголовок" },
      { key: "pay.pageLead", labelRu: "Лид", multiline: true },
    ],
  },
  {
    id: "content",
    titleRu: "Тренировки (страница)",
    fields: [
      { key: "content.title", labelRu: "Заголовок" },
      { key: "content.openLead", labelRu: "Лид (открыто)", multiline: true },
      { key: "content.locked", labelRu: "Лид (без абонемента)", multiline: true },
      { key: "content.open", labelRu: "Кнопка «смотреть»" },
      { key: "content.payToRead", labelRu: "Подсказка оплатить", multiline: true },
      { key: "content.exerciseWarning", labelRu: "Предупреждение к упражнению", multiline: true },
      { key: "content.contraindications", labelRu: "Метка противопоказаний" },
    ],
  },
  {
    id: "coaches",
    titleRu: "Тренеры (страница)",
    fields: [
      { key: "coaches.title", labelRu: "Заголовок" },
      { key: "coaches.lead", labelRu: "Лид", multiline: true },
      { key: "coaches.cta", labelRu: "Кнопка CTA" },
      { key: "coaches.cardLead", labelRu: "Текст карточки по умолчанию", multiline: true },
      { key: "coaches.unnamed", labelRu: "Имя, если пусто" },
      { key: "coaches.empty", labelRu: "Если тренеров нет", multiline: true },
    ],
  },
  {
    id: "goal",
    titleRu: "Цель",
    fields: [
      { key: "goal.title", labelRu: "Заголовок" },
      { key: "goal.lead", labelRu: "Лид", multiline: true },
      { key: "goal.bar", labelRu: "Подпись прогресса" },
      { key: "goal.r1", labelRu: "Правило 1", multiline: true },
      { key: "goal.r2", labelRu: "Правило 2", multiline: true },
      { key: "goal.r3", labelRu: "Правило 3", multiline: true },
    ],
  },
  {
    id: "cabinet",
    titleRu: "Кабинет",
    fields: [
      { key: "cabinet.title", labelRu: "Заголовок" },
      { key: "cabinet.next", labelRu: "Блок «дальше» — заголовок" },
      { key: "cabinet.nextLead", labelRu: "Блок «дальше» — текст", multiline: true },
    ],
  },
];

export const SITE_TEXT_KEYS = SITE_TEXT_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
