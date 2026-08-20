"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselImage = {
  id: string;
  url: string;
};

export function ProjectImageCarousel({
  images,
  projectName,
}: {
  images: CarouselImage[];
  projectName: string;
}) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentIndex];

  function showPreviousImage() {
    setCurrentIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  }

  function showNextImage() {
    setCurrentIndex((index) => (index + 1) % images.length);
  }

  return (
    <section
      aria-label={t("Project screenshots")}
      aria-roledescription="carousel"
      className="mt-9"
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-muted">
        {currentImage ? (
          <div className="relative h-full w-full">
            <Image
              src={currentImage.url}
              alt={`${projectName} ${t("Screenshot {number}", {
                number: currentIndex + 1,
              })}`}
              fill
              loading="eager"
              priority={currentIndex === 0}
              sizes="(max-width: 1024px) 100vw, 760px"
              className="object-cover"
            />
          </div>
        ) : null}

        {hasMultipleImages ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={showPreviousImage}
              aria-label={t("Previous image")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={showNextImage}
              aria-label={t("Next image")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur"
            >
              <ChevronRight className="size-5" />
            </Button>
            <span
              aria-live="polite"
              className="absolute right-3 top-3 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur"
            >
              {t("Image {current} of {total}", {
                current: currentIndex + 1,
                total: images.length,
              })}
            </span>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="mt-3 flex justify-center gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={t("Go to image {number}", { number: index + 1 })}
              aria-current={index === currentIndex ? "true" : undefined}
              className={cn(
                "h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                index === currentIndex
                  ? "w-7 bg-primary"
                  : "w-2.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
