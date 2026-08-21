import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

export function MarkdownContent({
  children,
  className,
  emptyLabel,
}: {
  children: string;
  className?: string;
  emptyLabel?: string;
}) {
  if (!children.trim() && emptyLabel) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className={cn("prose-zihai", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
