import Image from "next/image";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ProductScreenshotProps = Omit<ComponentProps<typeof Image>, "fill">;

export function ProductScreenshot({
  alt,
  className,
  ...props
}: ProductScreenshotProps) {
  return (
    <Image
      {...props}
      alt={alt}
      fill
      className={cn("object-contain object-center", className)}
    />
  );
}
