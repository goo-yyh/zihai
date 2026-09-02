"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { useReviewActions } from "@/components/project/review-submit";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  imageUploadPolicy,
  type UploadKind,
} from "@/lib/image-policy";

export function ImageUploader({
  kind,
  projectId,
  currentCount = 0,
  compact = false,
}: {
  kind: UploadKind;
  projectId?: string;
  currentCount?: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const { setProjectQrCodeRefresh, setSaving } = useReviewActions();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const { maxFiles, maxBytes } = imageUploadPolicy(kind);
  const isProjectQrCode = kind === "project-qr-code";
  const MAX_CONCURRENT_UPLOADS = 3;

  async function uploadFile(
    file: File,
    currentIndex: number,
    totalFiles: number,
  ) {
    const query = new URLSearchParams({ kind, contentType: file.type });
    if (projectId) query.set("projectId", projectId);

    const intentResponse = await fetch(`/api/blob/upload?${query}`);
    const intent = (await intentResponse.json()) as {
      pathname?: string;
      clientPayload?: string;
      error?: string;
    };
    if (!intentResponse.ok || !intent.pathname || !intent.clientPayload) {
      throw new Error(intent.error || "Upload authorization failed.");
    }

    const blob = await upload(intent.pathname, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
      clientPayload: intent.clientPayload,
      contentType: file.type,
      multipart: false,
      onUploadProgress(event) {
        setProgress(
          t("Uploading {current} / {total} · {percentage}%", {
            current: currentIndex + 1,
            total: totalFiles,
            percentage: Math.round(event.percentage),
          }),
        );
      },
    });
    setProgress(
      t("Saving {current} / {total}…", {
        current: currentIndex + 1,
        total: totalFiles,
      }),
    );
    const completionResponse = await fetch("/api/blob/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blob: { url: blob.url, pathname: blob.pathname },
        clientPayload: intent.clientPayload,
      }),
    });
    const completion = (await completionResponse.json().catch(() => ({}))) as {
      persisted?: boolean;
      qrCodeUrl?: string;
      error?: string;
    };
    if (!completionResponse.ok || !completion.persisted) {
      throw new Error(completion.error || "Upload completion failed.");
    }
    return completion.qrCodeUrl ?? blob.url;
  }

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    const occupiedSlots = isProjectQrCode ? 0 : currentCount;
    if (selected.length + occupiedSlots > maxFiles) {
      toast.error(
        t(
          maxFiles > 1
            ? "You can upload at most {count} images."
            : "You can upload at most {count} image.",
          { count: maxFiles },
        ),
      );
      return;
    }

    for (const file of selected) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
        )
      ) {
        toast.error(
          t("{file}: JPEG, PNG, and WebP only.", { file: file.name }),
        );
        return;
      }
      if (file.size > maxBytes) {
        toast.error(t("{file}: file is too large.", { file: file.name }));
        return;
      }
    }

    let waitForQrCodeRefresh = false;
    let uploadedQrCodeUrl: string | null = null;
    setSaving(true);
    try {
      let uploadIndex = 0;
      const totalFiles = selected.length;

      const runUpload = async () => {
        const index = uploadIndex++;
        if (index >= totalFiles) return;
        const file = selected[index];
        setProgress(
          t("Uploading {current} / {total}", {
            current: index + 1,
            total: totalFiles,
          }),
        );
        const uploadedUrl = await uploadFile(file, index, totalFiles);
        if (isProjectQrCode) uploadedQrCodeUrl = uploadedUrl;
        await runUpload();
      };

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, totalFiles) },
        () => runUpload(),
      );
      await Promise.all(workers);
      toast.success(
        t(
          kind === "avatar"
            ? "Avatar updated."
            : isProjectQrCode
              ? "QR code updated."
              : "Images uploaded.",
        ),
      );
      if (isProjectQrCode && projectId && uploadedQrCodeUrl) {
        setProjectQrCodeRefresh({
          projectId,
          expectedUrl: uploadedQrCodeUrl,
        });
        waitForQrCodeRefresh = true;
      }
      router.refresh();
    } catch (error) {
      toast.error(t(error instanceof Error ? error.message : "Upload failed."));
    } finally {
      if (!waitForQrCodeRefresh) setSaving(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const disabled =
    Boolean(progress) || (!isProjectQrCode && currentCount >= maxFiles);
  return (
    <div
      className={
        compact
          ? "inline-flex"
          : "rounded-2xl border border-dashed bg-muted/50 p-5"
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple={maxFiles > 1}
        className="sr-only"
        onChange={(event) => chooseFiles(event.target.files)}
      />
      {compact ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {progress ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {progress ||
            t(
              isProjectQrCode
                ? currentCount > 0
                  ? "Replace QR code"
                  : "Upload QR code"
                : "Upload image",
            )}
        </Button>
      ) : (
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 rounded-2xl bg-white p-3 text-primary shadow-sm">
            {progress ? (
              <LoaderCircle className="size-6 animate-spin" />
            ) : (
              <UploadCloud className="size-6" />
            )}
          </span>
          <p className="text-sm font-bold">
            {progress ||
              t(
                isProjectQrCode
                  ? currentCount > 0
                    ? "Replace QR code"
                    : "Add QR code"
                  : "Add screenshots",
              )}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t(
              "JPEG, PNG, or WebP · up to {size} MB each · {current}/{max} used",
              {
                size: maxBytes / 1024 / 1024,
                current: currentCount,
                max: maxFiles,
              },
            )}
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {t(
              kind === "avatar"
                ? "Choose avatar"
                : isProjectQrCode
                  ? currentCount > 0
                    ? "Choose replacement QR code"
                    : "Choose QR code"
                  : "Choose images",
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
