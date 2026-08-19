"use client";

import Image from "next/image";
import { useState } from "react";

import { avatarSrc, DEFAULT_AVATAR_SRC } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  alt,
  size = 36,
  className,
  onFallback,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  onFallback?: (failedSrc: string) => void;
}) {
  const preferredSrc = avatarSrc(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc =
    failedSrc === preferredSrc ? DEFAULT_AVATAR_SRC : preferredSrc;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full border bg-foreground",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt}
    >
      <Image
        src={resolvedSrc}
        alt=""
        fill
        unoptimized
        sizes={`${size}px`}
        className="object-cover"
        onError={() => {
          if (resolvedSrc !== DEFAULT_AVATAR_SRC) {
            onFallback?.(resolvedSrc);
            setFailedSrc(resolvedSrc);
          }
        }}
      />
    </span>
  );
}
