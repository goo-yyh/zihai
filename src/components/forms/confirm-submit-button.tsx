"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !window.confirm(message)) {
          event.preventDefault();
        }
      }}
    />
  );
}
