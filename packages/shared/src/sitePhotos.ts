export type SitePhotoSlot = {
  key: string;
  labelRu: string;
  defaultUrl: string;
};

/** Слоты фото на публичном сайте — админ может заменить файл. */
export const SITE_PHOTO_SLOTS: SitePhotoSlot[] = [
  {
    key: "hero",
    labelRu: "Главная — большой фон (hero)",
    defaultUrl: "/photos/kyrgyzstan_sport_future_10.png",
  },
  {
    key: "movement",
    labelRu: "Главная — блок «зачем»",
    defaultUrl: "/photos/kyrgyzstan_sport_future_05.png",
  },
  {
    key: "goals",
    labelRu: "Главная — карточка 1",
    defaultUrl: "/photos/kyrgyzstan_sport_future_01.png",
  },
  {
    key: "discipline",
    labelRu: "Главная — карточка 2",
    defaultUrl: "/photos/kyrgyzstan_sport_future_06.png",
  },
  {
    key: "traditions",
    labelRu: "О проекте",
    defaultUrl: "/photos/kyrgyzstan_sport_future_03.png",
  },
  {
    key: "future",
    labelRu: "Абонементы — баннер",
    defaultUrl: "/photos/kyrgyzstan_sport_future_04.png",
  },
  {
    key: "city",
    labelRu: "Тренировки (статьи) / вход",
    defaultUrl: "/photos/kyrgyzstan_sport_future_09.png",
  },
  {
    key: "medal",
    labelRu: "Тренировки (программы) / цель",
    defaultUrl: "/photos/kyrgyzstan_sport_future_07.png",
  },
  {
    key: "honor",
    labelRu: "Тренеры — запасное фото 1",
    defaultUrl: "/photos/kyrgyzstan_sport_future_02.png",
  },
  {
    key: "youth",
    labelRu: "Тренеры — запасное фото 2",
    defaultUrl: "/photos/kyrgyzstan_sport_future_08.png",
  },
];

export const SITE_PHOTO_KEYS = SITE_PHOTO_SLOTS.map((s) => s.key);

export const DEFAULT_PHOTOS: Record<string, string> = Object.fromEntries(
  SITE_PHOTO_SLOTS.map((s) => [s.key, s.defaultUrl]),
);
