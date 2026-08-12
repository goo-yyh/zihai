"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES, type uploadKindSchema } from "@/lib/validations";
import type { z } from "zod";

type UploadKind = z.infer<typeof uploadKindSchema>;

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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const maxFiles = kind === "avatar" ? 1 : 3;
  const maxBytes = kind === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length + currentCount > maxFiles) {
      toast.error(`You can upload at most ${maxFiles} image${maxFiles > 1 ? "s" : ""}.`);
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
        toast.error(`${file.name}: JPEG, PNG, and WebP only.`);
        return;
      }
      if (file.size > maxBytes) {
        toast.error(`${file.name}: file is too large.`);
        return;
      }
    }

    try {
      for (const [index, file] of selected.entries()) {
        setProgress(`Uploading ${index + 1} / ${selected.length}`);
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

        await upload(intent.pathname, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: intent.clientPayload,
          contentType: file.type,
          multipart: false,
          onUploadProgress(event) {
            setProgress(
              `Uploading ${index + 1} / ${selected.length} · ${Math.round(event.percentage)}%`,
            );
          },
        });
      }
      toast.success(kind === "avatar" ? "Avatar updated." : "Images uploaded.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const disabled = Boolean(progress) || currentCount >= maxFiles;
  return (
    <div className={compact ? "inline-flex" : "rounded-2xl border border-dashed bg-muted/50 p-5"}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple={kind !== "avatar"}
        className="sr-only"
        onChange={(event) => chooseFiles(event.target.files)}
      />
      {compact ? (
        <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {progress ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {progress || "Upload image"}
        </Button>
      ) : (
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 rounded-2xl bg-white p-3 text-primary shadow-sm">
            {progress ? <LoaderCircle className="size-6 animate-spin" /> : <UploadCloud className="size-6" />}
          </span>
          <p className="text-sm font-bold">{progress || "Add screenshots"}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            JPEG, PNG, or WebP · up to {maxBytes / 1024 / 1024} MB each · {currentCount}/{maxFiles} used
          </p>
          <Button type="button" size="sm" className="mt-4" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Choose {kind === "avatar" ? "avatar" : "images"}
          </Button>
        </div>
      )}
    </div>
  );
}
