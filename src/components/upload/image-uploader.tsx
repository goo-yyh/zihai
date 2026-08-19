"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  imageUploadPolicy,
  type UploadKind,
} from "@/lib/image-policy";

export function ImageUploader({
  kind,
  projectId,
  iterationId,
  currentCount = 0,
  compact = false,
}: {
  kind: UploadKind;
  projectId?: string;
  iterationId?: string;
  currentCount?: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const { maxFiles, maxBytes } = imageUploadPolicy(kind);

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length + currentCount > maxFiles) {
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

    try {
      for (const [index, file] of selected.entries()) {
        setProgress(
          t("Uploading {current} / {total}", {
            current: index + 1,
            total: selected.length,
          }),
        );
        const query = new URLSearchParams({ kind, contentType: file.type });
        if (projectId) query.set("projectId", projectId);
        if (iterationId) query.set("iterationId", iterationId);
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
                current: index + 1,
                total: selected.length,
                percentage: Math.round(event.percentage),
              }),
            );
          },
        });
        setProgress(
          t("Saving {current} / {total}…", {
            current: index + 1,
            total: selected.length,
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
        const completion = (await completionResponse
          .json()
          .catch(() => ({}))) as {
          persisted?: boolean;
          error?: string;
        };
        if (!completionResponse.ok || !completion.persisted) {
          throw new Error(completion.error || "Upload completion failed.");
        }
      }
      toast.success(
        t(kind === "avatar" ? "Avatar updated." : "Images uploaded."),
      );
      router.refresh();
    } catch (error) {
      toast.error(t(error instanceof Error ? error.message : "Upload failed."));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const disabled = Boolean(progress) || currentCount >= maxFiles;
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
        multiple={kind !== "avatar"}
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
          {progress || t("Upload image")}
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
            {progress || t("Add screenshots")}
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
            {t(kind === "avatar" ? "Choose avatar" : "Choose images")}
          </Button>
        </div>
      )}
    </div>
  );
}
