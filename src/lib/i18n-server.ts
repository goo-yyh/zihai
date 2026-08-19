import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import {
  createTranslator,
  isLocale,
  localeFromAcceptLanguage,
  LOCALE_COOKIE_NAME,
} from "@/lib/i18n";

export const getLocale = cache(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return localeFromAcceptLanguage((await headers()).get("accept-language"));
});

export const getTranslations = cache(async () => {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
});
