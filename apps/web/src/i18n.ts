import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import ru from "./locales/ru/common.json";
import ky from "./locales/ky/common.json";

void i18n
  .use(ICU)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { common: ru },
      ky: { common: ky },
    },
    lng: "ru",
    fallbackLng: ["ru", "ky"],
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

export default i18n;
