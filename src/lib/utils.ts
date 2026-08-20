import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Locale } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  value: Date | string | null | undefined,
  locale: Locale = "en",
) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}
