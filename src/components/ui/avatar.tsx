import Image from "next/image";

import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  size = 36,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full border object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border bg-muted font-bold uppercase text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={alt}
    >
      {alt.slice(0, 1) || "?"}
    </span>
  );
}
