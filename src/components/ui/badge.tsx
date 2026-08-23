"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const variants = {
  draft: "bg-zinc-100 text-zinc-700",
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  archived: "bg-slate-100 text-slate-700",
  completed: "bg-emerald-100 text-emerald-800",
  admin: "bg-violet-100 text-violet-800",
  user: "bg-zinc-100 text-zinc-700",
  default: "bg-muted text-foreground",
} as const;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
        variants[variant],
        className,
      )}
    >
      {typeof children === "string" ? t(children) : children}
    </span>
  );
}
