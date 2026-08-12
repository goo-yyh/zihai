import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 shadow-sm transition placeholder:text-muted-foreground focus:border-primary focus:outline-2 focus:outline-offset-1 focus:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
