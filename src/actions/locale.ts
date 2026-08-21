"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;

  (await cookies()).set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    httpOnly: true,
    maxAge: ONE_YEAR_IN_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
