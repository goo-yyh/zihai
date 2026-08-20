"use client";

import { createContext, useContext } from "react";

import { createTranslator, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale | null>(null);

export function I18nProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("useI18n must be used inside I18nProvider.");
  return { locale, t: createTranslator(locale) };
}
