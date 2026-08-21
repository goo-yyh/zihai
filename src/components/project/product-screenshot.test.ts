import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductScreenshot } from "@/components/project/product-screenshot";

describe("ProductScreenshot", () => {
  it("preserves the full image and centers it in every screenshot surface", () => {
    const html = renderToStaticMarkup(
      createElement(ProductScreenshot, {
        src: "/icon.svg",
        alt: "Product screenshot",
        sizes: "100vw",
      }),
    );

    expect(html).toContain("object-contain");
    expect(html).toContain("object-center");
    expect(html).not.toContain("object-cover");
  });
});
