"use client";

import type { ReactNode } from "react";

import { FieldError } from "@/components/forms/form-message";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectDestinationFields({
  websiteUrl,
  githubUrl,
  websiteErrors,
  githubErrors,
  qrCodeControl,
}: {
  websiteUrl?: string | null;
  githubUrl?: string | null;
  websiteErrors?: string[];
  githubErrors?: string[];
  qrCodeControl: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <fieldset className="rounded-2xl border bg-muted/40 p-4">
      <legend className="px-2 text-sm font-bold">
        {t("Add at least one destination before review")}
      </legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">{t("Website URL")}</Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={websiteUrl || ""}
            placeholder="https://your-product.com"
          />
          <FieldError errors={websiteErrors} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="githubUrl">{t("GitHub repository")}</Label>
          <Input
            id="githubUrl"
            name="githubUrl"
            type="url"
            defaultValue={githubUrl || ""}
            placeholder="https://github.com/owner/repo"
          />
          <FieldError errors={githubErrors} />
        </div>
      </div>
      <section
        aria-labelledby="project-qr-code-heading"
        className="mt-5 border-t pt-5"
      >
        <h3 id="project-qr-code-heading" className="text-sm font-semibold">
          {t("QR code")}
        </h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t(
            "Upload one QR code for a mini program or another product without a public URL.",
          )}
        </p>
        <div className="mt-3">{qrCodeControl}</div>
      </section>
    </fieldset>
  );
}
