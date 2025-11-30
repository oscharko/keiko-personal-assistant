import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

import enTranslation from "../locales/en/translation.json";
import deTranslation from "../locales/de/translation.json";

export const supportedLngs: { [key: string]: { name: string; locale: string } } = {
    en: {
        name: "English",
        locale: "en-US"
    },
    de: {
        name: "Deutsch",
        locale: "de-DE"
    },
};

i18next
    .use(HttpApi)
    .use(LanguageDetector)
    .use(initReactI18next)

    .init({
        resources: {
            en: { translation: enTranslation },
            de: { translation: deTranslation },
        },
        fallbackLng: "en",
        supportedLngs: Object.keys(supportedLngs),
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"]
        }
    });

export default i18next;
