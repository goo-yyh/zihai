"use client";

import type { ComponentProps } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  const { t } = useI18n();
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !window.confirm(t(message))) {
          event.preventDefault();
        }
      }}
    />
  );
}
