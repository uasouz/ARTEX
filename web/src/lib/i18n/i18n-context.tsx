"use client";

import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getClientCookie, setClientCookie } from "../cookie.client";
import { DEFAULT_LOCALE, getDictionary, LOCALES } from "./index";
import type { Locale, TranslationDictionary } from "./types";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  d: TranslationDictionary;
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "cirdan_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Check cookie or localStorage on initial mount
    const savedCookie = getClientCookie(STORAGE_KEY) as Locale | undefined;
    const savedLocal = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    const initial = savedCookie ?? savedLocal;

    if (initial && (initial === "en" || initial === "pt" || initial === "zh")) {
      setLocaleState(initial);
    } else {
      // Browser language detection
      if (typeof navigator !== "undefined" && navigator.language) {
        const lang = navigator.language.toLowerCase();
        if (lang.startsWith("pt")) {
          setLocaleState("pt");
        } else if (lang.startsWith("zh")) {
          setLocaleState("zh");
        } else {
          setLocaleState("en");
        }
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setClientCookie(STORAGE_KEY, newLocale, 365);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        d: dictionary,
        locales: LOCALES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    const fallbackDict = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {
        /* noop fallback when outside provider */
      },
      d: fallbackDict,
      locales: LOCALES,
    };
  }
  return context;
}
