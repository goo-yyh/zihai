"use client";

import { Languages, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleAction } from "@/actions/locale";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { locale, t } = useI18n();
  const nextLocale = locale === "en" ? "zh-CN" : "en";
  const nextLabel = nextLocale === "en" ? t("English") : t("Chinese");

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1.5 px-2"
      disabled={pending}
      title={`${t("Switch language")}: ${nextLabel}`}
      aria-label={`${t("Switch language")}: ${nextLabel}`}
      onClick={() => {
        startTransition(async () => {
          await setLocaleAction(nextLocale);
          router.refresh();
        });
      }}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Languages className="size-4" />
      )}
      <span className="hidden sm:inline">{nextLabel}</span>
    </Button>
  );
}
