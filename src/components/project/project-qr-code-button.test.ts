import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { ProjectQrCodeButton } from "@/components/project/project-qr-code-button";

describe("ProjectQrCodeButton", () => {
  it("renders an accessible dialog trigger without an initial dialog", () => {
    const button = createElement(ProjectQrCodeButton, {
      qrCodeUrl: "https://blob.example.com/project-qr.png",
      projectName: "Mini Program",
    });
    const providerProps = {
      locale: "zh-CN",
      children: button,
    } satisfies ComponentProps<typeof I18nProvider>;
    const html = renderToStaticMarkup(
      createElement(I18nProvider, providerProps),
    );

    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="查看二维码"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
  });
});
