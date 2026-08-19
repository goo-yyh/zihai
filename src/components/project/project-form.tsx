"use client";

import { useActionState } from "react";

import { createProjectAction, updateProjectAction } from "@/actions/project";
import { FieldError, FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/types/actions";

type ProjectValues = {
  id?: string;
  name?: string;
  description?: string;
  websiteUrl?: string | null;
  githubUrl?: string | null;
};

export function ProjectForm({ project = {} }: { project?: ProjectValues }) {
  const { t } = useI18n();
  const serverAction = project.id
    ? updateProjectAction.bind(null, project.id)
    : createProjectAction;
  const [state, action] = useActionState(serverAction, initialActionState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("Project name")}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={project.name}
          minLength={2}
          maxLength={100}
          placeholder={t("A sharp, memorable name")}
          required
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("What did you build?")}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={project.description}
          minLength={10}
          maxLength={4000}
          rows={10}
          placeholder={t(
            "Tell people what it does, who it helps, and what makes it interesting. Markdown is supported.",
          )}
          required
        />
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("Markdown supported")}</span>
          <span>{t("10–4,000 characters")}</span>
        </div>
        <FieldError errors={state.fieldErrors?.description} />
      </div>
      <fieldset className="rounded-2xl border bg-muted/40 p-4">
        <legend className="px-2 text-sm font-bold">
          {t("Add at least one destination")}
        </legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="websiteUrl">{t("Website URL")}</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={project.websiteUrl || ""}
              placeholder="https://your-product.com"
            />
            <FieldError errors={state.fieldErrors?.websiteUrl} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="githubUrl">{t("GitHub repository")}</Label>
            <Input
              id="githubUrl"
              name="githubUrl"
              type="url"
              defaultValue={project.githubUrl || ""}
              placeholder="https://github.com/owner/repo"
            />
            <FieldError errors={state.fieldErrors?.githubUrl} />
          </div>
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pendingLabel={project.id ? "Saving…" : "Creating…"}>
        {t(project.id ? "Save project" : "Create project")}
      </SubmitButton>
    </form>
  );
}
