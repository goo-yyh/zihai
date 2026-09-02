"use client";

import { QrCode, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ModalLayer } from "@/components/ui/modal-layer";
import { cn } from "@/lib/utils";

export function ProjectQrCodeButton({
  qrCodeUrl,
  projectName,
  iconOnly = false,
  variant = "outline",
  className,
}: {
  qrCodeUrl: string;
  projectName: string;
  iconOnly?: boolean;
  variant?: "default" | "outline";
  className?: string;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);
  const label = t("View QR code");

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        size={iconOnly ? "icon" : "default"}
        variant={variant}
        className={cn(
          iconOnly &&
            "size-10 rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur hover:bg-white hover:text-primary",
          className,
        )}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={iconOnly ? label : undefined}
        onClick={() => setOpen(true)}
      >
        <QrCode aria-hidden="true" className="size-4" />
        {iconOnly ? null : label}
      </Button>

      <ModalLayer
        open={open}
        onClose={closeDialog}
        triggerRef={triggerRef}
        initialFocusRef={closeButtonRef}
        titleId={titleId}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-black">
              {label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Scan the QR code to open {project}.", {
                project: projectName,
              })}
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("Close")}
            onClick={closeDialog}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="relative mx-auto mt-5 aspect-square w-full max-w-sm overflow-hidden rounded-2xl border bg-white">
          <Image
            src={qrCodeUrl}
            alt={t("{project} mini program QR code", {
              project: projectName,
            })}
            fill
            sizes="(max-width: 640px) calc(100vw - 4rem), 384px"
            unoptimized
            className="object-contain p-4"
          />
        </div>
      </ModalLayer>
    </>
  );
}
