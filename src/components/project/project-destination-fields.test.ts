import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { ProjectDestinationFields } from "@/components/project/project-destination-fields";

describe("ProjectDestinationFields", () => {
  it("groups website, GitHub, and QR code controls in one fieldset", () => {
    const fields = createElement(ProjectDestinationFields, {
      websiteUrl: "https://example.com",
      githubUrl: "https://github.com/example/project",
      qrCodeControl: createElement(
        "button",
        { type: "button", "data-qr-code-control": true },
        "Upload QR code",
      ),
    });
    const providerProps = {
      locale: "zh-CN",
      children: fields,
    } satisfies ComponentProps<typeof I18nProvider>;
    const html = renderToStaticMarkup(
      createElement(I18nProvider, providerProps),
    );
    const fieldsetStart = html.indexOf("<fieldset");
    const fieldsetEnd = html.indexOf("</fieldset>");

    expect(html.match(/<fieldset/g)).toHaveLength(1);
    expect(html).toContain("提交审核前，请至少添加一个目标入口");
    expect(html).toContain('name="websiteUrl"');
    expect(html).toContain('name="githubUrl"');
    expect(html).toContain("二维码");
    expect(html).toContain('data-qr-code-control="true"');
    expect(fieldsetStart).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('name="websiteUrl"')).toBeGreaterThan(fieldsetStart);
    expect(html.indexOf('name="githubUrl"')).toBeGreaterThan(fieldsetStart);
    expect(html.indexOf('data-qr-code-control="true"')).toBeGreaterThan(
      fieldsetStart,
    );
    expect(fieldsetEnd).toBeGreaterThan(
      html.indexOf('data-qr-code-control="true"'),
    );
  });
});
