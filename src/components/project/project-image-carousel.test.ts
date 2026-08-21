import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { ProjectImageCarousel } from "@/components/project/project-image-carousel";

describe("ProjectImageCarousel", () => {
  it("exposes an accessible zoom affordance for the current screenshot", () => {
    const carousel = createElement(ProjectImageCarousel, {
      images: [{ id: "image-1", url: "/icon.svg" }],
      projectName: "zihAI",
    });
    const providerProps = {
      locale: "zh-CN",
      children: carousel,
    } satisfies ComponentProps<typeof I18nProvider>;
    const html = renderToStaticMarkup(
      createElement(I18nProvider, providerProps),
    );

    expect(html).toContain('aria-label="放大图片"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("cursor-zoom-in");
  });
});
