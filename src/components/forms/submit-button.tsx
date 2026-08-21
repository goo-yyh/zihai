"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  const translatedChildren =
    typeof children === "string" ? t(children) : children;
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      className={className}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? t(pendingLabel) : translatedChildren}
    </Button>
  );
}
