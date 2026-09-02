import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { ProjectCard } from "@/components/project/project-card";

describe("ProjectCard", () => {
  it("renders website, GitHub, and QR targets as independent controls", () => {
    const card = createElement(ProjectCard, {
      project: {
        id: "project-1",
        name: "Sample project",
        slug: "sample-project",
        description: "A sample project description.",
        websiteUrl: "https://example.com",
        githubUrl: "https://github.com/example/sample-project",
        qrCodeUrl:
          "https://example.public.blob.vercel-storage.com/projects/project-1/qr.png",
        imageUrl: "/icon.svg",
        ownerUsername: "builder",
        ownerImage: null,
        likeCount: 3,
      },
    });
    const providerProps = {
      locale: "zh-CN",
      children: card,
    } satisfies ComponentProps<typeof I18nProvider>;
    const html = renderToStaticMarkup(
      createElement(I18nProvider, providerProps),
    );
    const anchorTags = html.match(/<a\b[^>]*>/g) ?? [];

    expect(anchorTags).toHaveLength(3);
    expect(html).toContain('href="/p/project-1/sample-project"');
    expect(html).toContain(
      'href="https://example.com" target="_blank" rel="noopener noreferrer" aria-label="访问产品"',
    );
    expect(html).toContain(
      'href="https://github.com/example/sample-project" target="_blank" rel="noopener noreferrer" aria-label="查看代码"',
    );
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("keeps a QR-only project card navigable without website or GitHub links", () => {
    const card = createElement(ProjectCard, {
      project: {
        id: "project-qr-only",
        name: "Mini Program",
        slug: "mini-program",
        description: "A useful mini program available through its QR code.",
        websiteUrl: null,
        githubUrl: null,
        qrCodeUrl:
          "https://example.public.blob.vercel-storage.com/projects/project-qr-only/qr.png",
        imageUrl: "/icon.svg",
        ownerUsername: "builder",
        ownerImage: null,
        likeCount: 0,
      },
    });
    const providerProps = {
      locale: "zh-CN",
      children: card,
    } satisfies ComponentProps<typeof I18nProvider>;
    const html = renderToStaticMarkup(
      createElement(I18nProvider, providerProps),
    );
    const anchorTags = html.match(/<a\b[^>]*>/g) ?? [];
    const buttonTags = html.match(/<button\b[^>]*>/g) ?? [];
    const cardLinkEnd = html.indexOf("</a>");
    const qrButtonStart = html.indexOf("<button");

    expect(anchorTags).toHaveLength(1);
    expect(buttonTags).toHaveLength(1);
    expect(buttonTags[0]).toContain("cursor-pointer");
    expect(html).toContain('href="/p/project-qr-only/mini-program"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toMatch(/href="https:\/\//);
    expect(cardLinkEnd).toBeGreaterThan(-1);
    expect(qrButtonStart).toBeGreaterThan(cardLinkEnd);
  });
});
