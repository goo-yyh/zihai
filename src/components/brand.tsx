import { Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 font-mono font-black tracking-tight",
        className,
      )}
      aria-label="zihAI home"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-foreground text-accent shadow-sm">
        <Sparkles className="size-4" />
      </span>
      <span className="text-lg">
        zih<span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
