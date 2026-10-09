import { en } from "./locales/en";
import { pt } from "./locales/pt";
import { zh } from "./locales/zh";
import type { Locale, TranslationDictionary } from "./types";

export * from "./types";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  pt,
  zh,
};

export const DEFAULT_LOCALE: Locale = "en";

export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}
