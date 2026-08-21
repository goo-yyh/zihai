"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { ProductScreenshot } from "@/components/project/product-screenshot";
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
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(
    () => new Set(),
  );
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentIndex];
  const currentImageLoaded = currentImage
    ? loadedImageUrls.has(currentImage.url)
    : false;
  const currentImageFailed = currentImage
    ? failedImageUrls.has(currentImage.url)
    : false;

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
      <div
        aria-busy={
          currentImage ? !currentImageLoaded && !currentImageFailed : undefined
        }
        className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-muted"
      >
        {currentImage ? (
          <div className="relative h-full w-full">
            <ProductScreenshot
              key={currentImage.id}
              src={currentImage.url}
              alt={`${projectName} ${t("Screenshot {number}", {
                number: currentIndex + 1,
              })}`}
              preload={currentIndex === 0}
              sizes="(max-width: 1024px) 100vw, 760px"
              onLoad={() => {
                setLoadedImageUrls((loadedUrls) => {
                  if (loadedUrls.has(currentImage.url)) return loadedUrls;
                  const nextLoadedUrls = new Set(loadedUrls);
                  nextLoadedUrls.add(currentImage.url);
                  return nextLoadedUrls;
                });
              }}
              onError={() => {
                setFailedImageUrls((failedUrls) => {
                  if (failedUrls.has(currentImage.url)) return failedUrls;
                  const nextFailedUrls = new Set(failedUrls);
                  nextFailedUrls.add(currentImage.url);
                  return nextFailedUrls;
                });
              }}
              className={cn(
                "transition-opacity duration-200",
                currentImageLoaded && !currentImageFailed
                  ? "opacity-100"
                  : "opacity-0",
              )}
            />
            {!currentImageLoaded || currentImageFailed ? (
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-muted text-sm font-semibold text-muted-foreground"
              >
                {currentImageFailed ? (
                  t("Unable to load image.")
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="size-5 animate-spin" />
                    {t("Loading image…")}
                  </span>
                )}
              </div>
            ) : null}
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
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={showNextImage}
              aria-label={t("Next image")}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur"
            >
              <ChevronRight className="size-5" />
            </Button>
            <span
              aria-live="polite"
              className="absolute right-3 top-3 z-20 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur"
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
