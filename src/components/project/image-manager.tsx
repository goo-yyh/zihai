"use client";

import { ArrowLeft, ArrowRight, LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteIterationImageAction,
  reorderIterationImagesAction,
} from "@/actions/iteration-images";
import {
  deleteProjectImageAction,
  reorderProjectImagesAction,
} from "@/actions/project-images";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/upload/image-uploader";

type ManagedImage = { id: string; blobUrl: string; sortOrder: number };

export function ImageManager({
  kind,
  resourceId,
  projectId,
  images,
}: {
  kind: "project-image" | "iteration-image";
  resourceId: string;
  projectId: string;
  images: ManagedImage[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await task();
        toast.success(t(success));
        router.refresh();
      } catch (error) {
        toast.error(
          t(error instanceof Error ? error.message : "Action failed."),
        );
      }
    });
  }

  function move(index: number, offset: -1 | 1) {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const ids = images.map((image) => image.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    const action =
      kind === "project-image"
        ? () => reorderProjectImagesAction(resourceId, ids)
        : () => reorderIterationImagesAction(resourceId, ids);
    run(action, "Image order updated.");
  }

  function remove(imageId: string) {
    if (!window.confirm(t("Delete this image permanently?"))) return;
    const action =
      kind === "project-image"
        ? () => deleteProjectImageAction(imageId)
        : () => deleteIterationImageAction(imageId);
    run(action, "Image deleted.");
  }

  return (
    <div className="space-y-4">
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-2xl border bg-white"
            >
              <div className="relative aspect-[16/10] bg-muted">
                <Image
                  src={image.blobUrl}
                  alt={t("Screenshot {number}", { number: index + 1 })}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                {pending ? (
                  <span className="absolute inset-0 grid place-items-center bg-white/65">
                    <LoaderCircle className="size-5 animate-spin" />
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="pl-1 text-xs font-bold text-muted-foreground">
                  #{index + 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    title={t("Move left")}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={pending || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    title={t("Move right")}
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-danger"
                    disabled={pending}
                    onClick={() => remove(image.id)}
                    title={t("Delete image")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <ImageUploader
        kind={kind}
        projectId={projectId}
        iterationId={kind === "iteration-image" ? resourceId : undefined}
        currentCount={images.length}
      />
    </div>
  );
}
