"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "@/components/i18n-provider";
import { ProductScreenshot } from "@/components/project/product-screenshot";
import { Button } from "@/components/ui/button";

export function ProjectImageLightbox({
  image,
  projectName,
  currentIndex,
  imageCount,
  onClose,
  onPrevious,
  onNext,
}: {
  image: { id: string; url: string };
  projectName: string;
  currentIndex: number;
  imageCount: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasMultipleImages = imageCount > 1;

  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (!hasMultipleImages) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [hasMultipleImages, onClose, onNext, onPrevious]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("Enlarged screenshot {number}", {
        number: currentIndex + 1,
      })}
      onClick={onClose}
    >
      <div
        className="relative h-full w-full"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Close enlarged image")}
          className="relative h-full w-full cursor-zoom-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ProductScreenshot
            key={`expanded-${image.id}`}
            src={image.url}
            alt={`${projectName} ${t("Screenshot {number}", {
              number: currentIndex + 1,
            })}`}
            sizes="100vw"
          />
        </button>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={t("Close")}
          className="absolute right-2 top-2 z-20 rounded-full bg-black/65 p-2.5 text-white backdrop-blur transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-3 sm:top-3"
        >
          <X className="size-5" />
        </button>

        {hasMultipleImages ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onPrevious}
              aria-label={t("Previous image")}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur sm:left-3"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onNext}
              aria-label={t("Next image")}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur sm:right-3"
            >
              <ChevronRight className="size-5" />
            </Button>
            <span
              aria-live="polite"
              className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur sm:bottom-3"
            >
              {t("Image {current} of {total}", {
                current: currentIndex + 1,
                total: imageCount,
              })}
            </span>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
