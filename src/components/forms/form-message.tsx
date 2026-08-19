"use client";

import { useI18n } from "@/components/i18n-provider";
import type { ActionState } from "@/types/actions";

export function FormMessage({ state }: { state: ActionState }) {
  const { t } = useI18n();
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={
        state.status === "success"
          ? "rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800"
          : "rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800"
      }
    >
      {t(state.message)}
    </p>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  const { t } = useI18n();
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-danger">{t(errors[0])}</p>;
}
