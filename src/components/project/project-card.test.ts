import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "@/components/i18n-provider";
import { ProjectCard } from "@/components/project/project-card";

describe("ProjectCard", () => {
  it("renders the website and GitHub icons as independent external links", () => {
    const card = createElement(ProjectCard, {
      project: {
        id: "project-1",
        name: "Sample project",
        slug: "sample-project",
        description: "A sample project description.",
        websiteUrl: "https://example.com",
        githubUrl: "https://github.com/example/sample-project",
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
  });
});
