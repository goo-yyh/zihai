"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { deleteProjectQrCodeAction } from "@/actions/project-qr-code";
import { useI18n } from "@/components/i18n-provider";
import { useReviewActions } from "@/components/project/review-submit";
import { isProjectQrCodeRefreshCommitted } from "@/components/project/review-submit-flow";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/upload/image-uploader";

export function ProjectQrCodeManager({
  projectId,
  projectName,
  qrCodeUrl,
  canDelete,
}: {
  projectId: string;
  projectName: string;
  qrCodeUrl: string | null;
  canDelete: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { projectQrCodeRefresh, setProjectQrCodeRefresh, setSaving } =
    useReviewActions();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (
      !isProjectQrCodeRefreshCommitted(
        projectId,
        qrCodeUrl,
        projectQrCodeRefresh,
      )
    ) {
      return;
    }
    setProjectQrCodeRefresh(null);
    setSaving(false);
  }, [
    projectId,
    projectQrCodeRefresh,
    qrCodeUrl,
    setProjectQrCodeRefresh,
    setSaving,
  ]);

  function removeQrCode() {
    if (!window.confirm(t("Delete this QR code permanently?"))) return;
    setSaving(true);
    startTransition(async () => {
      let waitForQrCodeRefresh = false;
      try {
        await deleteProjectQrCodeAction(projectId);
        setProjectQrCodeRefresh({ projectId, expectedUrl: null });
        waitForQrCodeRefresh = true;
        toast.success(t("QR code deleted."));
        router.refresh();
      } catch (error) {
        toast.error(
          t(error instanceof Error ? error.message : "Action failed."),
        );
      } finally {
        if (!waitForQrCodeRefresh) setSaving(false);
      }
    });
  }

  if (!qrCodeUrl) {
    return (
      <ImageUploader
        kind="project-qr-code"
        projectId={projectId}
        currentCount={0}
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[12rem_1fr] sm:items-center">
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-white p-3">
        <Image
          src={qrCodeUrl}
          alt={t("{project} QR code", { project: projectName })}
          fill
          sizes="192px"
          unoptimized
          className="object-contain p-3"
        />
      </div>
      <div>
        <p className="text-sm font-bold">{t("QR code ready")}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(
            "Visitors can open this QR code from the project card and detail page after approval.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ImageUploader
            kind="project-qr-code"
            projectId={projectId}
            currentCount={1}
            compact
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending || !canDelete}
            onClick={removeQrCode}
            title={
              canDelete
                ? t("Delete QR code")
                : t(
                    "Save a website or GitHub URL before deleting the only destination.",
                  )
            }
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("Delete QR code")}
          </Button>
        </div>
        {!canDelete ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "Save a website or GitHub URL before deleting the only destination.",
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
