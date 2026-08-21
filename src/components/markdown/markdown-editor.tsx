"use client";

import { Eye, Pencil } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  id: string;
  name: string;
  initialValue?: string;
  minLength: number;
  maxLength: number;
  rows: number;
  placeholder: string;
  required?: boolean;
};

export function MarkdownEditor({
  id,
  name,
  initialValue = "",
  minLength,
  maxLength,
  rows,
  placeholder,
  required = false,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [value, setValue] = useState(initialValue);
  const writeTabId = `${id}-write-tab`;
  const previewTabId = `${id}-preview-tab`;
  const writePanelId = `${id}-write-panel`;
  const previewPanelId = `${id}-preview-panel`;

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("Markdown editor mode")}
        className="mb-2 inline-flex rounded-lg border bg-muted/70 p-1"
      >
        <button
          id={writeTabId}
          type="button"
          role="tab"
          aria-selected={mode === "write"}
          aria-controls={writePanelId}
          onClick={() => setMode("write")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
            mode === "write"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Pencil className="size-3.5" /> {t("Write")}
        </button>
        <button
          id={previewTabId}
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          aria-controls={previewPanelId}
          onClick={() => setMode("preview")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
            mode === "preview"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Eye className="size-3.5" /> {t("Preview")}
        </button>
      </div>

      <div
        id={writePanelId}
        role="tabpanel"
        aria-labelledby={writeTabId}
        hidden={mode !== "write"}
      >
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onInvalid={() => setMode("write")}
          minLength={minLength}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          required={required}
        />
      </div>

      <div
        id={previewPanelId}
        role="tabpanel"
        aria-labelledby={previewTabId}
        hidden={mode !== "preview"}
        className="min-h-60 rounded-xl border bg-white px-4 py-3 shadow-sm"
      >
        <MarkdownContent
          emptyLabel={t("Nothing to preview yet.")}
          className="min-w-0"
        >
          {value}
        </MarkdownContent>
      </div>
    </div>
  );
}
