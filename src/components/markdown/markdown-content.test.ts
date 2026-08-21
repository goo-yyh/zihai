import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "@/components/markdown/markdown-content";

describe("MarkdownContent", () => {
  it("renders headings, emphasis, and GFM tables as structured HTML", () => {
    const html = renderToStaticMarkup(
      createElement(
        MarkdownContent,
        null,
        "### Product details\n\n**Fast** and useful.\n\n| Feature | Status |\n| --- | --- |\n| Preview | Ready |",
      ),
    );

    expect(html).toContain("<h3>Product details</h3>");
    expect(html).toContain("<strong>Fast</strong>");
    expect(html).toContain("<table>");
  });

  it("does not render raw HTML from user-authored Markdown", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownContent, null, '<script>alert("unsafe")</script>'),
    );

    expect(html).not.toContain("<script>");
  });
});
