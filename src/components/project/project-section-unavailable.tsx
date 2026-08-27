"use client";

import { TriangleAlert } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";

export function ProjectSectionUnavailable() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
    >
      <div className="flex items-center gap-2 font-bold">
        <TriangleAlert className="size-4" />
        {t("This section is temporarily unavailable.")}
      </div>
      <p className="mt-2 text-xs leading-5 text-amber-800">
        {t("The rest of the project page is still available.")}
      </p>
    </div>
  );
}
