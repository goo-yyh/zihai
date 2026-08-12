import { describe, expect, it } from "vitest";

import {
  ALLOWED_IMAGE_TYPES,
  imageUploadPolicy,
  MAX_CONTENT_IMAGES,
} from "@/lib/image-policy";

describe("image upload policy", () => {
  it("keeps avatar uploads smaller and single-file", () => {
    expect(imageUploadPolicy("avatar")).toEqual({
      maxFiles: 1,
      maxBytes: 2 * 1024 * 1024,
    });
  });

  it.each(["project-image", "iteration-image"] as const)(
    "applies the shared content limits to %s",
    (kind) => {
      expect(imageUploadPolicy(kind)).toEqual({
        maxFiles: MAX_CONTENT_IMAGES,
        maxBytes: 5 * 1024 * 1024,
      });
    },
  );

  it("allows only browser-safe raster formats", () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});
